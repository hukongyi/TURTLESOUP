这份 `README.md` 是根据你提供的源代码结构、功能特性以及未来的开发计划定制的。它包含项目介绍、安装步骤、功能列表、管理员指南以及你提到的后续计划。

你可以直接将以下内容复制到项目根目录下的 `README.md` 文件中。

***

# 🐢 Turtle Soup AI Host (海龟汤 AI 主持人)

> 一个基于 LLM（大语言模型）的侧向思维解谜游戏平台。由 AI 担任主持人，引导玩家通过提问还原故事真相。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![LangChain](https://img.shields.io/badge/AI-LangChain-1C3C3C)

## 📖 项目简介

这是一个现代化的海龟汤（情境猜谜）网页应用。玩家通过与 AI 主持人对话来解谜。项目采用前后端分离架构，集成了多模型切换、实时计费统计、用户鉴权以及沉浸式的 UI 体验。

### ✨ 核心功能

*   **🕵️‍♂️ AI 主持人**: 基于 LangGraph 的智能对话流，支持回答“是/不是/无关”，并能在玩家卡关时提供隐晦提示。
*   **🧠 多模型支持**: 内置 DeepSeek, Gemini, GPT-4o, Claude 3.7 等多种模型配置，支持实时切换。
*   **💰 实时成本监控**: 自动计算每轮对话的 Token 消耗与预估费用（USD）。
*   **🔐 邀请制注册**: 包含完整的 JWT 鉴权系统和邀请码管理机制。
*   **📱 全端适配**: 针对移动端优化的响应式布局，支持手机端沉浸式游玩。
*   **📤 投稿系统**: 用户可以在前台提交新的汤面，管理员在后台审核录入。

---

## 🛠️ 技术栈

*   **前端**: React, Vite, CSS Modules (Cyberpunk/Dark Theme), React Markdown
*   **后端**: Python, FastAPI, SQLAlchemy (SQLite)
*   **AI/LLM**: LangChain, LangGraph, OpenAI SDK Compatible API
*   **鉴权**: OAuth2 with Password (JWT), BCrypt

---

## 🚀 快速开始

### 1. 环境准备

确保你的环境已安装：
*   Node.js (v16+)
*   Python (3.10+)

### 2. 后端设置 (Backend)

```bash
# 进入后端目录
cd backend

# 创建虚拟环境 (可选)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 复制 .env.example 为 .env 并填入你的 API Key
cp .env.example .env
```

**`.env` 文件示例:**
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
BASE_URL=https://api.your-provider.com/v1
```

**启动后端:**
```bash
python server.py
# 服务将运行在 http://0.0.0.0:8000
```

### 3. 前端设置 (Frontend)

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:5173
```

---

## 👮‍♂️ 管理员指南

本项目包含命令行管理工具，用于管理用户和邀请码。

### 生成注册邀请码
只有拥有邀请码的用户才能注册账号。

```bash
cd backend
python manage_codes.py
```
*   选择 `3` 批量生成随机码。
*   或者选择 `2` 添加自定义邀请码（如 `VIP888`）。

### 重置用户密码
如果用户忘记密码，管理员可以使用此脚本重置。

```bash
cd backend
python reset_pwd.py
```

---

## 📂 项目结构

```text
.
├── backend/
│   ├── puzzles/            # 题库 JSON 文件
│   ├── pending_puzzles/    # 用户上传待审核的题目
│   ├── server.py           # FastAPI 主程序 & LangGraph 逻辑
│   ├── manage_codes.py     # 邀请码管理脚本
│   ├── reset_pwd.py        # 密码重置脚本
│   └── sql_app.db          # SQLite 数据库 (自动生成)
├── frontend/
│   ├── src/
│   │   ├── components/     # React 组件 (Game, Menu, Auth...)
│   │   ├── data.js         # 静态题库备份 & 模型配置列表
│   │   ├── App.jsx         # 主路由控制
│   │   └── index.css       # 全局样式 & 移动端适配
│   └── ...
└── ...
```

---

## 📅 后续计划 (Roadmap)

我们正在持续优化体验，以下是近期的开发计划：

- [ ] **📜 历史消息记录 (History Logging)**
    - 将用户的每局游戏对话持久化存储到数据库。
    - 允许用户在“个人中心”回顾之前的推理过程和与 AI 的精彩博弈。

- [ ] **✅ 已玩状态标记 (Played Status)**
    - 自动记录用户已通关或游玩过的题目。
    - 在大厅界面通过视觉标记（如角标或变灰）区分“未玩”和“已玩”的题目。
    - 增加“只看未玩”筛选功能。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request 来改进这个项目！

1. Fork 本仓库
2. 新建 feature 分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

MIT License.