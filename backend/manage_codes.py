# File: manage_codes.py
import random
import string
from server import SessionLocal, InviteCode

# 获取数据库会话
db = SessionLocal()


def generate_random_code(length=8):
    """生成随机的大写字母+数字组合"""
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


def list_codes():
    """列出所有注册码及其状态"""
    codes = db.query(InviteCode).all()
    print("\n--- 当前注册码列表 ---")
    print(f"{'CODE':<15} | {'STATUS':<10}")
    print("-" * 30)
    for c in codes:
        status = "已使用" if c.is_used else "未使用"
        print(f"{c.code:<15} | {status:<10}")
    print("-" * 30 + "\n")


def add_custom_code():
    """添加自定义注册码"""
    code = input("请输入你想设置的注册码 (例如 VIP888): ").strip()
    if not code:
        return

    # 检查是否已存在
    exists = db.query(InviteCode).filter(InviteCode.code == code).first()
    if exists:
        print(f"❌ 错误: 注册码 '{code}' 已存在！")
        return

    new_code = InviteCode(code=code)
    db.add(new_code)
    db.commit()
    print(f"✅ 成功添加注册码: {code}")


def batch_generate():
    """批量生成随机码"""
    try:
        count = int(input("请输入要生成的数量 (例如 5): "))
        prefix = input("请输入前缀 (可选，例如 USER_，直接回车跳过): ").strip()
    except ValueError:
        print("❌ 输入无效")
        return

    generated = []
    for _ in range(count):
        # 尝试生成直到不重复
        while True:
            suffix = generate_random_code(6)
            full_code = f"{prefix}{suffix}"
            if not db.query(InviteCode).filter(InviteCode.code == full_code).first():
                break

        db.add(InviteCode(code=full_code))
        generated.append(full_code)

    db.commit()
    print(f"✅ 成功生成 {count} 个注册码:")
    for c in generated:
        print(f"  - {c}")


def main():
    print("========================")
    print("🐢 海龟汤 注册码管理系统")
    print("========================")
    while True:
        print("1. 查看所有注册码")
        print("2. 添加自定义注册码")
        print("3. 批量生成随机码")
        print("4. 退出")
        choice = input("\n请选择操作 [1-4]: ")

        if choice == "1":
            list_codes()
        elif choice == "2":
            add_custom_code()
        elif choice == "3":
            batch_generate()
        elif choice == "4":
            print("退出管理系统。")
            break
        else:
            print("无效输入，请重试。")


if __name__ == "__main__":
    try:
        main()
    finally:
        db.close()
