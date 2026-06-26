# 年度バス時刻表更新

このリポジトリは、東京大学柏キャンパス周辺の次発バスを表示する静的 Web アプリです。年度頭に公開情報を確認し、`public/data/` の CSV を最新化してください。

## 方針

- 日本語で作業する。
- まず `AGENTS.md` と `instructions/annual-timetable-update.md` を読む。
- 公式情報を優先して確認する。
- 日英両方で公開情報を探す。
- 断定的な説明を PR 本文に書く場合は、APA 形式の文中引用を入れる。
- `scraping.py` は fallback / cross-check としてだけ使う。

## 更新対象

- `public/data/ShuttlebusWeekday.csv`
- `public/data/ShuttlebusSaturday.csv`
- `public/data/ShuttlebusSunday.csv`
- `public/data/ToKashiwanohaWeekday.csv`
- `public/data/ToKashiwanohaSaturday.csv`
- `public/data/ToKashiwanohaSunday.csv`
- `public/data/ToKashiwaWeekday.csv`
- `public/data/ToKashiwaSaturday.csv`
- `public/data/ToKashiwaSunday.csv`
- `public/data/ToEdogawadaiWeekday.csv`
- `public/data/ToEdogawadaiSaturday.csv`
- `public/data/ToEdogawadaiSunday.csv`
- `public/data/japanese-holidays.csv`

## 必須確認

- 東大シャトルバス公式ページと PDF の改定日
- 東大シャトルバスの運休日
- 自動運転バスの運行状況
- 東武バス「東大西」発の柏の葉キャンパス駅西口、柏駅西口、江戸川台駅東口方面の平日・土曜・休日ダイヤ
- 内閣府の国民の祝日・休日 CSV
- 祝日対応に影響する情報

## CSV 仕様

- 1 行 1 便
- `HH:MM,0` または `HH:MM,1`
- 祝日は休日ダイヤとして扱う
- 東大シャトルバスで公式 PDF に自動運転運休とある場合、該当する自動運転便は表示対象に含めない
- `ShuttlebusSaturday.csv` と `ShuttlebusSunday.csv` は、土日祝日運休なら空ファイルのまま

## 検証

変更後に次を実行してください。

```bash
npm ci
python3 -m pip install -r requirements.txt
npm run typecheck
npm run build
```

駅探構造が有効で、補助検証として妥当な場合だけ次も実行してください。

```bash
npm run scrape:check
```

## PR 本文に含める内容

- 確認した年度
- 更新した CSV
- 取得元 URL
- 東大シャトルバス PDF の改定日
- 東武バス時刻表の確認元
- 祝日 CSV の確認元
- 実行した検証コマンド
- `scraping.py` を使った場合は fallback / cross-check として使ったこと
