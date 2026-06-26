# AGENTS.md

## 基本方針

関係ない整形や UI （文言を含む）の変更を混ぜない。

## リポジトリ構成

- `src/main.ts`: 表示ロジック。CSV の仕様変更時はここを確認
- `src/styles.css`: 端末表示用スタイル。研究室設置ディスプレイの可読性を優先
- `public/data/`: 本番配信される時刻表 CSV
- `public/assets/`: 本番配信される画像
- `scraping.py`: 東武バス CSV 更新
- `instructions/annual-timetable-update.md`: 年度更新の実行手順

## 時刻表更新ルール

- 標準的には AI エージェントが公式情報を探して CSV を更新する
- まず日英両方で公式ページ、PDF、時刻表ページを探す
- 東武バスは東武バス公式または時刻表サービスで「東大西」発の各方面を確認する
- 東大シャトルバスは公式 PDF を目視確認して `ShuttlebusWeekday.csv` を更新する
- `scraping.py` は fallback / cross-check 用。標準更新手段として扱わない
- `npm run scrape:check` は駅探構造が有効な場合の補助検証として使う
- 祝日は休日ダイヤとして扱う。東武バスは `Sunday.csv`、東大シャトルバスは `ShuttlebusSunday.csv` を読む
- 土日・祝日は東大シャトルバス運休。`ShuttlebusSaturday.csv` と `ShuttlebusSunday.csv` は空のまま
- 祝日判定は `date-holidays` に委譲する。祝日 CSV は repo に同梱しない
- 自動運転バスが公式 PDF で運休中なら、`※` 付き自動運転便は表示対象に含めない（不要ならばロジックは変更しなくてよい）

## 検証コマンド

```bash
npm ci
python3 -m pip install -r requirements.txt
npm run typecheck
npm run build
```

駅探 HTML を補助検証に使う場合だけ、次を追加する。

```bash
npm run scrape:check
```

## Deploy

- GitHub Pages は GitHub Actions から `dist/` を公開
- `vite.config.ts` の build base は相対パス
- deploy 先を root domain と project path の間で変更しても、assets と CSV は同じ相対位置で解決される

## Dependency Maintenance

- `.github/dependabot.yml` で npm package と GitHub Actions を保守する
- Dependabot の patch / minor update は CI 成功後に自動 merge する
- major update は自動 merge しない
- major update で表示や CSV 読み込みに影響しそうな場合は、`npm run dev` で画面確認する

## 年度更新

- `.github/workflows/annual-update-reminder.yml` が毎年 4 月 1 日に手動更新用 issue を作る
- issue を起点に、担当者が Codex などの AI エージェントへ更新を依頼する
- 年度更新時は `instructions/annual-timetable-update.md` を最初に読む
- 更新 PR が merge されると deploy workflow が走り、GitHub Pages が更新される
