# BusTimeTable

## 概要

東京大学柏キャンパス周辺の次発のバスを表示する Web アプリケーションです。
稗方研 FY2024 卒業の Shuei Tanaka さんが作ったものをもとにしています。
静的に配信しており、フロントエンドは Vite + TypeScript、時刻表 CSV は `public/data/` から読み込む形をとっています。
祝日は内閣府の「国民の祝日・休日」CSV を UTF-8 に変換した `public/data/japanese-holidays.csv` で判定し、休日ダイヤとして扱います（内閣府, n.d.）。

## Development

```bash
npm ci
python3 -m pip install -r requirements.txt
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
```

## 時刻表更新

標準手順は、AI エージェントが公式ページ・PDF・時刻表ページを探し、根拠を確認したうえで `public/data/` の CSV を更新する。東武バスについては、公式サイトまたは時刻表サービスで「東大西」発の各方面時刻表を確認し、柏の葉キャンパス駅西口・柏駅西口・江戸川台駅東口方面の最終 CSV に反映する（駅探, n.d.）。

`scraping.py` は、駅探 HTML が従来構造のまま残っている場合に限って使う fallback / cross-check とする。使う場合の補助コマンドは次のとおり。

```bash
python3 -m pip install -r requirements.txt
npm run scrape
npm run scrape:check
```

東大シャトルバスは新領域創成科学研究科の公式 PDF を確認し、`public/data/ShuttlebusWeekday.csv` を手動更新する。2026 年度版は 2026 年 4 月 1 日改定の時刻表を根拠にしている（東京大学大学院新領域創成科学研究科, 2026）。

祝日 CSV を更新する場合は、内閣府の CSV を取得して UTF-8 に変換する。

```bash
curl -L -o /tmp/syukujitsu.csv https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv
iconv -f CP932 -t UTF-8 /tmp/syukujitsu.csv > public/data/japanese-holidays.csv
```

## Deploy

`main` への push で GitHub Pages 用の `dist/` を build し、`actions/deploy-pages` で公開する。初回は GitHub repository settings の Pages source を GitHub Actions にする。

## References

駅探. (n.d.). 東武バス「東大西」路線バス時刻表. Retrieved June 26, 2026, from https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d1

内閣府. (n.d.). 国民の祝日について. Retrieved June 26, 2026, from https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html

東京大学大学院新領域創成科学研究科. (2026). シャトルバス時刻表. Retrieved June 26, 2026, from https://www.k.u-tokyo.ac.jp/gsfs/access/timetable/
