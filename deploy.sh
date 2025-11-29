#!/bin/bash

echo "🚀 开始部署..."

# 1. 拉取最新代码
# 记录更新前的版本号，用于后续对比
PREV_HEAD=$(git rev-parse HEAD)

echo "📡 正在拉取远程代码..."
git pull origin main

# 获取更新后的版本号
CURRENT_HEAD=$(git rev-parse HEAD)

# 2. 更新后端依赖 (如果有)
echo "📦 检查后端依赖..."
# 检查 backend/requirements.txt 是否发生变化
if [ ! -d "backend/venv" ] || git diff --name-only $PREV_HEAD $CURRENT_HEAD | grep -q "backend/requirements.txt"; then
    echo "   发现后端依赖变更，正在安装..."
    source backend/venv/bin/activate
    pip install -r backend/requirements.txt
else
    echo "   后端依赖无变化，跳过安装。"
fi


# 3. 重建前端 (智能判断)
echo "🎨 准备编译前端..."
cd frontend

# 逻辑判断：
# 1. 如果 node_modules 不存在（第一次运行）
# 2. 或者 package.json / package-lock.json 在刚才的 git pull 中发生了变化
# 则执行 npm install

# 这里的 grep 路径是相对于 git 根目录的，所以要写 frontend/...
if [ ! -d "node_modules" ] || git diff --name-only $PREV_HEAD $CURRENT_HEAD | grep -E -q "frontend/package(-lock)?\.json"; then
    echo "📦 检测到前端依赖变化或缺失，正在执行 npm install..."
    npm install
else
    echo "⏩ 前端依赖无变化，跳过 npm install。"
fi

echo "🔨 开始构建前端 (npm run build)..."
npm run build
cd ..

# 4. 移动前端构建文件 (通常不需要移动，Nginx root 指向 dist 即可)
# 如果你确定 Nginx 指向的是 /var/www/turtle-soup/frontend/dist，这里什么都不用做

# 5. 重启后端服务
echo "🔄 重启后端服务..."
# 只有当 Python 代码变动时才重启可能是个优化，但为了保险起见，建议每次部署都重启
sudo systemctl restart turtle-backend

echo "✅ 部署完成！"