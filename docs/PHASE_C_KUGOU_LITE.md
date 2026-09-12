# Phase C — 酷狗概念版 search/play/lyric 自测

## 前置
1. 安装目录已同步 Phase C 代码（D:\MuHaoradio\resources\app）。
2. 完整退出并重新打开 MuHaoradio（让 server.js + 前端模块生效）。
3. 登录：账号弹窗 -> 酷狗概念版 -> 概念版 App 扫码，直到显示已登录。

## 验证步骤（周杰伦 VIP）
1. 搜索模式点「概念」（或 All；已登录概念版时 All 会优先走 lite，不再打标准 KG）。
2. 搜索：周杰伦 或 晴天。
3. 结果来源标签应为「概念」；会员曲可能标 VIP。
4. 点击播放应能出声。未登录会 toast 提示登录概念版（非静默失败）。
5. 歌词面板应能拉到 LRC。

## 接口自测（可选）
- GET http://127.0.0.1:3000/api/kugou-lite/health -> 200 platform=lite
- GET /api/kugou-lite/search?keywords=周杰伦&limit=5
- GET /api/kugou-lite/song/url?hash=...&albumId=...&albumAudioId=...&quality=exhigh （需会话）
- 无会话 song/url -> error=KUGOU_LITE_LOGIN_REQUIRED

## 注意
- 标准 KG / 网易云 / QQ 未改；概念版 provider=kugou-lite。
- 会话文件 .kugou-lite-session.json（gitignore），status 不回传 token。
