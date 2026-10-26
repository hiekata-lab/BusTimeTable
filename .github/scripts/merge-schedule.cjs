const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  dateStyle: 'long',
  timeStyle: 'long',
});

function parseSchedule(body) {
  const commands = (body ?? '').split(/\r?\n/).filter((line) => /^\/schedule\b/.test(line));
  if (commands.length === 0) return null;
  if (commands.length !== 1) throw new Error('/schedule は1行だけ記載してください。');

  const match = commands[0].trimEnd().match(/^\/schedule (\d{4}-\d{2}-\d{2})$/);
  if (!match) throw new Error('予約日は /schedule YYYY-MM-DD の形式で指定してください。指定日の0時（JST）に予約します。');

  const date = new Date(`${match[1]}T00:00:00+09:00`);
  // Dateが2月30日などを翌月へ補正しても、有効な予約として扱わない。
  if (!Number.isFinite(date.getTime()) ||
      new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) !== match[1]) {
    throw new Error('予約日に存在しない日付が含まれています。');
  }
  return date;
}

function validate({ context, core }) {
  const date = parseSchedule(context.payload.pull_request.body);
  core.info(date ? `マージ予約：${dateFormat.format(date)}` : 'マージ予約はありません。');
}

async function checksPassed(github, repo, sha) {
  // CIがまだ起動していない場合も待つ。最新の実行が成功したSHAだけをマージする。
  const { data: ci } = await github.rest.actions.listWorkflowRuns({
    ...repo, workflow_id: 'ci.yml', event: 'pull_request', head_sha: sha, per_page: 1,
  });
  const latest = ci.workflow_runs[0];
  if (latest?.status !== 'completed' || latest.conclusion !== 'success') return false;

  const checks = await github.paginate(github.rest.checks.listForRef, {
    ...repo, ref: sha, filter: 'latest', per_page: 100,
  });
  if (checks.some((check) => check.status !== 'completed' ||
      !['success', 'neutral', 'skipped'].includes(check.conclusion))) return false;

  const { data: statuses } = await github.rest.repos.getCombinedStatusForRef({ ...repo, ref: sha });
  return statuses.total_count === 0 || statuses.state === 'success';
}

async function mergeScheduledPullRequests({ github, context, core, now = new Date() }) {
  const repo = context.repo;
  const base = context.payload.repository.default_branch;
  const repository = `${repo.owner}/${repo.repo}`;
  const pullRequests = await github.paginate(github.rest.pulls.list, {
    ...repo, state: 'open', base, per_page: 100,
  });
  let deployRef = '';
  const failures = [];

  for (const pullRequest of pullRequests) {
    if (pullRequest.draft || pullRequest.head.repo?.full_name !== repository) continue;
    let scheduledDate;
    try {
      scheduledDate = parseSchedule(pullRequest.body);
    } catch (error) {
      core.warning(`#${pullRequest.number}：${error.message}`);
      continue;
    }
    if (!scheduledDate || scheduledDate > now) continue;

    try {
      if (!await checksPassed(github, repo, pullRequest.head.sha)) {
        core.info(`#${pullRequest.number}：CIまたは追加チェックの成功を待っています。`);
        continue;
      }

      // チェック中に予約が取り消された場合や、追加コミットがあった場合は次回に回す。
      const { data: current } = await github.rest.pulls.get({ ...repo, pull_number: pullRequest.number });
      const currentDate = parseSchedule(current.body);
      if (current.state !== 'open' || current.draft || current.base.ref !== base ||
          current.head.sha !== pullRequest.head.sha || !currentDate || currentDate > now) continue;

      const { data: result } = await github.rest.pulls.merge({
        ...repo, pull_number: current.number, sha: current.head.sha, merge_method: 'squash',
      });
      if (!result.merged) throw new Error(result.message);
      deployRef = result.sha;
      core.info(`#${current.number} をマージしました。予約日時：${dateFormat.format(currentDate)}`);
    } catch (error) {
      const message = `#${pullRequest.number}：${error.message}`;
      failures.push(message);
      core.error(message);
    }
  }

  // 実際にマージしたコミットを渡し、予約処理の開始前のSHAを公開しない。
  core.setOutput('deploy-ref', deployRef);
  if (failures.length) core.setFailed(`${failures.length}件の予約マージに失敗しました。ログを確認してください。`);
}

module.exports = { parseSchedule, validate, mergeScheduledPullRequests };
