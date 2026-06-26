from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Iterable

import requests
from bs4 import BeautifulSoup

"""
保守性が悪く、うまくスクレイピングできない可能性があるので、基本的にはこのスクリプトを使わず、AIエージェントに依頼することを検討してください。
This script has poor maintainability and may not be able to scrape data effectively. Please consider asking an AI agent to handle the task instead of using this script.
"""


DEFAULT_OUTPUT_DIR = Path("public/data")
TIME_PATTERN = re.compile(r"\b([0-2]?\d:[0-5]\d)\b")
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)


@dataclass(frozen=True)
class TimetableSource:
    url: str
    has_route_marker: bool


@dataclass(frozen=True)
class TimetableTarget:
    output_name: str
    sources: tuple[TimetableSource, ...]


DAY_QUERY = {
    "Weekday": "dw=0",
    "Saturday": "dw=1",
    "Sunday": "dw=2",
}


def ekitan_url(stop_id: str, direction: str, day_type: str) -> str:
    return (
        "https://ekitan.com/timetable/route-bus/company/5083/1015573/"
        f"{stop_id}/{direction}?view=list&{DAY_QUERY[day_type]}"
    )


def build_targets() -> tuple[TimetableTarget, ...]:
    targets: list[TimetableTarget] = []

    for day_type in DAY_QUERY:
        targets.extend(
            [
                TimetableTarget(
                    output_name=f"ToEdogawadai{day_type}.csv",
                    sources=(
                        TimetableSource(ekitan_url("1003068", "d1", day_type), False),
                        TimetableSource(ekitan_url("1003083", "d1", day_type), True),
                    ),
                ),
                TimetableTarget(
                    output_name=f"ToKashiwanoha{day_type}.csv",
                    sources=(
                        TimetableSource(ekitan_url("1003068", "d2", day_type), False),
                        TimetableSource(ekitan_url("1003083", "d2", day_type), False),
                        TimetableSource(ekitan_url("1003102", "d1", day_type), True),
                    ),
                ),
                TimetableTarget(
                    output_name=f"ToKashiwa{day_type}.csv",
                    sources=(
                        TimetableSource(ekitan_url("1011669", "d2", day_type), True),
                    ),
                ),
            ]
        )

    return tuple(targets)


class ScrapeError(RuntimeError):
    pass


def normalize_time(raw_time: str) -> str:
    hour, minute = raw_time.split(":")
    return f"{int(hour):02d}:{minute}"


def time_sort_key(row: tuple[str, bool]) -> tuple[int, int, int]:
    hour, minute = row[0].split(":")
    return int(hour), int(minute), int(row[1])


def fetch_html(url: str, timeout: float) -> str:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=timeout)
    response.raise_for_status()
    response.encoding = response.apparent_encoding
    return response.text


def scrape_ekitan_times(url: str, timeout: float) -> list[str]:
    soup = BeautifulSoup(fetch_html(url, timeout), "html.parser")
    hour_blocks = soup.select("div.search-result-data.ek-search-result.ek-hour_line.ek-hour_list")

    if not hour_blocks:
        raise ScrapeError(f"駅探の時間帯ブロックが見つかりません: {url}")

    times: list[str] = []
    previous_hour = -1

    for block in hour_blocks:
        hour_text = block.select_one("p.time-hour")

        if hour_text is None:
            continue

        hour_match = re.search(r"\d+", hour_text.get_text(strip=True))

        if hour_match is None:
            continue

        hour = int(hour_match.group())

        if hour < previous_hour:
            break

        previous_hour = hour

        for dep_time in block.select("span.dep-time"):
            match = TIME_PATTERN.search(dep_time.get_text(" ", strip=True))

            if match:
                times.append(normalize_time(match.group(1)))

    if not times:
        raise ScrapeError(f"発車時刻が見つかりません: {url}")

    return times


def build_rows(target: TimetableTarget, timeout: float) -> list[tuple[str, bool]]:
    rows: list[tuple[str, bool]] = []

    for source in target.sources:
        rows.extend((time, source.has_route_marker) for time in scrape_ekitan_times(source.url, timeout))

    rows.sort(key=time_sort_key)
    return rows


def read_existing_csv(path: Path) -> list[tuple[str, bool]]:
    if not path.exists():
        return []

    rows: list[tuple[str, bool]] = []

    with path.open(newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.reader(csvfile)

        for row in reader:
            if not row:
                continue

            rows.append((normalize_time(row[0].strip()), len(row) > 1 and row[1].strip() == "1"))

    return rows


def write_csv(path: Path, rows: Iterable[tuple[str, bool]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with NamedTemporaryFile("w", newline="", encoding="utf-8", dir=path.parent, delete=False) as tmp_file:
        writer = csv.writer(tmp_file, lineterminator="\n")
        writer.writerows((time, "1" if has_route_marker else "0") for time, has_route_marker in rows)
        tmp_path = Path(tmp_file.name)

    tmp_path.replace(path)


def check_or_write(targets: Iterable[TimetableTarget], output_dir: Path, timeout: float, check: bool) -> int:
    changed_files: list[str] = []

    for target in targets:
        output_path = output_dir / target.output_name
        rows = build_rows(target, timeout)
        existing_rows = read_existing_csv(output_path)

        if check:
            if rows != existing_rows:
                changed_files.append(target.output_name)
            continue

        write_csv(output_path, rows)
        print(f"updated {output_path} ({len(rows)} rows)")

    if check and changed_files:
        print("CSV が最新の取得結果と一致しません:")
        for filename in changed_files:
            print(f"- {filename}")
        return 1

    if check:
        print("CSV は最新の取得結果と一致しています。")

    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="東武バスの駅探時刻表を取得してアプリ用 CSV を更新する。")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--check", action="store_true", help="CSV を書き換えず、取得結果との差分有無だけを検査する。")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])

    try:
        return check_or_write(build_targets(), args.output_dir, args.timeout, args.check)
    except (requests.RequestException, ScrapeError) as error:
        print(f"scraping failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
