# 年度頭の時刻表更新手順

この手順は 4 月の時刻表改定確認を AI エージェントに依頼する前提で使う。標準手順は「AI エージェントが公式情報を探し、根拠を確認して CSV を更新する」。`scraping.py` は fallback / cross-check として残す。

## 1. 前提確認

- 対象年度の日付を確認
- `main` が最新であることを確認
- 既存公開先と移行先の Pages 設定を確認

## 2. 情報収集

AI エージェントは、日英両方で次の情報を探す。

- 東大シャトルバス公式ページ
- 東大シャトルバス公式 PDF
- 東武バス「東大西」発の各方面時刻表
- 内閣府の国民の祝日・休日 CSV
- 改定日、運休日、自動運転バス運行状況
- 運賃や所要時間など、画面文言に影響する情報

情報源は公式を優先する。公式から機械可読な時刻表が取れない場合は、駅探などの時刻表サービスを補助情報として使う（駅探, n.d.）。断定的な資料文面を書く場合は APA 形式で文中引用を入れる。

## 3. 東武バス CSV 更新

東武バスは「東大西」発の以下 3 方面を確認し、アプリ用の最終 CSV を更新する。

- 柏の葉キャンパス駅西口
- 柏駅西口
- 江戸川台駅東口

更新対象:

- `public/data/ToKashiwanohaWeekday.csv`
- `public/data/ToKashiwanohaSaturday.csv`
- `public/data/ToKashiwanohaSunday.csv`
- `public/data/ToKashiwaWeekday.csv`
- `public/data/ToKashiwaSaturday.csv`
- `public/data/ToKashiwaSunday.csv`
- `public/data/ToEdogawadaiWeekday.csv`
- `public/data/ToEdogawadaiSaturday.csv`
- `public/data/ToEdogawadaiSunday.csv`

各行は `HH:MM,0` または `HH:MM,1`。`1` は画面上で補助マークを出す便に使う。

補助確認として、駅探 HTML 構造が有効なら `scraping.py` を使って照合できる。

```bash
python3 -m pip install -r requirements.txt
npm run scrape:check
```

確認項目:

- `public/data/ToKashiwanoha*.csv` が空でない
- `public/data/ToKashiwa*.csv` が空でない
- `public/data/ToEdogawadai*.csv` が空でない
- `scraping.py` を使った場合は `npm run scrape:check` が成功
- 手作業・AI 抽出で更新した場合は、取得元ページ/PDFと CSV の対応を PR に明記

## 4. 東大シャトルバス CSV 更新

新領域創成科学研究科の公式「シャトルバス時刻表」ページと PDF を確認する。2026 年度版では、2026 年 4 月 1 日改定の PDF が公式時刻表として掲出されている（東京大学大学院新領域創成科学研究科, 2026）。

更新対象:

- `public/data/ShuttlebusWeekday.csv`
- `public/data/ShuttlebusSaturday.csv`
- `public/data/ShuttlebusSunday.csv`

確認項目:

- 平日表は「東京大学 柏キャンパス発 柏の葉キャンパス駅西口」側だけを入力
- 土日・祝日運休なら Saturday/Sunday は空
- 公式 PDF に「自動運転バスは運休中」とある場合、`※` 付き自動運転便は表示対象から除外
- 各行は `HH:MM,0` または `HH:MM,1`

## 5. 表示と build 検証

祝日データは内閣府の `syukujitsu.csv` を UTF-8 に変換して `public/data/japanese-holidays.csv` に保存する（内閣府, n.d.）。祝日は休日ダイヤとして扱う。

```bash
curl -L -o /tmp/syukujitsu.csv https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv
iconv -f CP932 -t UTF-8 /tmp/syukujitsu.csv > public/data/japanese-holidays.csv
```

```bash
npm run typecheck
npm run build
npm run dev
```

ブラウザ確認:

- 現在時刻より後の次発だけが表示される
- 最終便に `終` が付く
- 東武バスの `公` と `門` が想定どおり表示される
- 祝日は休日ダイヤが表示される
- スマホ幅で言語切替ボタンが表示される

## 6. Pull Request

PR には次を記載する:

- 更新年度
- 東武バス取得元と確認方法
- 東大シャトルバス PDF の更新日
- 祝日 CSV の取得元と取得日
- 実行した検証コマンド
- `scraping.py` を使った場合は、fallback / cross-check として使ったこと
- 既存公開先から研究室 repo Pages へ移行するかどうか

## References

駅探. (n.d.). 東武バス「東大西」路線バス時刻表. Retrieved June 26, 2026, from https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d1

内閣府. (n.d.). 国民の祝日について. Retrieved June 26, 2026, from https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html

東京大学大学院新領域創成科学研究科. (2026). シャトルバス時刻表. Retrieved June 26, 2026, from https://www.k.u-tokyo.ac.jp/gsfs/access/timetable/
