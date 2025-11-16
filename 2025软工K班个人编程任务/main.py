# -*- coding: utf-8 -*-
import os
import re
import time
import random
import requests
import xmltodict
import pandas as pd
from collections import Counter
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# === 配置 ===
SAVE_DIR = "danmaku_data"
os.makedirs(SAVE_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://search.bilibili.com/",
    "Origin": "https://search.bilibili.com",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Cookie": "buvid3=12345678-FakeCookie; CURRENT_FNVAL=4048;",
}


# === 工具函数 ===
def clean_text(text):
    """清理文本中的空白字符（包括换行、制表符等）"""
    return re.sub(r"\s+", "", text)
大模型

# === 视频与弹幕获取函数 ===
def get_cid(bvid):
    """根据 BV 号获取对应的 cid 与视频标题"""
    url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    if data["code"] == 0:
        return data["data"]["cid"], data["data"]["title"]
    raise ValueError(f"获取视频信息失败: {data.get('message')}")


def fetch_danmaku(bvid):
    """下载指定视频的弹幕内容，返回弹幕列表与标题"""
    cid, title = get_cid(bvid)
    danmaku_url = f"https://comment.bilibili.com/{cid}.xml"
    resp = requests.get(danmaku_url, headers=HEADERS)
    parsed = xmltodict.parse(resp.content)

    danmaku_texts = []
    danmaku_entries = parsed.get("i", {}).get("d", [])
    if isinstance(danmaku_entries, str):
        danmaku_texts = [danmaku_entries]
    else:
        for entry in danmaku_entries:
            text = entry.get("#text", "").strip()
            if text:
                danmaku_texts.append(text)

    return danmaku_texts, title


def get_search_bvids(keyword, max_videos=360):
    """通过关键词搜索获取最多 max_videos 个视频的 BV 号"""
    bvid_list = []
    current_page = 1

    while len(bvid_list) < max_videos:
        url = (
            f"https://api.bilibili.com/x/web-interface/search/type"
            f"?search_type=video&keyword={keyword}&page={current_page}"
        )
        response = requests.get(url, headers=HEADERS)

        if response.status_code == 412:
            print("⚠️ 触发反爬机制（HTTP 412），请稍后再试或更换网络环境。")
            break
        if response.status_code != 200:
            print(f"请求异常：HTTP {response.status_code}")
            break

        try:
            json_data = response.json()
        except Exception:
            print("⚠️ 返回内容不是有效 JSON，可能已被风控。")
            break

        if json_data.get("code") != 0:
            print("接口报错：", json_data.get("message"))
            break

        video_results = json_data["data"].get("result", [])
        if not video_results:
            break

        for video in video_results:
            if len(bvid_list) >= max_videos:
                break
            bvid = video.get("bvid")
            if bvid and bvid not in bvid_list:
                bvid_list.append(bvid)

        print(f"已抓取第 {current_page} 页，当前累计 {len(bvid_list)} 个视频...")
        current_page += 1
        time.sleep(random.uniform(0.4, 0.8))

        if current_page > 30:
            break

    final_count = len(bvid_list)
    print(f"搜索完成，共获取到 {final_count} 个视频。")
    return bvid_list[:max_videos]


# === 主流程 ===
def main():
    keyword = input("请输入要搜索的关键词（例如：LLM、大模型）: ").strip()
    if not keyword:
        print("关键词不能为空，程序退出。")
        return

    print(f"正在抓取与 '{keyword}' 相关的前 360 个视频的弹幕数据……")

    bvids = get_search_bvids(keyword, max_videos=360)
    if not bvids:
        print("未检索到任何视频，任务终止。")
        return

    all_danmaku = []
    total_videos = len(bvids)

    for idx, bvid in enumerate(bvids, start=1):
        file_path = os.path.join(SAVE_DIR, f"{idx:03d}_{bvid}.xlsx")

        if os.path.exists(file_path):
            df_cached = pd.read_excel(file_path)
            danmaku_batch = df_cached["弹幕"].tolist()
            print(f"{idx:03d}: 已缓存，跳过下载")
        else:
            try:
                raw_danmaku, video_title = fetch_danmaku(bvid)
                danmaku_batch = [clean_text(d) for d in raw_danmaku if d.strip()]
                df_save = pd.DataFrame(danmaku_batch, columns=["弹幕"])
                df_save.to_excel(file_path, index=False)
                print(f"{idx:03d}: {video_title}（共 {len(danmaku_batch)} 条弹幕）")
            except Exception as err:
                print(f"{idx:03d}: 视频 {bvid} 下载失败：{err}")
                continue

        all_danmaku.extend(danmaku_batch)
        time.sleep(random.uniform(0.4, 0.8))

    total_danmaku_count = len(all_danmaku)
    print(f"\n全部完成！总计收集 {total_danmaku_count} 条弹幕。")

    if total_danmaku_count == 0:
        print("没有获取到任何弹幕，程序结束。")
        return

    # 高频弹幕统计
    frequency_counter = Counter(all_danmaku)
    top8 = frequency_counter.most_common(8)
    summary_df = pd.DataFrame(top8, columns=["弹幕内容", "出现次数"])
    output_file = f"{keyword}_danmaku_summary.xlsx"
    summary_df.to_excel(output_file, index=False)
    print(f"高频弹幕统计已保存至：{output_file}")

    # 生成词云
    font_path = r"C:\Windows\Fonts\simhei.ttf"
    wordcloud_obj = WordCloud(
        width=800, height=600,
        background_color="white",
        font_path=font_path,
        max_words=300
    ).generate(" ".join(all_danmaku))

    plt.figure(figsize=(10, 7.5))
    plt.imshow(wordcloud_obj, interpolation="bilinear")
    plt.axis("off")
    plt.tight_layout()
    plt.show()
    print("词云图像已生成并显示。")


if __name__ == "__main__":
    main()
