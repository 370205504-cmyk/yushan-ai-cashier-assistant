#!/bin/bash
set -e

echo "========================================"
echo "雨姗AI收银助手创味菜 - 快速启动脚本"
echo "========================================"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "1. 检查环境变量..."
if [ ! -f ".env" ]; then
    echo "   ⚠  .env 文件不存在，从 .env.example 创建..."
    cp .env.example .env
    echo "   ✅ 已创建 .env 文件，请配置数据库信息"
else
    echo "   ✅ .env 文件已存在"
fi

echo ""
echo "2. 检查并创建必要目录..."
mkdir -p "$PROJECT_DIR/lambda/logs"
mkdir -p "$PROJECT_DIR/lambda/uploads"
mkdir -p "$PROJECT_DIR/backups"
echo "   ✅ 目录创建完成"

echo ""
echo "3. 检查 Node.js 环境..."
if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    echo "   ✅ Node.js 已安装: v$NODE_VERSION"
else
    echo "   ❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo ""
echo "4. 安装依赖..."
cd "$PROJECT_DIR/lambda"
if [ ! -d "node_modules" ]; then
    echo "   正在安装依赖..."
    npm install --production
    echo "   ✅ 依赖安装完成"
else
    echo "   ✅ node_modules 已存在"
fi

echo ""
echo "5. 检查数据库配置..."
DB_HOST=$(grep 'DB_HOST=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | xargs)
DB_PORT=$(grep 'DB_PORT=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | xargs)
DB_NAME=$(grep 'DB_NAME=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | xargs)

if [ -z "$DB_HOST" ] || [ "$DB_HOST" = "localhost" ] || [ "$DB_HOST" = "127.0.0.1" ]; then
    echo ""
    echo "⚠  提示：当前配置为本地数据库"
    echo "   如果您使用 Docker，请运行 docker-compose up -d"
    echo ""
fi

echo ""
echo "6. 检查 MySQL 连接..."
if command -v mysql &>/dev/null; then
    if mysql -h"${DB_HOST:-localhost}" -P"${DB_PORT:-3306}" -u"${DB_USER:-root}" -p"${DB_PASSWORD:-}" -e "SELECT 1;" &>/dev/null; then
        echo "   ✅ MySQL 连接成功"
        echo ""
        read -p "   是否运行数据库迁移? (y/n): " RUN_MIGRATE
        if [ "$RUN_MIGRATE" = "y" ] || [ "$RUN_MIGRATE" = "Y" ]; then
            node "$PROJECT_DIR/lambda/database/migrate.js"
            echo "   ✅ 数据库迁移完成"
        fi
    else
        echo "   ⚠  MySQL 连接失败，可能需要手动配置"
    fi
else
    echo "   ⚠  mysql 命令不可用，跳过数据库检查"
fi

echo ""
echo "7. 准备启动..."
echo "   服务地址: http://localhost:${PORT:-3000}"
echo "   顾客端: http://localhost:${PORT:-3000}"
echo "   移动端: http://localhost:${PORT:-3000}/mobile"
echo "   管理端: http://localhost:${PORT:-3000}/admin"
echo ""
echo "   按 Ctrl+C 停止服务"
echo ""

if [ "$1" = "--docker" ]; then
    echo "启动 Docker 容器..."
    cd "$PROJECT_DIR"
    docker-compose up
elif [ "$1" = "--dev" ]; then
    echo "启动开发模式..."
    npm run dev
else
    echo "启动生产模式..."
    npm start
fi

exit 0
