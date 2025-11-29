import os
import sys
import subprocess
import ctypes
from ctypes import wintypes

# ================= 核心配置区域 (修改这里) =================

# 1. 明确指定要扫描的根文件 (只填文件名)
CORE_ROOT_FILES = {
    "server.py",
    # "readcode.py", # 如果你想让AI看这个脚本本身，可以解开注释
}

# 2. 明确指定要扫描的目录 (相对路径)
CORE_DIRS = [
    os.path.join("frontend", "src"),  # 前端核心代码
    # os.path.join("puzzles"),        # 谜题数据 (下面有特殊逻辑只取第一个)
]

# 3. 指定只读取这些后缀的代码文件
TARGET_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".css",  # 如果你需要传样式，解开这个
    # ".json", # 如果你需要传 JSON 结构
}

# 4. 即使在目标目录，也强制排除的文件/目录
ALWAYS_EXCLUDE = {
    "node_modules",
    "dist",
    "build",
    "package-lock.json",  # 巨大的噪音文件
    "yarn.lock",
    ".git",
    "vite.svg",
    "react.svg",
}

# 5. 特殊规则：是否只读取 puzzles 目录下的第一个文件作为示例？
SAMPLE_PUZZLES_ONLY = True

# ========================================================


def is_binary(file_path):
    """检测是否为二进制文件 (保留你原有的逻辑)"""
    # 简单的后缀检查
    _, ext = os.path.splitext(file_path)
    if ext.lower() in {".png", ".jpg", ".jpeg", ".gif", ".ico", ".exe", ".dll", ".pyc"}:
        return True
    return False


# ... [保留你原有的 set_clipboard_windows 和 copy_to_clipboard 函数] ...
# 为了节省篇幅，这里默认你保留了原有的剪切板函数
# 请将原有的 set_clipboard_windows 和 copy_to_clipboard 代码粘贴在这里
# ------------------------------------------------------------------


def set_clipboard_windows(text):
    """Windows 专用：修复了 64 位指针问题的剪切板写入"""
    try:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        user32.OpenClipboard.argtypes = [wintypes.HWND]
        user32.OpenClipboard.restype = wintypes.BOOL
        user32.EmptyClipboard.argtypes = []
        user32.EmptyClipboard.restype = wintypes.BOOL
        user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]
        user32.SetClipboardData.restype = wintypes.HANDLE
        user32.CloseClipboard.argtypes = []
        user32.CloseClipboard.restype = wintypes.BOOL

        kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
        kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
        kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
        kernel32.GlobalLock.restype = ctypes.c_void_p
        kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
        kernel32.GlobalUnlock.restype = wintypes.BOOL
        kernel32.GlobalFree.argtypes = [wintypes.HGLOBAL]
        kernel32.GlobalFree.restype = wintypes.HGLOBAL

        if not user32.OpenClipboard(None):
            raise Exception("无法打开剪切板")

        user32.EmptyClipboard()
        text_bytes = text.encode("utf-16le") + b"\x00\x00"
        h_global = kernel32.GlobalAlloc(0x0002, len(text_bytes))
        if not h_global:
            user32.CloseClipboard()
            raise Exception("内存分配失败")

        p_global = kernel32.GlobalLock(h_global)
        if not p_global:
            kernel32.GlobalFree(h_global)
            user32.CloseClipboard()
            raise Exception("内存锁定失败")

        ctypes.memmove(p_global, text_bytes, len(text_bytes))
        kernel32.GlobalUnlock(h_global)

        if not user32.SetClipboardData(13, h_global):
            kernel32.GlobalFree(h_global)
            user32.CloseClipboard()
            raise Exception("设置剪切板数据失败")

        user32.CloseClipboard()
        print(f"✅ [API] 成功复制 {len(text)} 个字符。")

    except Exception as e:
        print(f"⚠️ API 方法失败: {e}")
        try:
            p = subprocess.Popen("clip", stdin=subprocess.PIPE, shell=True)
            p.communicate(input=text.encode("gbk", errors="ignore"))
            print("✅ [CMD] 已通过命令行复制到剪切板。")
        except Exception as e2:
            print(f"❌ 所有方法均失败: {e2}")


def copy_to_clipboard(text):
    platform = sys.platform
    if platform == "win32":
        set_clipboard_windows(text)
    elif platform == "darwin":
        try:
            process = subprocess.Popen(
                "pbcopy", env={"LANG": "en_US.UTF-8"}, stdin=subprocess.PIPE
            )
            process.communicate(text.encode("utf-8"))
        except:
            pass
    else:
        try:
            p = subprocess.Popen(
                ["xclip", "-selection", "clipboard"], stdin=subprocess.PIPE
            )
            p.communicate(input=text.encode("utf-8"))
        except:
            pass


# ------------------------------------------------------------------


def should_process_file(root, filename):
    """判断文件是否应该被读取"""
    file_path = os.path.join(root, filename)
    abs_path = os.path.abspath(file_path)

    # 1. 检查文件名是否在排除列表中
    if filename in ALWAYS_EXCLUDE or filename.startswith("."):
        return False

    # 2. 检查后缀名
    _, ext = os.path.splitext(filename)

    # 特殊处理：如果是 puzzles 目录下的 .json
    if "puzzles" in abs_path and ext == ".json":
        return True  # 先允许，后面控制数量

    if ext not in TARGET_EXTENSIONS:
        return False

    return True


def collect_files():
    result = []
    print("📂 开始智能扫描核心代码...")

    processed_files = 0
    puzzle_processed = False  # 标记是否已经读取过一个谜题文件

    # 1. 扫描根目录下的指定文件
    print(f"  - 扫描根目录核心文件: {CORE_ROOT_FILES}")
    for file in os.listdir("."):
        if file in CORE_ROOT_FILES:
            try:
                with open(file, "r", encoding="utf-8") as f:
                    content = f.read()
                    result.append(f"# File: {file}\n{content}\n")
                    print(f"    -> 读取: {file}")
                    processed_files += 1
            except Exception as e:
                print(f"    ! 读取失败 {file}: {e}")

    # 2. 扫描指定的核心目录
    for core_dir in CORE_DIRS:
        if not os.path.exists(core_dir):
            print(f"  ! 目录不存在，跳过: {core_dir}")
            continue

        print(f"  - 扫描目录: {core_dir}")
        for root, dirs, files in os.walk(core_dir):
            # 过滤不需要进入的目录
            dirs[:] = [
                d for d in dirs if d not in ALWAYS_EXCLUDE and not d.startswith(".")
            ]

            for file in files:
                if not should_process_file(root, file):
                    continue

                # 排除二进制
                full_path = os.path.join(root, file)
                if is_binary(full_path):
                    continue

                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        result.append(f"# File: {full_path}\n{content}\n")
                        print(f"    -> 读取: {full_path}")
                        processed_files += 1
                except Exception:
                    pass

    # 3. 特殊逻辑：只读取 puzzles 里的第一个 json 作为示例
    if SAMPLE_PUZZLES_ONLY:
        puzzles_dir = "puzzles"
        if os.path.exists(puzzles_dir):
            print(f"  - 扫描 Puzzles (仅取样一个)...")
            files = [f for f in os.listdir(puzzles_dir) if f.endswith(".json")]
            if files:
                sample = files[0]
                full_path = os.path.join(puzzles_dir, sample)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        result.append(f"# [Data Sample] File: {full_path}\n{content}\n")
                        print(f"    -> 读取示例数据: {sample}")
                        processed_files += 1
                except:
                    pass

    print(f"\n📊 扫描完成，共提取 {processed_files} 个核心文件。")
    return "\n".join(result)


if __name__ == "__main__":
    combined_code = collect_files()
    if combined_code:
        copy_to_clipboard(combined_code)
    else:
        print("❌ 未找到任何符合条件的代码文件。")
