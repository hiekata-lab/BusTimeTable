# BusTimeTable

## 1. 概要 / Overview

これは東京大学柏キャンパス周辺の次発のバスを表示する Web アプリケーションです。稗方研 FY2024 卒業の Shuhei Tanaka さんが作ったものをもとにしています。このリポジトリは MIT License です。研究室内外を問わず、自由に使って／コピーして／変更して／再配布していただいて構いません。

This is a web application that displays upcoming bus departures around the University of Tokyo Kashiwa Campus. It is based on a project created by Shuhei Tanaka, a FY2024 graduate of the Hiekata Lab. This repository is under the MIT License. You are free to use, copy, modify, and redistribute it, whether you are inside or outside the lab.

研究室に置く表示端末で使うことを想定しています。ブラウザでページを開くと、現在時刻に応じて次のバスの出発時刻が表示されます。

This is intended for use on a display terminal in a research lab. When the page is opened in a browser, it displays the departure time for the next bus based on the current time.

## 2. 年度はじめの時刻表の更新 / Timetable update at the beginning of FY

毎年度はじめには、`public/data` 内の CSV を更新してください。なお、このレポジトリには毎年度 4/1 にリマインダー用の issue が立つようになっています。

Please update the CSV files in `public/data` at the beginning of each fiscal year. Note that a reminder issue is set to be automatically created in this repository every year on April 1st.

更新には Codex や Claude Code などの AI エージェントを使うことを想定しています。依頼するときは、次のように伝えれば十分です。

The plan is to use AI agents such as Codex or Claude Code for updates. When making a request, it is sufficient to say the following.

```text
instructions/annual-timetable-update.md を読んで、今年度のバス時刻表に更新してください。
公式ページと PDF を確認し、必要な CSV を更新し、npm run typecheck と npm run build まで確認してください。
```

```text
Please read instructions/annual-timetable-update.md and update the bus schedule for the current fiscal year.
Check the official website and PDFs, update the necessary CSV files, and verify the process by running npm run typecheck and npm run build.
```

東武バス用に `scraping.py` もありますが、これは fallback やダブルチェックを想定して残しているファイルです。保守性が悪く、壊れている可能性もあるため基本的には使わないでください。
The `scraping.py` file still exists for Tobu Bus, but it is kept there only for fallback purposes or double-checking. Since it is difficult to maintain and may be broken, please avoid using it in general.

なお、CSV は 1 行 1 便で、形式は `HH:MM,0` または `HH:MM,1` です（`1` は画面上でマークを出す便に使います）。
東大のシャトルバスについては、公式 PDF の「東京大学 柏キャンパス発 柏の葉キャンパス駅西口」のセクションのみを参照することを想定しています。
土日祝日が運休なら、`ShuttlebusSaturday.csv` と `ShuttlebusSunday.csv` は空のままにします。

The CSV file should contain one flight per line, in the format of HH:MM,0 or HH:MM,1 (where 1 is used for flights that should be marked on the screen).
For UTokyo shuttle bus, it is assumed that you will only refer to the "From UTokyo Kashiwa Campus to Kashiwanoha-campus Station West Exit" section of the official PDF.
If service is suspended on weekends and holidays, keep ShuttlebusSaturday.csv and ShuttlebusSunday.csv empty.


## 3. ローカルでの開発 / Local Development

最初に依存関係をインストールします。
First, install the dependencies.

```bash
npm ci
python3 -m pip install -r requirements.txt
```

開発サーバーを起動すると、`http://127.0.0.1:5173/` にサーバーが立ちます。
Start the development server, and it will be up and running at `http://127.0.0.1:5173/`.

```bash
npm run dev
```

更新を行った際は typecheck と build を行ってください。
Please run typecheck and build after making any updates.

```bash
npm run typecheck
npm run build
```

先述した `scrayping.py` を以下のように実行すると、「駅探」を確認して東武バス CSV を更新します。
When you run the previously mentioned scraping.py as follows, it will check Ekitan and update the Tobu Bus CSV.

```bash
npm run scrape:check
```

## 4. デプロイ / Deploy

`main` に push または PR を merge すると、GitHub Actions の `Deploy GitHub Pages` が走ります。成功するとビルドされた `dist/` の内容が GitHub Pages に公開されます。

Pushing to `main` or merging a PR will trigger the `Deploy GitHub Pages` workflow in GitHub Actions. Once completed successfully, the contents of the built `dist/` directory will be published to GitHub Pages.

## 5. npm package の保守 / Maintenance of npm packages

Dependabot が npm package の更新 PR を自動で生成するように設定されています。patch や minor update は CI 成功後に自動 merge されるようになっていますが、major update は破壊的変更がある場合があるので、出た PR を確認して、うまく動作することを確認してから merge してください。

Dependabot is configured to automatically generate PRs for npm package updates. While patches and minor updates are set to auto-merge once the CI passes, major updates may contain breaking changes. Please review those PRs and confirm that everything works correctly before merging them.

## 6. ライセンス

このリポジトリは MIT License です。研究室内外を問わず、自由に使って／コピーして／変更して／再配布していただいて構いません。
詳細は `LICENSE` をご覧ください。

This repository is licensed under the MIT License. You are free to use, copy, modify, and redistribute it for any purpose, whether inside or outside your laboratory.
Please see `LICENSE` for details.