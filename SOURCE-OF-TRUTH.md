# SOURCE-OF-TRUTH（真源约定）

## 运行 / 真源目录

- **Runtime / 真源运行目录**: `D:\MuHaoradio\resources\app`
  - Electron **实际加载这里**。改功能、修 bug、跑 `npm run check` 都以这里为准。
- **开发镜像**: `C:\Users\MUHAO\Desktop\新建文件夹\muhaoradio`
  - 仅作对照 / 备份式镜像，**不是** Electron 加载路径。

## 改动规则（强制）

1. **改功能先改真源 app**（`D:\MuHaoradio\resources\app`）。
2. 在真源验证通过后，再同步到桌面镜像。
3. **不要只改镜像**——只改桌面目录不会影响正在运行的应用。
4. CSS / JS 改完后必须 **托盘彻底退出 Mineradio → 再开**（只关窗口不够，Electron 会缓存旧脚本）。

## bak 策略

- 包内 **不再** 放 `*.bak*`。
- 历史 bak 已外置到：`D:\MuHaoradio\_trash-bak-*`（例如 `_trash-bak-20260914-204952`）。
- `D:\MuHaoradio\bak-*` 正式备份目录保留，不要随意删除。

## 如何同步镜像

任选其一：

```bat
robocopy "D:\MuHaoradio\resources\app" "C:\Users\MUHAO\Desktop\新建文件夹\muhaoradio" /E /XD node_modules vendor .git _trash* /XF *.bak*
```

或只拷改过的文件：

```bat
copy /Y "D:\MuHaoradio\resources\app\path\to\file" "C:\Users\MUHAO\Desktop\新建文件夹\muhaoradio\path\to\file"
```

## 质量门禁（阶段 1→2）

在真源目录执行：

```bat
cd /d D:\MuHaoradio\resources\app
npm run check
```

包含：

- `test:contracts` — 进场 / 概念版推荐契约
- `check:size` — 巨石文件体积 WARN/FAIL
- `check:monolith` — 禁止把已迁出逻辑塞回 index.css / server.js

## 巨石纪律（文档规则）

- 新首页进场 / Hero CSS → `public/css/muhao-home-hero.css`（或新的 `muhao-*.css`），禁止往 `index.css` 塞大段。
- 禁止把 `home-card-sheen` / `bindHomeCardPointerGloss` 重新塞回进场路径（entrance-only 政策）。
- `/api/kugou-lite/recommendations` 必须委托 `handleLiteRecommendations`，禁止在 `server.js` 路由处写巨型内联 handler。
