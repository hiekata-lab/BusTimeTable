const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const { parseSchedule, validate, mergeScheduledPullRequests } = require('./merge-schedule.cjs');

const midnight = new Date('2027-03-31T15:00:00Z');

function pullRequest(overrides = {}) {
  return {
    number: 1, body: '/schedule 2027-04-01', draft: false, state: 'open',
    base: { ref: 'main' }, head: { sha: 'checked-sha', repo: { full_name: 'lab/timetable' } },
    ...overrides,
  };
}

function fixture({ prs = [pullRequest()], current, ci, checks = [], statuses, mergeError } = {}) {
  const merged = [];
  const outputs = {};
  const failures = [];
  const warnings = [];
  const messages = [];
  const context = {
    repo: { owner: 'lab', repo: 'timetable' },
    payload: { repository: { default_branch: 'main' }, pull_request: prs[0] },
  };
  const core = {
    info: (message) => messages.push(message),
    warning: (message) => warnings.push(message),
    error: () => {},
    setFailed: (message) => failures.push(message),
    setOutput: (key, value) => { outputs[key] = value; },
  };
  const github = {
    rest: {
      pulls: {
        list: () => {},
        get: async ({ pull_number }) => ({ data: current ?? prs.find((pr) => pr.number === pull_number) }),
        merge: async (params) => {
          if (mergeError?.(params.pull_number)) throw new Error('Merge conflict');
          merged.push(params);
          return { data: { merged: true, sha: `merged-${params.pull_number}` } };
        },
      },
      actions: {
        listWorkflowRuns: async (params) => {
          assert.equal(params.head_sha, 'checked-sha');
          assert.equal(params.workflow_id, 'ci.yml');
          assert.equal(params.event, 'pull_request');
          return { data: { workflow_runs: ci ?? [{ status: 'completed', conclusion: 'success' }] } };
        },
      },
      checks: { listForRef: () => {} },
      repos: {
        getCombinedStatusForRef: async () => ({ data: statuses ?? { total_count: 0, state: 'pending' } }),
      },
    },
    paginate: async (method, params) => {
      if (method === github.rest.pulls.list) {
        assert.equal(params.base, 'main');
        return prs;
      }
      assert.equal(params.ref, 'checked-sha');
      assert.equal(params.filter, 'latest');
      return checks;
    },
  };
  return { github, context, core, now: midnight, merged, outputs, failures, warnings, messages };
}

test('日付だけの予約をJSTの0時として解釈する', () => {
  assert.equal(parseSchedule('改正内容\n\n/schedule 2027-04-01\r\n').toISOString(), midnight.toISOString());
  assert.equal(parseSchedule('/schedule 2028-02-29').toISOString(), '2028-02-28T15:00:00.000Z');
  assert.equal(parseSchedule('/schedule 2027-01-01').toISOString(), '2026-12-31T15:00:00.000Z');
  assert.equal(parseSchedule(null), null);
  assert.equal(parseSchedule('変更内容のみ'), null);
});

test('実行環境のタイムゾーンに依存しない', () => {
  for (const timezone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
    const output = execFileSync(process.execPath, ['-e',
      `console.log(require(${JSON.stringify(require.resolve('./merge-schedule.cjs'))}).parseSchedule('/schedule 2027-04-01').toISOString())`,
    ], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    assert.equal(output.trim(), midnight.toISOString());
  }
});

for (const command of ['/schedule', '/schedule 2027-02-29', '/schedule 2027-04-31',
  '/schedule 2027-13-01', '/schedule 2027-00-01', '/schedule 2027-04-00',
  '/schedule 2027-4-1', '/schedule 2027-04-01T00:00:00+09:00',
  '/schedule 2027-04-01\n/schedule 2027-04-02']) {
  test(`無効な予約を拒否する：${command.replaceAll('\n', ' / ')}`, () => {
    assert.throws(() => parseSchedule(command));
  });
}

test('PRの検証ログにJSTの日時を表示する', () => {
  const f = fixture();
  validate(f);
  assert.match(f.messages[0], /2027年4月1日.*0:00:00 JST/);
});

test('JSTの改正日前にはマージしない', async () => {
  const f = fixture();
  await mergeScheduledPullRequests({ ...f, now: new Date(midnight.getTime() - 1) });
  assert.equal(f.merged.length, 0);
  assert.equal(f.outputs['deploy-ref'], '');
});

test('JSTの改正日0時に検証したSHAをマージし、公開するSHAを返す', async () => {
  const f = fixture();
  await mergeScheduledPullRequests(f);
  assert.deepEqual(f.merged, [{ owner: 'lab', repo: 'timetable', pull_number: 1, sha: 'checked-sha', merge_method: 'squash' }]);
  assert.equal(f.outputs['deploy-ref'], 'merged-1');
  assert.deepEqual(f.failures, []);
});

test('実行が遅れた場合も期限を過ぎた予約を処理する', async () => {
  const f = fixture();
  await mergeScheduledPullRequests({ ...f, now: new Date('2027-04-01T00:00:00Z') });
  assert.equal(f.merged.length, 1);
});

for (const [name, options] of [
  ['CI未実行', { ci: [] }],
  ['CI実行中', { ci: [{ status: 'in_progress', conclusion: null }] }],
  ['CI失敗', { ci: [{ status: 'completed', conclusion: 'failure' }] }],
  ['追加チェック失敗', { checks: [{ status: 'completed', conclusion: 'failure' }] }],
  ['追加チェック実行中', { checks: [{ status: 'in_progress', conclusion: null }] }],
  ['外部ステータス失敗', { statuses: { total_count: 1, state: 'failure' } }],
  ['外部ステータス未完了', { statuses: { total_count: 1, state: 'pending' } }],
]) {
  test(`${name}のPRはマージしない`, async () => {
    const f = fixture(options);
    await mergeScheduledPullRequests(f);
    assert.equal(f.merged.length, 0);
  });
}

for (const [name, pr] of [
  ['Draft', pullRequest({ draft: true })],
  ['fork', pullRequest({ head: { sha: 'checked-sha', repo: { full_name: 'other/timetable' } } })],
  ['予約なし', pullRequest({ body: '変更内容のみ' })],
  ['不正な日付', pullRequest({ body: '/schedule 2027-02-30' })],
]) {
  test(`${name}のPRは対象にしない`, async () => {
    const f = fixture({ prs: [pr] });
    await mergeScheduledPullRequests(f);
    assert.equal(f.merged.length, 0);
  });
}

for (const [name, current] of [
  ['予約削除', pullRequest({ body: '' })],
  ['予約延期', pullRequest({ body: '/schedule 2027-04-02' })],
  ['追加コミット', pullRequest({ head: { sha: 'new-sha' } })],
  ['Draftに変更', pullRequest({ draft: true })],
  ['PRをクローズ', pullRequest({ state: 'closed' })],
  ['宛先ブランチ変更', pullRequest({ base: { ref: 'other' } })],
]) {
  test(`チェック中の${name}を再確認する`, async () => {
    const f = fixture({ current });
    await mergeScheduledPullRequests(f);
    assert.equal(f.merged.length, 0);
  });
}

test('一部のマージに失敗しても成功分を公開し、失敗も報告する', async () => {
  const f = fixture({ prs: [pullRequest(), pullRequest({ number: 2 })], mergeError: (number) => number === 2 });
  await mergeScheduledPullRequests(f);
  assert.equal(f.outputs['deploy-ref'], 'merged-1');
  assert.equal(f.failures.length, 1);
});

test('複数の予約をマージした後の最終コミットを公開する', async () => {
  const f = fixture({ prs: [pullRequest(), pullRequest({ number: 2 })] });
  await mergeScheduledPullRequests(f);
  assert.equal(f.outputs['deploy-ref'], 'merged-2');
});
