#!/bin/bash
#
# 雨姗AI收银助手智能餐饮系统 - 跨平台启动脚本
# 支持: Linux, macOS
#

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                   ║${NC}"
echo -e "${BLUE}║  🍽️  雨姗AI收银助手智能餐饮系统 v4.0.1                ║${NC}"
echo -e "${BLUE}║                                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# 检查Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ 错误: 未安装Node.js${NC}"
        echo ""
        echo "请先安装Node.js (推荐 v16+):"
        echo "  Linux: https://nodejs.org/"
        echo "  macOS: brew install node"
        exit 1
    fi

    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"
}

# 检查配置文件
check_config() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  未找到.env文件，正在创建...${NC}"
        cp .env.example .env
        echo ""
        echo -e "${YELLOW}请编辑 .env 文件配置您的数据库等参数${NC}"
    fi
}

# 安装依赖
install_deps() {
    echo ""
    echo -e "${BLUE}📦 检查依赖...${NC}"

    if [ ! -d "lambda/node_modules" ]; then
        echo "正在安装依赖..."
        cd lambda
        npm install
        cd ..
        echo -e "${GREEN}✅ 依赖安装完成${NC}"
    else
        echo -e "${GREEN}✅ 依赖已安装${NC}"
    fi
}

# 显示使用说明
show_help() {
    echo ""
    echo "使用方法:"
    echo "  ./start.sh                    # 生产模式"
    echo "  ./start.sh dev                # 开发模式 (nodemon)"
    echo "  ./start.sh demo               # 演示模式 (无需数据库)"
    echo "  ./start.sh help               # 显示帮助"
    echo ""
    echo "模式说明:"
    echo "  生产模式: 正常启动，需要配置MySQL和Redis"
    echo "  开发模式: 使用nodemon，文件变更自动重启"
    echo "  演示模式: 使用内存数据库，内置示例数据"
    echo ""
    echo "其他命令:"
    echo "  ./stop.sh                     # 停止服务"
    echo "  ./pm2.sh start                # PM2进程管理启动"
    echo "  docker-compose up -d          # Docker部署"
    echo ""
}

# 启动服务
start_service() {
    local MODE="$1"

    echo ""
    echo -e "${BLUE}🚀 启动服务...${NC}"
    echo ""

    case "$MODE" in
        dev)
            echo -e "${YELLOW}🔧 开发模式${NC}"
            cd lambda
            if ! command -v nodemon &> /dev/null; then
                npm install -g nodemon
            fi
            npx nodemon server.js
            ;;
        demo)
            echo -e "${YELLOW}🎯 演示模式${NC}"
            cd lambda
            node demo-server.js
            ;;
        *)
            echo -e "${GREEN}📱 生产模式${NC}"
            cd lambda
            node server.js
            ;;
    esac
}

# 主程序
main() {
    if [ "$1" == "help" ] || [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
        show_help
        exit 0
    fi

    check_node
    check_config
    install_deps

    local MODE="$1"
    if [ -z "$MODE" ]; then
        MODE="prod"
    fi

    start_service "$MODE"
}

main "$@"
