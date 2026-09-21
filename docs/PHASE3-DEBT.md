# MuHaoradio 阶段 3 减债说明

## 已完成：IPC 清单

- 桌面：`MuHaoradio-IPC清单.md`
- 仓库：`docs/IPC-INVENTORY.md`
- 重扫：在 `resources\app` 执行 `npm run docs:ipc`

### 摘要

- main 注册 76，preload 75，两边对齐 75
- **仅 main 1 个**：`kugou-lite-health`（主进程健康检查，当前未进 preload，属预期；需要前端探针时再白名单暴露）
- **仅 preload 0**：无悬空 invoke

### 新 IPC 规则（立刻生效）

1. 新通道写在 `desktop/*-ipc.js`（或现有专用模块），不要继续堆进 `main.js` 巨石中段
2. preload 必须同步白名单；改完跑 `npm run docs:ipc`，`仅 preload` 必须保持 0
3. 删除通道前先搜 renderer + preload，确认无调用

## ESM 试点（先文档、后动手）

**不要**给整个 app 开 `"type":"module"`，会打断现有 CommonJS `require` 链。

试点候选（纯工具、依赖少）：

- `desktop/credential-crypto.js`（约 207 行，被 session/main 使用）— **先别改**，安全路径，等有双测再动
- 更稳：新建 `desktop/lib/*.mjs` 只给新代码用，旧代码继续 CJS `require`

验收标准：

1. `node --check` 通过
2. 冷启动 + 概念版登录态仍在
3. `npm run check` 全绿

## 上游 cherry-pick 流程

上游：Mineradio（参考历史 2.1→2.2 韧性合并）

1. 只挑「登录韧性 / 播放恢复 / API 超时」类提交，**不**整文件覆盖
2. 先备份到 `D:\MuHaoradio\_trash-bak-*` 外置目录（不要再丢进包内）
3. 改完：`node --check` → `npm run check` → 冒烟清单 8 项
4. 同步镜像：`新建文件夹\muhaoradio`

## 建议下一刀（需你点头再改代码）

- A. 把 `kugou-lite-health` 暴露到 preload（仅诊断用）
- B. 从 `index.css` 抽出进场动画到 `muhao-home-entrance.css`（减巨石，需回归进场）
- C. 暂停减债，先做产品功能
