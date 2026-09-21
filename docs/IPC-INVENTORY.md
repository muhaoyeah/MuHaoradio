# MuHaoradio IPC 清单（阶段 3）

生成时间: 2026-09-14T13:31:06.988Z
扫描根目录: `D:\MuHaoradio\resources\app`

## 摘要

- main 注册 (ipcMain.handle/on): **76**
- preload/桥 调用 (invoke/send): **75**
- 两边都有: **75**
- 仅 main（可能未暴露或动态名）: **1**
- 仅 preload（可能缺 handler 或字符串拼出来）: **0**

## 两边对齐的通道

- `desktop-window-close`
- `desktop-window-exit-fullscreen-windowed`
- `desktop-window-get-close-behavior`
- `desktop-window-get-state`
- `desktop-window-minimize`
- `desktop-window-restore`
- `desktop-window-set-close-behavior`
- `desktop-window-toggle-fullscreen`
- `desktop-window-toggle-maximize`
- `kugou-concept-clear-login`
- `kugou-concept-open-login`
- `kugou-music-clear-login`
- `kugou-music-open-login`
- `mineradio-cache-choose-directory`
- `mineradio-cache-get-settings`
- `mineradio-cache-read-lyric`
- `mineradio-cache-set-settings`
- `mineradio-cache-write-lyric`
- `mineradio-current-fx-autosave-read-sync`
- `mineradio-current-fx-autosave-save`
- `mineradio-current-fx-autosave-save-sync`
- `mineradio-desktop-lyrics-move-by`
- `mineradio-desktop-lyrics-set-dragging`
- `mineradio-desktop-lyrics-set-enabled`
- `mineradio-desktop-lyrics-set-hot-bounds`
- `mineradio-desktop-lyrics-set-lock-state`
- `mineradio-desktop-lyrics-set-pointer-capture`
- `mineradio-desktop-lyrics-update`
- `mineradio-export-json-file`
- `mineradio-export-login-cookie`
- `mineradio-full-desktop-icon-shields`
- `mineradio-full-desktop-pointer-route`
- `mineradio-full-desktop-request-keyboard-focus`
- `mineradio-full-desktop-set-icons-visible`
- `mineradio-full-desktop-set-software-lock`
- `mineradio-get-gpu-diagnostics`
- `mineradio-hotkeys-configure-global`
- `mineradio-import-json-file`
- `mineradio-local-library-authorize`
- `mineradio-local-library-import`
- `mineradio-local-library-list`
- `mineradio-local-library-lyric`
- `mineradio-login-easter-egg-reset`
- `mineradio-login-easter-egg-status`
- `mineradio-login-easter-egg-unlock`
- `mineradio-memory-configure-auto`
- `mineradio-memory-get-snapshot`
- `mineradio-memory-purge-system`
- `mineradio-memory-trim-app`
- `mineradio-open-update-page`
- `mineradio-restart-app`
- `mineradio-wallpaper-engine-activate-dwm-surface`
- `mineradio-wallpaper-engine-capture-result`
- `mineradio-wallpaper-engine-choose-directory`
- `mineradio-wallpaper-engine-choose-project-file`
- `mineradio-wallpaper-engine-glass-surface`
- `mineradio-wallpaper-engine-list`
- `mineradio-wallpaper-engine-open-project-details`
- `mineradio-wallpaper-engine-pointer-activity`
- `mineradio-wallpaper-engine-prepare-glass-capture`
- `mineradio-wallpaper-engine-project-details`
- `mineradio-wallpaper-engine-remove-directory`
- `mineradio-wallpaper-engine-runtime-status`
- `mineradio-wallpaper-engine-start-scene`
- `mineradio-wallpaper-engine-stop-scene`
- `mineradio-wallpaper-get-status`
- `mineradio-wallpaper-set-enabled`
- `mineradio-wallpaper-update`
- `netease-music-clear-login`
- `netease-music-open-login`
- `qishui-music-clear-login`
- `qq-music-clear-login`
- `qq-music-open-login`
- `spotify-music-clear-login`
- `spotify-music-open-login`

## 仅 main

- `kugou-lite-health` — desktop/main.js:handle

## 仅 preload


## 完整 main 注册明细

| channel | kind | file |
|---|---|---|
| `desktop-window-close` | handle | `desktop/main.js` |
| `desktop-window-exit-fullscreen-windowed` | handle | `desktop/main.js` |
| `desktop-window-get-close-behavior` | handle | `desktop/main.js` |
| `desktop-window-get-state` | handle | `desktop/main.js` |
| `desktop-window-minimize` | handle | `desktop/main.js` |
| `desktop-window-restore` | handle | `desktop/main.js` |
| `desktop-window-set-close-behavior` | handle | `desktop/main.js` |
| `desktop-window-toggle-fullscreen` | handle | `desktop/main.js` |
| `desktop-window-toggle-maximize` | handle | `desktop/main.js` |
| `kugou-concept-clear-login` | handle | `desktop/main.js` |
| `kugou-concept-open-login` | handle | `desktop/main.js` |
| `kugou-lite-health` | handle | `desktop/main.js` |
| `kugou-music-clear-login` | handle | `desktop/main.js` |
| `kugou-music-open-login` | handle | `desktop/main.js` |
| `mineradio-cache-choose-directory` | handle | `desktop/main.js` |
| `mineradio-cache-get-settings` | handle | `desktop/main.js` |
| `mineradio-cache-read-lyric` | handle | `desktop/main.js` |
| `mineradio-cache-set-settings` | handle | `desktop/main.js` |
| `mineradio-cache-write-lyric` | handle | `desktop/main.js` |
| `mineradio-current-fx-autosave-read-sync` | on | `desktop/main.js` |
| `mineradio-current-fx-autosave-save` | handle | `desktop/main.js` |
| `mineradio-current-fx-autosave-save-sync` | on | `desktop/main.js` |
| `mineradio-desktop-lyrics-move-by` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-set-dragging` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-set-enabled` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-set-hot-bounds` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-set-lock-state` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-set-pointer-capture` | handle | `desktop/main.js` |
| `mineradio-desktop-lyrics-update` | handle | `desktop/main.js` |
| `mineradio-export-json-file` | handle | `desktop/main.js` |
| `mineradio-export-login-cookie` | handle | `desktop/main.js` |
| `mineradio-full-desktop-icon-shields` | on | `desktop/main.js` |
| `mineradio-full-desktop-pointer-route` | on | `desktop/main.js` |
| `mineradio-full-desktop-request-keyboard-focus` | handle | `desktop/main.js` |
| `mineradio-full-desktop-set-icons-visible` | handle | `desktop/main.js` |
| `mineradio-full-desktop-set-software-lock` | handle | `desktop/main.js` |
| `mineradio-get-gpu-diagnostics` | handle | `desktop/main.js` |
| `mineradio-hotkeys-configure-global` | handle | `desktop/main.js` |
| `mineradio-import-json-file` | handle | `desktop/main.js` |
| `mineradio-local-library-authorize` | handle | `desktop/main.js` |
| `mineradio-local-library-import` | handle | `desktop/main.js` |
| `mineradio-local-library-list` | handle | `desktop/main.js` |
| `mineradio-local-library-lyric` | handle | `desktop/main.js` |
| `mineradio-login-easter-egg-reset` | handle | `desktop/main.js` |
| `mineradio-login-easter-egg-status` | handle | `desktop/main.js` |
| `mineradio-login-easter-egg-unlock` | handle | `desktop/main.js` |
| `mineradio-memory-configure-auto` | handle | `desktop/main.js` |
| `mineradio-memory-get-snapshot` | handle | `desktop/main.js` |
| `mineradio-memory-purge-system` | handle | `desktop/main.js` |
| `mineradio-memory-trim-app` | handle | `desktop/main.js` |
| `mineradio-open-update-page` | handle | `desktop/main.js` |
| `mineradio-restart-app` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-activate-dwm-surface` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-capture-result` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-choose-directory` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-choose-project-file` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-glass-surface` | on | `desktop/main.js` |
| `mineradio-wallpaper-engine-list` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-open-project-details` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-pointer-activity` | on | `desktop/main.js` |
| `mineradio-wallpaper-engine-prepare-glass-capture` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-project-details` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-remove-directory` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-runtime-status` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-start-scene` | handle | `desktop/main.js` |
| `mineradio-wallpaper-engine-stop-scene` | handle | `desktop/main.js` |
| `mineradio-wallpaper-get-status` | handle | `desktop/main.js` |
| `mineradio-wallpaper-set-enabled` | handle | `desktop/main.js` |
| `mineradio-wallpaper-update` | handle | `desktop/main.js` |
| `netease-music-clear-login` | handle | `desktop/main.js` |
| `netease-music-open-login` | handle | `desktop/main.js` |
| `qishui-music-clear-login` | handle | `desktop/main.js` |
| `qq-music-clear-login` | handle | `desktop/main.js` |
| `qq-music-open-login` | handle | `desktop/main.js` |
| `spotify-music-clear-login` | handle | `desktop/main.js` |
| `spotify-music-open-login` | handle | `desktop/main.js` |

## 减债建议（下一步）

1. 优先核对「仅 preload」通道：缺 handler 会导致 invoke 挂死。
2. 「仅 main」里若确认无调用，可标 deprecated，别急着删。
3. 新 IPC 一律：`desktop/*-ipc.js` 注册 + preload 白名单，不进 `main.js` 巨石。
4. ESM 试点：挑一个无循环依赖的 `desktop/*.js`（纯工具模块），不要动 renderer 全局脚本加载链。
