from server import SessionLocal, User, get_password_hash


def reset_password(target_username, new_password):
    db = SessionLocal()
    try:
        # 查找用户
        user = db.query(User).filter(User.username == target_username).first()
        if not user:
            print(f"❌ 找不到用户: {target_username}")
            return

        # 生成新密码的哈希值
        print(f"正在为 {target_username} 生成新密码...")
        new_hash = get_password_hash(new_password)

        # 更新数据库
        user.hashed_password = new_hash
        db.commit()
        print(f"✅ 成功！用户 [{target_username}] 的密码已重置为: {new_password}")

    except Exception as e:
        print(f"❌ 出错: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    u_name = input("请输入要重置的用户名: ")
    p_word = input("请输入新密码: ")
    reset_password(u_name, p_word)
