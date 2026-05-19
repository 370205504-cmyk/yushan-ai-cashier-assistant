#!/bin/bash
#
# 雨姗AI收银助手智能餐饮系统 - 停止脚本
# 支持: Linux, macOS
#

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "⏹️  停止服务..."

# 查找并停止Node.js进程
PIDS=$(ps aux | grep -E "node.*server\.js|node.*demo-server\.js" | grep -v grep | awk '{print $2}')

if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}正在停止进程: $PIDS${NC}"
    kill $PIDS 2>/dev/null

    # 等待进程结束
    sleep 2

    # 强制停止未结束的进程
    PIDS=$(ps aux | grep -E "node.*server\.js|node.*demo-server\.js" | grep -v grep | awk '{print $2}' || true)
    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}强制停止进程...${NC}"
        kill -9 $PIDS 2>/dev/null
    fi

    echo -e "${GREEN}✅ 服务已停止${NC}"
else
    echo "未找到运行中的服务"
fi

# 停止PM2进程（如果有）
if command -v pm2 &> /dev/null; then
    echo ""
    echo "检查PM2进程..."
    pm2 stop yushan-ai-cashier 2>/dev/null || true
    pm2 delete yushan-ai-cashier 2>/dev/null || true
fi

# 停止Docker容器（如果有）
if command -v docker &> /dev/null; then
    echo ""
    echo "检查Docker容器..."
    docker-compose down 2>/dev/null || true
fi

echo ""
echo "服务已全部停止"
