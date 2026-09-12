#!/usr/bin/env python3
"""核对 MuHaoradio 两份代码是否一致。

用法:  python tools/verify-two-copies.py

预期结果: 「剩余差异」只有 package.json 和 vendor/KuGouMusicApi/.env
   - package.json  : 项目本体是完整源（含 electron-builder 配置），运行副本是打包后裁剪版 —— 允许不同
   - .env          : 环境相关配置 —— 允许不同
其它任何差异都说明有人改了单边没同步。
"""
import os
import hashlib

A = os.environ.get("MUHAORADIO_INSTALL_DIR", r"D:\MuHaoradio\resources\app")
# 对照方为本脚本所在仓库的根目录（tools/ 的上一级），不写死绝对路径
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {"node_modules", ".git", "dist", "output", "backups", "__pycache__",
                ".cache", "logs", "tmp", ".playwright-cli"}
# 仓库/构建元数据类文件：与运行无关，允许两份不同
ALLOW_DIFF = {
    "package.json",              # 本体是完整源（含 electron-builder 配置），运行副本是打包后裁剪版
    "package-lock.json",
    ".gitignore",
    ".gitattributes",
    "NOTICE.md",
    "SYNC-CONVENTION.md",
    "vendor/KuGouMusicApi/.env",  # 环境相关配置
}


def walk(root):
    out = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if ".bak" in fn or fn.endswith((".log", ".tmp", ".cache")):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace("\\", "/")
            try:
                with open(full, "rb") as f:
                    out[rel] = hashlib.md5(f.read()).hexdigest()
            except OSError:
                out[rel] = "ERR"
    return out


def main():
    if not os.path.isdir(A) or not os.path.isdir(B):
        print("!! 找不到目录，请检查路径")
        return 1

    a, b = walk(A), walk(B)
    common = set(a) & set(b)
    diff = sorted(p for p in common if a[p] != b[p])
    unexpected = [p for p in diff if p not in ALLOW_DIFF]

    print("=" * 66)
    print(f"运行副本 {len(a)} 文件  |  项目本体 {len(b)} 文件")
    print(f"共同 {len(common)} · 相同 {len(common) - len(diff)} · 不同 {len(diff)}")
    print(f"仅运行副本有 {len(set(a) - set(b))}  ·  仅本体有 {len(set(b) - set(a))}")
    print("=" * 66)

    if diff:
        print("\n差异文件:")
        for p in diff:
            tag = "（预期内，可忽略）" if p in ALLOW_DIFF else "  <<< 需要同步"
            print(f"  · {p}{tag}")

    print()
    if unexpected:
        print(f"!! 发现 {len(unexpected)} 个非预期差异，请跑 sync-install-to-mirror.py 同步")
        return 1
    print("✓ 两份代码一致（仅仓库元数据类文件允许不同）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
