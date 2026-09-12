# MuHaoradio 两份代码的同步约定

> 建立日期：2026-09-13
> 背景：同一个项目在本机存在两份代码，长期靠「手工两处改」，已造成多次混乱（含一次失败实验残留）。
> 本文档是**唯一权威约定**，接手前必读。

---

## 1. 两份代码是什么

| | 路径 | 角色 |
|---|---|---|
| **运行副本** | `D:\MuHaoradio\resources\app` | 实际跑的就是它。改完必须「托盘彻底退出 → 重开」才生效 |
| **项目本体** | 本仓库根目录（即本文件所在目录） | 仓库主体：git 历史、34 个测试、82 个工具脚本、20 个检查脚本、打包配置、文档、图片源料 |

- 运行副本**没有 git**，**不能打包**，`package.json` 是打包后被裁剪的
- 项目本体**连着自己的 GitHub 仓库**：`origin = https://github.com/muhaoyeah/MuHaoradio.git`，上游是 `XxHuberrr/Mineradio`

---

## 2. 约定（重要）

1. **改代码可以只改运行副本**（这样最快看到效果）。
2. **改完必须同步回项目本体** —— 跑一次：
   ```
   python tools/sync-install-to-mirror.py            # 先预演，看会动哪些文件
   python tools/sync-install-to-mirror.py --apply    # 确认后执行
   ```
   脚本会自动备份被覆盖的镜像文件到仓库同级的 `muhaoradio-backup-<时间戳>\` 目录。

3. **永远不要反向覆盖**。项目本体的 `package.json`、`tests/`、`tools/`、`scripts/`、`docs/`、`source-images/` 是它独有的，用运行副本覆盖会**打掉打包能力和全部测试**。

4. **不要整包 `xcopy` / `robocopy /MIR`**。`/MIR` 会删掉项目本体独有的 177 个文件。

---

## 3. 试验性改动的规矩

历史上「首页猜你喜欢入口」那批改动是**失败实验**，2026-09-12 20:51 被整体回滚
（见 `D:\MuHaoradio\bak-before-full-restore-20260912-205148`）。

教训：**实验性改动不要直接改在运行副本里散着**。要么先在项目本体开分支，要么改完立刻同步 + 记录，
否则下一个人分不清哪些是成果、哪些是残留。

---

## 4. 同步后自检

```bash
# 1) 模块加载器有没有引用不存在的文件（历史坑）
grep -oE "js/modules/[0-9a-zA-Z/._-]+\.js" public/js/index-loader.js \
  | while read m; do [ -f "public/$m" ] || echo "悬空引用: $m"; done

# 2) 两份共同文件是否一致（应只剩 package.json 和 .env 允许不同）
python tools/verify-two-copies.py
```

---

## 5. 一句话给接手的助手

**先确认你改的是哪一份；改完跑同步脚本；不要用运行副本覆盖项目本体的 `package.json` 和工具目录。**
