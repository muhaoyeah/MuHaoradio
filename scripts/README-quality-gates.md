# Quality gates（质量门禁）

## 一键跑

```bat
cd /d D:\MuHaoradio\resources\app
npm run check
```

等价于：

```bat
npm run test:contracts
npm run check:size
npm run check:monolith
```

## 脚本说明

| script | 文件 | 行为 |
|--------|------|------|
| `test:contracts` | `tests/home-entrance-contract.test.js` + `tests/kugou-lite-recommendations-contract.test.js` | 进场 / 推荐契约 |
| `check:size` | `scripts/check-monolith-size.js` | 巨石体积：WARN 不失败；超 RED 才 exit 1 |
| `check:monolith` | `scripts/check-no-monolith-growth.js` | 禁止 sheen 回流；hero CSS 必须存在并被 index.html 引用；recommendations 路由须委托 |

## server.js 路由纪律

`/api/kugou-lite/recommendations` 必须委托 `handleLiteRecommendations`。
本门禁检查委托符号存在，并以 SOURCE-OF-TRUTH.md 文档约束「禁止巨型内联 handler」。
