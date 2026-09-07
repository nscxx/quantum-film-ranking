# 金龙登顶冠军动效

主动画改为 `public/video/champion-dragon.mp4`（金龙飞起特效 v5，1920×1080，24 fps，约 8 秒）。城市底仍用本目录 `city.png`。省名由页面文字层注入。

这份 MP4 是 H.264 黑底，没有真正的 alpha 通道。播放时用 `mix-blend-mode: screen` 把黑底滤掉，这是直播间金龙特效的常用做法。

正式冠军事件：视频连播两遍，随后在最后一帧停留 4 秒，总时长 20 秒。`/preview/champion` 可循环、慢放、定格、拖动时间轴，并切换省名。
