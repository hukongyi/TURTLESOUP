#!/bin/bash

echo "🚀 开始部署..."

# 1. 拉取最新代码
git pull origin main

# 2. 更新后端依赖 (如果有)
echo "📦 检查后端依赖..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# 3. 重建前端 (如果有前端修改)
echo "🎨 编译前端..."
cd frontend
# 如果之前没安装过 node_modules，需要 npm install
# npm install 
npm run build
cd ..

# 4. 移动前端构建文件到 Nginx 目录 (如果你的 Nginx 配置指向的是 dist)
# 这里假设你的 Nginx root 指向 /var/www/turtle-soup/frontend/dist
# 如果你的 Nginx root 指向 /var/www/turtle-soup/frontend，就不需要额外移动，因为 git pull 下来就已经在里面了
# 但由于 npm run build 生成的是 dist，我们确保 Nginx 指向的是 dist

# 5. 重启后端服务
echo "🔄 重启后端服务..."
sudo systemctl restart turtle-backend

echo "✅ 部署完成！"
