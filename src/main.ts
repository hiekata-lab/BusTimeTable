import './styles.css';
import Holidays from 'date-holidays';

type Language = 'ja' | 'en';
type DayType = 'Weekday' | 'Saturday' | 'Sunday';
type RouteMarker = '自' | '公' | '門';

interface Departure {
  time: string;
  hasRouteMarker: boolean;
}

interface DisplayDeparture extends Departure {
  isLast: boolean;
}

interface RouteConfig {
  baseFileName: string;
  elementId: string;
  maxDepartures: number;
  marker?: RouteMarker;
}

const routes: RouteConfig[] = [
  {
    baseFileName: 'Shuttlebus',
    elementId: 'todai-next-departures',
    maxDepartures: 4,
    marker: '自',
  },
  {
    baseFileName: 'ToKashiwanoha',
    elementId: 'tobu-kashiwanoha-next-departures',
    maxDepartures: 4,
    marker: '公',
  },
  {
    baseFileName: 'ToKashiwa',
    elementId: 'tobu-kashiwa-next-departures',
    maxDepartures: 2,
  },
  {
    baseFileName: 'ToEdogawadai',
    elementId: 'tobu-edogawadai-next-departures',
    maxDepartures: 2,
    marker: '門',
  },
];

const textTranslations = new Map<string, string>([
  ['現在時刻', 'Now'],
  ['東大シャトルバス', 'UTokyo Shuttle Bus'],
  ['東武バス', 'Tobu Bus'],
  ['【環境棟前→柏の葉キャンパス駅西口】', '【Kankyo-to Mae -> Kashiwanoha-Campus Sta.】'],
  ['※自動運転バスは運休中です', 'Autonomous shuttle service is suspended.'],
  ['【東大西→柏の葉キャンパス駅西口】', '【To Kashiwanoha Campus Sta.】'],
  ['【東大西→柏駅西口】', '【To Kashiwa Sta.】'],
  ['【東大西→江戸川台駅東口】', '【To Edogawadai Sta.】'],
  ['大学側', 'Univ. Side'],
  ['公園側', 'Park Side'],
  ['公：公園側から発車可能性あり', '公: May depart from the park side'],
  ['門：東大西門前経由', '門: Via Todai Nishimon-mae'],
]);

const tickerMessages = [
  '東大西門前経由は、ヨークマート前経由に対して駅到着までの所要時間が7分長いです',
  '《各駅までの所要時間》　シャトルバス：8分 柏の葉キャンパス駅：10～14分 柏駅：25分 江戸川台駅：15～22分',
  '忘れ物はありませんか？　特に傘とか、、、',
  '研究お疲れ様です。',
  '夜は学生証がないと棟内に戻れないのでお気をつけ下さい。',
  '《成績が良すぎるドーナツ》　　オール５・ファッション',
  '《運賃》柏の葉キャンパス駅行：168円　柏駅行：294円　江戸川台駅行189円or199円',
  '《「終」の意味》その日の最終バスです',
  '今年卒業する皆さんは、このような卒業制作を行う必要はありません。',
  '毎年4月に時刻表の改正がないか確認をお願いします。',
  '祝日は休日ダイヤで表示します。',
  'The route via Todai Nishimon-mae takes 7 minutes longer to reach the station than the route via York Mart.',
  'Travel time: Shuttle bus 8min / Kashiwanoha-Campus Sta. 10-14min / Kashiwa Sta. 25min / Edogawadai Sta. 15-22min',
  'Did you leave anything behind? Especially umbrellas...',
  'Thank you for your hard work on your research.',
  'Please note that you cannot return to this building from 18:00 without your student ID card.',
  'Fare: Kashiwanoha-Campus Sta. 168 yen / Kashiwa Sta. 294 yen / Edogawadai Sta. 189 or 199 yen',
  "Meaning of '終': It is the last bus of the day.",
  "This year's graduates do not need to make this kind of graduation project.",
  'Please check every April for timetable revisions.',
  'National holidays use the holiday timetable.',
];

const translatableTextSelector = '.translatable-text';
const tickerElementId = 'bottom-ticker';
const fadeDurationMs = 500;
const smartphoneWidthPx = 600;
const japaneseHolidays = new Holidays('JP', {
  timezone: 'Asia/Tokyo',
  types: ['public'],
});

const firstLanguageParam = new URL(window.location.href).searchParams.get('FL');
let currentLanguage: Language = firstLanguageParam === '0' ? 'en' : 'ja';
let wasSmartphoneMode = isSmartphoneMode();
let previousMinute = -1;
let colonVisible = true;
let currentMessageIndex = Math.floor(Math.random() * tickerMessages.length);

function isSmartphoneMode(): boolean {
  return window.innerWidth <= smartphoneWidthPx;
}

function getDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isJapaneseHoliday(date: Date): boolean {
  return Boolean(japaneseHolidays.isHoliday(getDateOnly(date)));
}

function getDayType(date: Date): DayType {
  const dayOfWeek = date.getDay();

  if (isJapaneseHoliday(date)) {
    return 'Sunday';
  }

  if (dayOfWeek === 0) {
    return 'Sunday';
  }

  if (dayOfWeek === 6) {
    return 'Saturday';
  }

  return 'Weekday';
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function getDataUrl(baseFileName: string, date = new Date()): string {
  return `${import.meta.env.BASE_URL}data/${baseFileName}${getDayType(date)}.csv`;
}

function parseDepartureCsv(csvData: string): Departure[] {
  return csvData
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [time, markerFlag = '0'] = line.split(',').map((item) => item.trim());
      return {
        time,
        hasRouteMarker: markerFlag === '1',
      };
    });
}

async function loadDepartureTimes(baseFileName: string): Promise<Departure[]> {
  const csvUrl = getDataUrl(baseFileName);
  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${csvUrl}: ${response.status}`);
  }

  return parseDepartureCsv(await response.text());
}

function findNextDepartures(currentTime: string, departureTimes: Departure[], count: number): DisplayDeparture[] {
  const nowInMinutes = toMinutes(currentTime);
  const nextDepartures = departureTimes
    .filter((departure) => toMinutes(departure.time) > nowInMinutes)
    .slice(0, count);

  const lastDeparture = departureTimes[departureTimes.length - 1];

  return nextDepartures.map((departure) => ({
    ...departure,
    isLast: Boolean(lastDeparture && departure.time === lastDeparture.time),
  }));
}

function renderDeparture(route: RouteConfig, departure: DisplayDeparture): string {
  const lastBusMark = departure.isLast ? '<div class="last-bus-mark">終</div>' : '';
  const routeMarker =
    route.marker && departure.hasRouteMarker ? `<div class="autonomous-mark">${route.marker}</div>` : '';

  return `<div class="departure-time">${departure.time}</div>${lastBusMark}${routeMarker}`;
}

async function displayNextDepartures(route: RouteConfig): Promise<void> {
  const element = document.getElementById(route.elementId);

  if (!element) {
    return;
  }

  try {
    const departures = await loadDepartureTimes(route.baseFileName);
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextDepartures = findNextDepartures(currentTime, departures, route.maxDepartures);
    const spanElements = element.querySelectorAll('span');

    spanElements.forEach((span, index) => {
      const departure = nextDepartures[index];
      span.innerHTML = departure ? renderDeparture(route, departure) : '';
    });
  } catch (error) {
    console.error(`時刻表データの読み込みに失敗しました: ${route.baseFileName}`, error);
  }
}

async function loadAndDisplayTimes(): Promise<void> {
  await Promise.all(routes.map((route) => displayNextDepartures(route)));
}

function updateClock(): void {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeElement = document.getElementById('current-time');

  if (currentTimeElement) {
    currentTimeElement.innerHTML = `${hours}${colonVisible ? ':' : '<span style="opacity: 0;">:</span>'}${minutes}`;
  }

  colonVisible = !colonVisible;

  if (now.getMinutes() !== previousMinute) {
    void loadAndDisplayTimes();
    previousMinute = now.getMinutes();
  }
}

function setInitialLanguageData(): void {
  document.querySelectorAll<HTMLElement>(translatableTextSelector).forEach((element) => {
    const japaneseText = element.textContent?.trim() ?? '';
    element.dataset.japaneseText = japaneseText;
    element.dataset.englishText = textTranslations.get(japaneseText) ?? japaneseText;
  });

  applyLanguage(currentLanguage);
}

function applyLanguage(language: Language): void {
  document.documentElement.lang = language;

  document.querySelectorAll<HTMLElement>(translatableTextSelector).forEach((element) => {
    element.textContent = language === 'ja' ? element.dataset.japaneseText ?? '' : element.dataset.englishText ?? '';
  });
}

function toggleLanguage(force = false): void {
  if (isSmartphoneMode() && !force) {
    return;
  }

  currentLanguage = currentLanguage === 'ja' ? 'en' : 'ja';
  applyLanguage(currentLanguage);
}

function checkSmartphoneMode(): void {
  const isCurrentlySmartphoneMode = isSmartphoneMode();

  if (isCurrentlySmartphoneMode && !wasSmartphoneMode) {
    applyLanguage(currentLanguage);
  }

  wasSmartphoneMode = isCurrentlySmartphoneMode;
}

function setTickerText(text: string): void {
  const tickerElement = document.getElementById(tickerElementId);

  if (!tickerElement) {
    return;
  }

  let textSpan = tickerElement.querySelector<HTMLSpanElement>('.ticker-text');

  if (!textSpan) {
    textSpan = document.createElement('span');
    textSpan.classList.add('ticker-text');
    tickerElement.appendChild(textSpan);
  }

  textSpan.textContent = text;
}

function updateBottomTicker(): void {
  const tickerElement = document.getElementById(tickerElementId);
  const textSpan = tickerElement?.querySelector<HTMLSpanElement>('.ticker-text');

  if (!textSpan) {
    return;
  }

  textSpan.classList.remove('fade-in');
  textSpan.classList.add('fade-out');

  window.setTimeout(() => {
    currentMessageIndex = (currentMessageIndex + 1) % tickerMessages.length;
    textSpan.textContent = tickerMessages[currentMessageIndex];

    window.setTimeout(() => {
      textSpan.classList.remove('fade-out');
      textSpan.classList.add('fade-in');
    }, 10);
  }, fadeDurationMs);
}

function initializeTicker(): void {
  setTickerText(tickerMessages[currentMessageIndex]);
  document.querySelector<HTMLSpanElement>('#bottom-ticker .ticker-text')?.classList.add('fade-in');
  window.setInterval(updateBottomTicker, 11247 + fadeDurationMs);
}

document.addEventListener('DOMContentLoaded', () => {
  previousMinute = new Date().getMinutes();
  setInitialLanguageData();
  updateClock();
  void loadAndDisplayTimes();
  initializeTicker();

  document.getElementById('language-toggle-button')?.addEventListener('click', () => {
    toggleLanguage(true);
  });

  window.setInterval(updateClock, 500);
  window.setInterval(() => toggleLanguage(), 6000);
  window.addEventListener('resize', checkSmartphoneMode);
});
