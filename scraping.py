import requests
import csv
import datetime
from bs4 import BeautifulSoup


Debug = 0

#スクレイピングするリスト
scraping_list = [
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d1?view=list&dw=0","ToEdogawadai1Weekday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d1?view=list&dw=1","ToEdogawadai1Saturday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d1?view=list&dw=2","ToEdogawadai1Sunday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d1?dw=0&view=list","ToEdogawadai2Weekday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d1?dw=1&view=list","ToEdogawadai2Saturday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d1?dw=2&view=list","ToEdogawadai2Sunday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1011669/d2?view=list&dw=0","ToKashiwaWeekday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1011669/d2?view=list&dw=1","ToKashiwaSaturday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1011669/d2?view=list&dw=2","ToKashiwaSunday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d2?dw=0&view=list","ToKashiwanoha1Weekday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d2?dw=1&view=list","ToKashiwanoha1Saturday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003068/d2?dw=2&view=list","ToKashiwanoha1Sunday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d2?view=list&dw=0","ToKashiwanoha2Weekday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d2?view=list&dw=1","ToKashiwanoha2Saturday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003083/d2?view=list&dw=2","ToKashiwanoha2Sunday.csv","0"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003102/d1?view=list&dw=0","ToKashiwanoha3Weekday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003102/d1?view=list&dw=1","ToKashiwanoha3Saturday.csv","1"],
["https://ekitan.com/timetable/route-bus/company/5083/1015573/1003102/d1?view=list&dw=2","ToKashiwanoha3Sunday.csv","1"],
]

#結合するファイルのリスト
combine_list = [
["ToEdogawadai1Weekday.csv","ToEdogawadai2Weekday.csv","ToEdogawadaiWeekday.csv"],
["ToEdogawadai1Saturday.csv","ToEdogawadai2Saturday.csv","ToEdogawadaiSaturday.csv"],
["ToEdogawadai1Sunday.csv","ToEdogawadai2Sunday.csv","ToEdogawadaiSunday.csv"],
["ToKashiwanoha1Weekday.csv","ToKashiwanoha2Weekday.csv","ToKashiwanoha4Weekday.csv"],
["ToKashiwanoha1Saturday.csv","ToKashiwanoha2Saturday.csv","ToKashiwanoha4Saturday.csv"],
["ToKashiwanoha1Sunday.csv","ToKashiwanoha2Sunday.csv","ToKashiwanoha4Sunday.csv"],
["ToKashiwanoha3Weekday.csv","ToKashiwanoha4Weekday.csv","ToKashiwanohaWeekday.csv"],
["ToKashiwanoha3Saturday.csv","ToKashiwanoha4Saturday.csv","ToKashiwanohaSaturday.csv"],
["ToKashiwanoha3Sunday.csv","ToKashiwanoha4Sunday.csv","ToKashiwanohaSunday.csv"],
]

def scrape_bus_departure_times_new_structure(url):
    """
    指定されたURLから、新しいHTML構造に基づきバスの発車時刻をスクレイピングする関数。

    Args:
        url (str): スクレイピング対象のウェブサイトURL。

    Returns:
        dict: 発車時刻を時間帯ごとに格納した辞書。
              例: {'06時': ['06:42'], '07時': ['07:17', '07:38'], ...}
              スクレイピングに失敗した場合はNoneを返す。
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        departure_times = {}

        # 時間帯ごとのブロックを抽出
        hour_blocks = soup.find_all('div', class_='search-result-data ek-search-result ek-hour_line ek-hour_list')
        if Debug: print("hour_blocks の数:", len(hour_blocks)) # 時間帯ブロックがいくつ取得できているか確認
        if not hour_blocks:
            print("エラー：時間帯ブロック (div.search-result-data.ek-search-result.ek-hour_line.ek-hour_list) が見つかりません。HTML構造が変更された可能性があります。")
            return None
        
        max_hour = 0
        for block in hour_blocks:
            # 時間帯（例: 06時）を取得
            time_hour_element = block.find('p', class_='time-hour')
            if time_hour_element:
                hour = time_hour_element.text.strip()
                if Debug: print(f"時間帯: {hour}") # 取得できた時間帯を出力
                if max_hour <= int(hour[:-1]):
                    max_hour = int(hour[:-1])
                else:
                    break
                departure_times[hour] = [] # 時間帯をキーとして、時刻リストを初期化
            else:
                print("警告：時間帯 (p.time-hour) が見つかりません。この時間帯の時刻データはスキップします。")
                continue # 時間帯が取得できない場合は、このブロックをスキップ

            # 各時間帯の発車時刻をリストとして取得
            departure_links = block.find_all('a') # ブロック内のすべての <a> タグを取得
            if Debug: print(f"  {hour} のリンク数:", len(departure_links)) # 各時間帯ブロック内のリンク数を確認
            for link in departure_links:
                dep_time_span = link.find('span', class_='dep-time') # <a> タグ内の <span>.dep-time を探す
                if dep_time_span:
                    time_text = dep_time_span.text.split(' ')[0] # 時刻と行き先がスペースで区切られているので、時刻部分のみ抽出
                    if Debug: print(f"    時刻データ: {time_text}") # 抽出された時刻データを出力
                    departure_times[hour].append(time_text) # 時刻リストに追加
                else:
                    print("警告：発車時刻 (span.dep-time) が見つかりません。このリンクの時刻データはスキップします。")

        return departure_times

    except requests.exceptions.RequestException as e:
        print(f"エラーが発生しました: {e}")
        return None

def save_departure_times_to_csv(departure_data, filename, flag):
    """
    発車時刻データをCSVファイルに、発車時刻のみを保存する関数（ヘッダー、時間帯なし）。

    Args:
        departure_data (dict): 発車時刻データ (scrape_bus_departure_times 関数の返り値)。
        filename (str): 保存するCSVファイル名 (デフォルト: "bus_departure_times_only_times.csv")。
    """
    if not departure_data:
        print("保存するデータがありません。")
        return

    try:
        with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
            csv_writer = csv.writer(csvfile)

            # データ行を書き込み (ヘッダーなし、時間帯なし、時刻のみ)
            for hour, times in departure_data.items():
                for time in times: # 各時間帯の時刻リストを処理
                    csv_writer.writerow([time,flag]) # 時刻のみをCSVファイルの各行に書き込む

        if Debug: print(f"発車時刻データをCSVファイル '{filename}' に保存しました (発車時刻のみ)。")

    except Exception as e:
        print(f"CSVファイルへの保存中にエラーが発生しました: {e}")

import csv
import datetime

def combine_and_sort_csv_with_other_data(csv_file1, csv_file2, output_csv_file):
    """
    2つのCSVファイルからデータを読み込み、結合して時刻順（1列目）にソートし、
    他の情報も保持したまま新しいCSVファイルに保存する関数。

    Args:
        csv_file1 (str): 1つ目のCSVファイル名。
        csv_file2 (str): 2つ目のCSVファイル名。
        output_csv_file (str): 出力先のCSVファイル名 (デフォルト: "combined_sorted_data.csv")。
    """
    combined_data = []

    # CSVファイルからデータを読み込む関数
    def read_csv_data(filename):
        data = []
        try:
            with open(filename, 'r', encoding='utf-8-sig') as file:
                csv_reader = csv.reader(file)
                for row in csv_reader:
                    if row:
                        data.append(row)
        except FileNotFoundError:
            print(f"エラー: ファイル '{filename}' が見つかりません。")
        except Exception as e:
            print(f"エラー: ファイル '{filename}' の読み込み中にエラーが発生しました: {e}")
        return data

    # 1つ目のCSVファイルからデータを読み込む
    data1 = read_csv_data(csv_file1)
    if data1:
        combined_data.extend(data1)

    # 2つ目のCSVファイルからデータを読み込む
    data2 = read_csv_data(csv_file2)
    if data2:
        combined_data.extend(data2)

    # 時刻でソートするためのキー関数
    def sort_key(row):
        time_str = row[0].strip()
        try:
            time_obj = datetime.datetime.strptime(time_str, '%H:%M').time()
            return time_obj
        except ValueError:
            # 時刻形式でない場合は、比較可能な何かを返す (例: 遅い時刻)
            return datetime.time.max

    # 結合したデータを時刻順にソート
    combined_data.sort(key=sort_key)

    # ソート済みのデータを新しいCSVファイルに保存
    try:
        with open(output_csv_file, 'w', newline='', encoding='utf-8-sig') as outfile:
            #outfile.write(b'\xef\xbb\xbf')
            csv_writer = csv.writer(outfile)
            csv_writer.writerows(combined_data) # writerows を使用してすべての行を書き込む
        print(f"{csv_file1} and {csv_file2} combined to '{output_csv_file}' successfully")

    except Exception as e:
        print(f"CSVファイル '{output_csv_file}' への書き込み中にエラーが発生しました: {e}")






if __name__ == "__main__":
    for i in range(len(scraping_list)):
        url = scraping_list[i][0]
        filename = scraping_list[i][1]
        departure_data = scrape_bus_departure_times_new_structure(url)

        if departure_data:
            # CSVファイルに保存 (発車時刻のみ)
            save_departure_times_to_csv(departure_data,filename,scraping_list[i][2])
            print(f"{filename} success") # コンソール出力も変更
        else:
            print(f"{filename} failed")

    #ファイルの結合
    for i in range(len(combine_list)):
        combine_and_sort_csv_with_other_data(combine_list[i][0], combine_list[i][1], combine_list[i][2])
    print("【CSVファイル結合・ソート処理完了】") # 処理完了メッセージ
