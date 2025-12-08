// 定数定義
const TODAI_SHUTTLE_BASE_FILE = 'Shuttlebus'; // 東大シャトルバスの基本ファイル名
const TOBU_KASHIWANOHA_BASE_FILE = 'ToKashiwanoha'; // 東武バス 柏の葉キャンパス駅西口行きの基本ファイル名
const TOBU_KASHIWA_BASE_FILE = 'ToKashiwa'; // 東武バス 柏駅西口行きの基本ファイル名
const TOBU_EDOGAWA_DAI_BASE_FILE = 'ToEdogawadai'; // 東武バス 江戸川台駅東口行きの基本ファイル名


// 現在の言語状態を保持する変数 (true: 日本語, false: 英語)
let isJapanese = true;

//URLからスマホモードでの初期言語を取得
const url = new URL(window.location.href);
const FirstLanguage = Number(url.searchParams.get('FL'));//0以外が日本語

/*
// 初期言語設定
if (FirstLanguage !== null) {
  isJapanese = !(FirstLanguage === 0);
  console.log(FirstLanguage, isJapanese)
}
*/
// 切り替える要素を特定するためのセレクタ
const translatableTextSelectors = [
  '.translatable-text'
];

/**
 * 指定されたテキストに対応する英語のテキストを返します。
 * (簡易的な対応表。必要に応じて拡充してください)
 * @param {string} japaneseText - 日本語のテキスト。
 * @returns {string} - 対応する英語のテキスト、または見つからない場合は元のテキスト。
 */
function getEnglishText(japaneseText) {
  switch (japaneseText) {
    case '現在時刻':
      return 'Now';
    case '東大シャトルバス':
      return 'UTokyo Shuttle Bus';
    case '東武バス':
      return 'Tobu Bus';
    case '【環境棟前→柏の葉キャンパス駅西口】':
      return '【Kankyo-to Mae→Kashiwanoha- Campus Sta.】';
    case '【東大西→柏の葉キャンパス駅西口】':
      return '【To Kashiwanoha Campus Sta.】';
    case '【東大西→柏駅西口】':
      return '【To Kashiwa Sta.】';
    case '【東大西→江戸川台駅東口】':
      return '【To Edogawadai Sta.】';
    case '大学側': // これらの個別のマークは destination 要素全体で取得されるため、不要かもしれません
      return 'Univ. Side';
    case '公園側': // これらの個別のマークは destination 要素全体で取得されるため、不要かもしれません
      return 'Park Side';
    case '自：自動運転': // これらの個別のマークは destination 要素全体で取得されるため、不要かもしれません
      return '自： Autonomous Operation';
    case '公：公園側から発車可能性あり': // これらの個別のマークは destination 要素全体で取得されるため、不要かもしれません
      return '公：May depart from the park side';
    case '門：東大西門前経由': // これらの個別のマークは destination 要素全体で取得されるため、不要かもしれません
      return '門：Via Todai Nishimon-mae';
    default:
      return japaneseText; // 基本的に元のテキストを返す
  }
}
/**
 * 画面幅がスマホモードの閾値以下かどうかを判定する関数。
 * @returns {boolean} - スマホモードの場合は true, それ以外は false.
 */


function isSmartphoneMode() {
  return window.innerWidth <= 600; // 600pxは例です。適宜調整してください。
}


let wasSmartphoneMode = false;
function SmartphoneModeCheck() {
  if (isSmartphoneMode() && !wasSmartphoneMode && isJapanese!=FirstLanguage){
    toggleLanguage(true);
    wasSmartphoneMode = true;
  }else if (isSmartphoneMode()==false && wasSmartphoneMode==true){
    wasSmartphoneMode = false;
  }
}
/**
 * 各表示要素のテキストを日本語と英語で切り替えます。
 */
function toggleLanguage(Flag=false) {
  if (isSmartphoneMode() && !Flag) {
    // スマホモードの場合は時間での言語切り替えをスキップ
    console.log("Smartphone mode detected. Language toggle skipped.");
    return;
  }
  isJapanese = !isJapanese; // 言語状態を最初に反転
  console.log("toggleLanguage called. isJapanese:", isJapanese); // 追跡用ログを追加
  const elements = document.querySelectorAll(translatableTextSelectors.join(', '));
  elements.forEach(element => {
    const japaneseText = element.dataset.japaneseText;
    const englishText = element.dataset.englishText;
    console.log("  Element:", element); // 追跡用ログを追加
    console.log("  Japanese:", japaneseText); // 追跡用ログを追加
    console.log("  English:", englishText); // 追跡用ログを追加
    console.log("  Current isJapanese:", isJapanese); // 追跡用ログを追加

    if (japaneseText && englishText) {
      const newText = isJapanese ? japaneseText : englishText;
      element.textContent = newText;
      console.log("  Setting text to:", newText); // 追跡用ログを追加
    }
  });
}

// 前回の分の値を保存する変数（初期値は無効な値）
let previousMinute = -1;
// コロンの表示状態を管理する変数（初期状態は表示）
let colonVisible = true;

/**
 * CSVファイルから出発時刻データを読み込む。
 * ファイル名は曜日によって動的に決定される。
 * @param {string} baseFileName - 基本ファイル名（例: 'Shuttlebus'）。
 * @returns {Promise<Array<{time: string, isAutonomous: boolean}>|undefined>} - 時刻と自動運転フラグのオブジェクト配列、または読み込み失敗時に undefined。
 */
async function loadDepartureTimes(baseFileName) {
  const now = new Date(); // 現在の日時を取得
  const dayOfWeek = now.getDay(); // 現在の曜日を数値で取得 (0:日, 1:月, ..., 6:土)
  let dayType = 'Weekday'; // デフォルトの曜日タイプを平日とする

  if (dayOfWeek === 6) { // もし土曜日なら
    dayType = 'Saturday'; // 曜日タイプを土曜日に変更
  }
  if (dayOfWeek === 0) { // もし日曜日なら
    dayType = 'Sunday'; // 曜日タイプを日曜日に変更
  }

  const csvFile = `${baseFileName}${dayType}.csv`; // 基本ファイル名と曜日タイプを組み合わせてCSVファイル名を生成

  try {
    const response = await fetch(csvFile); // CSVファイルを非同期で読み込む
    if (!response.ok) { // レスポンスが成功しなかった場合
      throw new Error(`HTTP error! status: ${response.status} for ${csvFile}`); // エラーを投げる
    }
    const csvData = await response.text(); // レスポンスからテキスト形式のCSVデータを取得
    return csvData.trim().split('\n').map(line => { // CSVデータを改行で分割し、各行を処理
      const [time, isAutonomous] = line.split(','); // 各行をカンマで分割して時刻と自動運転フラグを取得
      return { time, isAutonomous: isAutonomous ? isAutonomous.trim() === '1' : false }; // 時刻と自動運転フラグをオブジェクトとして返す（自動運転フラグが '1' なら true、そうでなければ false）
    });
  } catch (error) { // CSVファイルの読み込みに失敗した場合
    console.error(`時刻表データ '${csvFile}' の読み込みに失敗しました:`, error); // エラー内容をコンソールに出力
    return; // 読み込み失敗時は何も返さない
  }
}

/**
 * 現在時刻を更新し、コロンを点滅させる。
 */
function updateClock() {
  const now = new Date(); // 現在の日時を取得
  const hours = String(now.getHours()).padStart(2, '0'); // 現在の時間を2桁の文字列で取得
  const minutes = String(now.getMinutes()).padStart(2, '0'); // 現在の分を2桁の文字列で取得
  const currentTimeElement = document.getElementById('current-time'); // 現在時刻を表示する要素を取得

  if (currentTimeElement) { // 要素が存在する場合
    currentTimeElement.innerHTML = `${hours}${colonVisible ? ':' : '<span style="opacity: 0;">:</span>'}${minutes}`; // 時刻を要素に表示（コロンは colonVisible の状態によって表示/非表示を切り替え）
  }

  colonVisible = !colonVisible; // コロンの表示状態を反転

  // 分が変わったときに時刻表を更新
  if (now.getMinutes() !== previousMinute) { // 現在の分が前回の分と異なる場合
    loadAndDisplayTimes(); // 時刻表データを再読み込みして表示
    previousMinute = now.getMinutes(); // 前回の分の値を現在の分に更新
  }
}

/**
 * 現在時刻に基づいて、指定された数だけ次の出発時刻を検索する。
 * @param {string} currentTime - 現在時刻（HH:MM形式）。
 * @param {Array<{time: string, isAutonomous: boolean}>} departureTimes - 時刻と自動運転フラグのオブジェクト配列。
 * @param {number} count - 検索する出発時刻の数。
 * @returns {Array<{time: string, isAutonomous: boolean, isLast?: boolean}>} - 次の出発時刻の配列（最終バスの場合は isLast フラグ付き）。
 */
function findNextDepartures(currentTime, departureTimes, count) {
  if (!departureTimes) { // 出発時刻データが存在しない場合
    console.error("[findNextDepartures] departureTimes is undefined."); // エラーメッセージをコンソールに出力
    return; // 空の配列を返すなど、安全な値を返す
  }
  const nextDepartures =[]; // 次の出発時刻を格納する空の配列を初期化
  const [currentHour, currentMinute] = currentTime.split(':').map(Number); // 現在時刻を時間と分に分割して数値に変換
  const nowInMinutes = currentHour * 60 + currentMinute; // 現在時刻を分単位に変換

  const allDepartureTimesOnly = departureTimes.map(item => { // 全ての出発時刻を時刻のみの配列として取得
    if (!item || typeof item.time === 'undefined') { // item が存在しない、または time プロパティがない場合
      console.error("[findNextDepartures] Invalid item in departureTimes:", item); // エラーメッセージをコンソールに出力
      return null; // または何らかのプレースホルダー
    }
    return item.time; // 時刻を返す
  });

  for (const departure of departureTimes) { // 出発時刻データを一つずつ処理
    const [departureHour, departureMinute] = departure.time.split(':').map(Number); // 出発時刻を時間と分に分割して数値に変換
    const departureInMinutes = departureHour * 60 + departureMinute; // 出発時刻を分単位に変換

    if (departureInMinutes > nowInMinutes) { // 出発時刻が現在時刻よりも後の場合
      nextDepartures.push({ time: departure.time, isAutonomous: departure.isAutonomous }); // 次の出発時刻として配列に追加
      if (nextDepartures.length >= count) { // 指定された数だけ次の出発時刻が見つかった場合
        break; // ループを終了
      }
    }
  }

  // 最終バスの判定とマーク
  if (nextDepartures.length > 0 && allDepartureTimesOnly.length > 0 && nextDepartures[nextDepartures.length - 1].time === allDepartureTimesOnly[allDepartureTimesOnly.length - 1]) { // 次の出発時刻が存在し、かつそれが全出発時刻の最後の時刻と一致する場合
    nextDepartures[nextDepartures.length - 1].isLast = true; // 最後の出発時刻に isLast フラグを設定
  }

  return nextDepartures; // 次の出発時刻の配列を返す
}

/**
 * 指定されたバス停の次の出発時刻を指定された要素に表示する。
 * @param {string} baseFileName - 基本ファイル名。
 * @param {string} elementId - 出発時刻を表示する要素のID。
 * @param {number} count - 表示する出発時刻の数。
 */
async function displayNextDepartures(baseFileName, elementId, count) {
    const departuresWithInfo = await loadDepartureTimes(baseFileName); // 指定されたバス停の出発時刻データを読み込む
    const now = new Date(); // 現在の日時を取得
    const currentHour = String(now.getHours()).padStart(2, '0'); // 現在の時間を2桁の文字列で取得
    const currentMinute = String(now.getMinutes()).padStart(2, '0'); // 現在の分を2桁の文字列で取得
    const currentTime = `${currentHour}:${currentMinute}`; // 現在時刻を HH:MM 形式の文字列で作成
    const nextDepartures = findNextDepartures(currentTime, departuresWithInfo, count); // 次の出発時刻を検索
    const element = document.getElementById(elementId); // 出発時刻を表示する要素を取得
    if (element) { // 要素が存在する場合
      const spanElements = element.querySelectorAll('span'); // 要素内の全ての span 要素を取得
      if (nextDepartures.length == 0) { // 次の出発時刻が存在しない場合
        //spanElements[0].textContent = "本日のバスは終了しました"; // 最初の span 要素に「本日のバスは終了しました」と表示
        for (let i = 0; i < spanElements.length; i++) { // 残りの span 要素を空にする
          spanElements[i].textContent = "";
        }
      } else if (nextDepartures) { // 次の出発時刻が存在する場合
        spanElements.forEach((span, index) => { // 各 span 要素に対して処理
          if (index < nextDepartures.length) { // 次の出発時刻の数だけ処理
            let displayText = `<div class="departure-time">${nextDepartures[index].time}</div>`;
            if (nextDepartures[index].isLast) {
              displayText += '<div class="last-bus-mark">終</div>';
            }
            if (nextDepartures[index].isAutonomous) {
              let autonomousMark = '';
              if (baseFileName === TOBU_EDOGAWA_DAI_BASE_FILE) {
                autonomousMark = '門';
              } else if (baseFileName === TOBU_KASHIWANOHA_BASE_FILE) {
                autonomousMark = '公';
              } else if (baseFileName === TODAI_SHUTTLE_BASE_FILE) {
                autonomousMark = '自';
              }
              displayText += `<div class="autonomous-mark">${autonomousMark}</div>`;
            }
            span.innerHTML = displayText;
          } else { // 次の出発時刻の数よりも span 要素が多い場合
            span.textContent = ""; // span 要素を空にする
          }
        });
      }
    }
  }

/**
 * ページ内の翻訳可能なテキスト要素にデータ属性を設定する。
 */
function setInitialLanguageData() {
  const elements = document.querySelectorAll(translatableTextSelectors.join(', '));
  elements.forEach((element) => {
    const japaneseText = element.textContent.trim();
    const englishText = getEnglishText(japaneseText);
    element.dataset.japaneseText = japaneseText;
    element.dataset.englishText = englishText;

    // 初期表示を言語設定に基づいて設定
    element.textContent = japaneseText;
  });
}

/**
 * 時刻表示と全てのバス停の出発時刻をロードして表示する。
 */
async function loadAndDisplayTimes() {
  //updateClock(); // 最初のロード時に時刻を更新（setIntervalで定期的に呼ばれるためコメントアウト）
  await displayNextDepartures(TODAI_SHUTTLE_BASE_FILE, 'todai-next-departures', 4); // 東大シャトルバスの次の4つの出発時刻を表示
  await displayNextDepartures(TOBU_KASHIWANOHA_BASE_FILE, 'tobu-kashiwanoha-next-departures', 4); // 東武 柏の葉キャンパス駅西口行きの次の4つの出発時刻を表示
  await displayNextDepartures(TOBU_KASHIWA_BASE_FILE, 'tobu-kashiwa-next-departures', 2); // 東武 柏駅西口行きの次の2つの出発時刻を表示
  await displayNextDepartures(TOBU_EDOGAWA_DAI_BASE_FILE, 'tobu-edogawadai-next-departures', 2); // 東武 江戸川台駅東口行きの次の2つの出発時刻を表示
}

// DOMContentLoaded イベントリスナー：DOMが完全にロードされた後に処理を開始
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date(); // 現在の日時を取得
  previousMinute = now.getMinutes(); // ページのロード時の分を初期化
  loadAndDisplayTimes(); // ページのロード時に最初の時刻表示を行う
  setInitialLanguageData(); // 初期表示のためにデータ属性を設定
  setInterval(updateClock, 500); // 0.5秒ごとに updateClock を呼び出す (時刻表示と時刻表の更新を行う)
});

// 切り替えて表示したいテキストの配列（日本語のまま）
const tickerMessages = [
  "東大西門前経由は、ヨークマート前経由に対して駅到着までの所要時間が7分長いです",
  "《各駅までの所要時間》　シャトルバス：8分 柏の葉キャンパス駅：10～14分 柏駅：25分 江戸川台駅：15～22分",
  "制作：田中柊平（2025年3月稗方研卒業） shuhei.ged@gmail.com",
  "忘れ物はありませんか？　特に傘とか、、、",
  "研究お疲れ様です。",
  "夜は学生証がないと棟内に戻れないのでお気をつけ下さい。",
  "《成績が良すぎるドーナツ》　　オール５・ファッション",
  "《運賃》柏の葉キャンパス駅行：168円　柏駅行：294円　江戸川台駅行189円or199円",
  "《「終」の意味》その日の最終バスです",
  "今年卒業する皆さんは、このような卒業制作を行う必要はありません。",
  "毎年4月に時刻表の改正がないか確認をお願いします。",
  "祝日は非対応です",
  "The route via Todai Nishimon-mae takes 7 minutes longer to reach the station than the route via York Mart.",
  "《Travel time》Shuttle bus:8min Kashiwanoha-Campus Sta.:10-14min Kashiwa Sta.:25min Edogawadai Sta.:15-22min",
  "Made by Shuhei Tanaka (Hiekata Lab graduate on March 2025) shuhei.ged@gmail.com",
  "Did you leave anything behind? Especially umbrellas...",
  "Thank you for your hard work on your research.",
  "Please note that you cannot return to this building from 18:00 without your student ID card.",
  "《Fare》Kashiwanoha-Campus Sta.: 168yen Kashiwa Sta.: 294yen Edogawadai Sta.: 189 or 199yen",
  "《Meaning of '終'》 It is the last bus of the day.",
  "This year's graduates do not need to do this kind of graduation project.",
  "Please check every April for timetable revisions.",
  "Holidays are not supported."
  // 必要に応じて他のメッセージを追加
];


let currentMessageIndex = (Math.floor( Math.random() * 1000 )) % tickerMessages.length; // 現在表示しているメッセージのインデックス
const tickerElementId = 'bottom-ticker'; // テキストを表示する要素のID
const fadeDuration = 500; // フェードイン・アウトの時間 (ミリ秒)

function updateBottomTicker() {
  const tickerElement = document.getElementById(tickerElementId);
  if (tickerElement) {
    let textSpan = tickerElement.querySelector('.ticker-text'); // 既存の span 要素を探す

    if (!textSpan) {
      // span 要素が存在しない場合は作成して追加
      textSpan = document.createElement('span');
      textSpan.classList.add('ticker-text'); // クラスを追加
      tickerElement.appendChild(textSpan);
    }

    textSpan.classList.remove('fade-in'); // フェードインクラスを削除
    textSpan.classList.add('fade-out'); // フェードアウトを開始

    setTimeout(() => {
      textSpan.textContent = tickerMessages[currentMessageIndex];
      const japaneseText = textSpan.textContent;
      const englishText = getEnglishText(japaneseText);
      textSpan.dataset.japaneseText = japaneseText;
      textSpan.dataset.englishText = englishText;
      currentMessageIndex = (currentMessageIndex + Math.floor( Math.random() * 1000 )) % tickerMessages.length; // 次のメッセージのインデックスへ

      setTimeout(() => {
        textSpan.classList.remove('fade-out'); // フェードアウトクラスを削除
        textSpan.classList.add('fade-in');   // フェードインを開始
      }, 10);
    }, fadeDuration);
  }
}


// ページが読み込まれた後に最初のメッセージを表示し、その後一定時間ごとに更新
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date(); // 現在の日時を取得
  previousMinute = now.getMinutes(); // ページのロード時の分を初期化
  loadAndDisplayTimes(); // ページのロード時に最初の時刻表示を行う
  setInitialLanguageData(); // 初期表示のためにデータ属性を設定
  setInterval(updateClock, 500); // 0.5秒ごとに updateClock を呼び出す (時刻表示と時刻表の更新を行う)

  const bottomTickerElement = document.getElementById(tickerElementId);
  if (bottomTickerElement) {
    bottomTickerElement.innerHTML = `<span class="ticker-text fade-in">${tickerMessages[0]}</span>`; // 最初のメッセージを表示
    const japaneseText = tickerMessages[0];
    const englishText = getEnglishText(japaneseText);
    bottomTickerElement.querySelector('.ticker-text').dataset.japaneseText = japaneseText;
    bottomTickerElement.querySelector('.ticker-text').dataset.englishText = englishText;
    setInterval(updateBottomTicker, 11247 + fadeDuration); // メッセージ表示時間 + フェード時間
  }
  if (FirstLanguage==false){
    console.log("TOGGLE LANGUAGE");
    toggleLanguage(true);
  };
  setInterval(toggleLanguage, 6000); // 6秒ごとに言語を切り替える
  const languageToggleButton = document.getElementById('language-toggle-button');
  if (languageToggleButton) {
    languageToggleButton.addEventListener('click', () => {
      toggleLanguage(flag=true);
      // ボタンのテキストを更新
    });
  }
});

window.addEventListener('resize', SmartphoneModeCheck);

/*デバッグ用：コンソールで実行する
// 現在時刻を特定の日時に設定する関数
function setTime(year, month, day, hour, minute) {
  const newDate = new Date(year, month - 1, day, hour, minute, 0);
  Date = class extends Date {
    constructor() {
      if (arguments.length === 0) {
        return newDate;
      }
      return super(...arguments);
    }
  };
  console.log('現在時刻を', newDate.toLocaleString(), 'に設定しました。');
  loadAndDisplayTimes(); // 時刻表示を更新
}

// 使用例: 2025年3月14日 午後5時10分に設定
setTime(2025, 3, 14, 17, 10);
*/
