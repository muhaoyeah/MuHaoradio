#!/usr/bin/env python3
"""MuHaoradio 单向同步：安装目录 -> 桌面镜像

用法:
    python tools/sync-install-to-mirror.py            # 预演（只列出将要复制的文件，不动手）
    python tools/sync-install-to-mirror.py --apply    # 真正执行

设计原则（务必保持）:
  1. 只增不删 —— 绝不删除镜像里的任何文件（镜像独有 177 个工程资产必须保住）
  2. 单向 —— 只有「安装目录 -> 镜像」，不反向
  3. 不碰 package.json —— 镜像是完整源（含 electron-builder 配置），安装目录那份是打包后裁剪版
  4. 不碰 tests/ tools/ scripts/ docs/ source-images/ —— 这些是镜像独有的家当
  5. 跳过 .bak* / 报告 txt / node_modules / dist / output / backups / .git
"""
import os
import shutil
import sys
import hashlib
import datetime

SRC = os.environ.get("MUHAORADIO_INSTALL_DIR", r"D:\MuHaoradio\resources\app")
# 目标固定为本脚本所在仓库的根目录（tools/ 的上一级），不写死绝对路径
DST = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 需要同步的目录（镜像里没有对应独有资产的才放进来）
SYNC_DIRS = ["desktop", "public", "cuefield", "qishui-auth-v6", "qishui-audio-decryptor", "vendor"]

# 需要同步的根级文件
SYNC_FILES = [
    "server.js", "kugou-api.js", "qishui-api.js", "spotify-api.js",
    "qq-vip-api.js", "dj-analyzer.js", "qishui-auth-v6.js", "qishui-qr-login.js",
]

# 绝对不动的文件
BLOCK_FILES = {"package.json", "package-lock.json", ".npmrc", ".gitattributes", ".env"}
# 不动的子目录（镜像独有或体积无关）
BLOCK_DIRS = {"node_modules", ".git", "dist", "output", "backups", "tests", "tools",
              "scripts", "source-images", "docs", "verification", ".playwright-cli"}


def md5(p):
    with open(p, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def skip(name):
    return (name.startswith("_") and name.endswith(".txt")) or ".bak" in name or name.endswith((".log", ".tmp"))


def collect():
    """返回 [(相对路径, 状态)]，状态为 '新增' 或 '更新'"""
    todo = []
    for rel_dir in SYNC_DIRS:
        base = os.path.join(SRC, rel_dir)
        if not os.path.isdir(base):
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in BLOCK_DIRS]
            for fn in filenames:
                if skip(fn) or fn in BLOCK_FILES:
                    continue
                s = os.path.join(dirpath, fn)
                rel = os.path.relpath(s, SRC)
                d = os.path.join(DST, rel)
                if not os.path.exists(d):
                    todo.append((rel, "新增"))
                elif md5(s) != md5(d):
                    todo.append((rel, "更新"))
    for fn in SYNC_FILES:
        s = os.path.join(SRC, fn)
        if not os.path.isfile(s):
            continue
        d = os.path.join(DST, fn)
        if not os.path.exists(d):
            todo.append((fn, "新增"))
        elif md5(s) != md5(d):
            todo.append((fn, "更新"))
    return sorted(todo)


def main():
    apply = "--apply" in sys.argv
    print("=" * 70)
    print("MuHaoradio 同步：安装目录 -> 桌面镜像")
    print("  源:", SRC)
    print("  目标:", DST)
    print("  模式:", "执行 --apply（会写入）" if apply else "预演（不写入）")
    print("=" * 70)

    if not os.path.isdir(SRC) or not os.path.isdir(DST):
        print("!! 源或目标目录不存在，中止")
        return 1

    todo = collect()
    if not todo:
        print("\n两边已经完全一致，无需同步。")
        return 0

    print(f"\n待处理 {len(todo)} 个文件：")
    for rel, act in todo:
        print(f"  [{act}] {rel}")

    if not apply:
        print("\n这是预演。确认无误后加 --apply 真正执行。")
        return 0

    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    bk = os.path.join(DST, "..", f"muhaoradio-backup-{ts}")
    bk = os.path.abspath(bk)
    print(f"\n先把将被覆盖的镜像文件备份到: {bk}")

    done = 0
    for rel, act in todo:
        s = os.path.join(SRC, rel)
        d = os.path.join(DST, rel)
        if act == "更新":
            b = os.path.join(bk, rel)
            os.makedirs(os.path.dirname(b), exist_ok=True)
            shutil.copy2(d, b)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy2(s, d)
        if md5(s) != md5(d):
            print(f"  !! 校验失败: {rel}")
            return 1
        done += 1

    print(f"\n完成，已同步 {done} 个文件。备份在: {bk}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
