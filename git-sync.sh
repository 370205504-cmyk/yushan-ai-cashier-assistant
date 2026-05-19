#!/bin/bash

# Git Sync Script - 同步并推送到远程仓库
# 用法: ./git-sync.sh [提交信息]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REPO_NAME="yushan-ai-cashier-assistant"
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Git Sync - ${REPO_NAME}${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

# 1. 显示当前状态
echo -e "${YELLOW}[1/5] 检查仓库状态...${NC}"
git status --short

# 2. 拉取远程更新
echo ""
echo -e "${YELLOW}[2/5] 拉取远程更新...${NC}"
git fetch origin

# 检查是否有远程更新
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse origin/${BRANCH})
BASE=$(git merge-base @ origin/${BRANCH})

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ 已是最新版本${NC}"
elif [ "$LOCAL" = "$BASE" ]; then
    echo -e "${YELLOW}⚠️  远程有新版本，正在合并...${NC}"
    git pull origin ${BRANCH} --no-edit
elif [ "$REMOTE" = "$BASE" ]; then
    echo -e "${YELLOW}⚡ 本地有新的提交${NC}"
else
    echo -e "${YELLOW}⚠️  分歧检测到，尝试自动合并...${NC}"
    git pull origin ${BRANCH} --no-edit || {
        echo -e "${RED}❌ 自动合并失败，请手动解决冲突${NC}"
        exit 1
    }
fi

# 3. 添加所有更改
echo ""
echo -e "${YELLOW}[3/5] 添加更改文件...${NC}"
git add -A

# 4. 检查是否有更改需要提交
if git diff --cached --quiet; then
    echo -e "${GREEN}✓ 没有需要提交的更改${NC}"
else
    echo -e "${YELLOW}📝 待提交文件:${NC}"
    git diff --cached --stat

    # 5. 创建提交
    echo ""
    echo -e "${YELLOW}[4/5] 创建提交...${NC}"

    if [ -n "$1" ]; then
        COMMIT_MSG="$1"
    else
        # 自动生成提交信息
        COMMIT_MSG=$(git diff --cached --stat | tail -1 | awk '{print "更新: " $0}' | sed 's/        / /')
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="更新项目文件 - $(date '+%Y-%m-%d %H:%M:%S')"
        fi
    fi

    echo -e "提交信息: ${COMMIT_MSG}"
    git commit -m "${COMMIT_MSG}"

    # 6. 推送到远程
    echo ""
    echo -e "${YELLOW}[5/5] 推送到远程仓库...${NC}"
    git push origin ${BRANCH}

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 同步完成！${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  ❌ 推送失败，请检查网络或权限${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✓ 仓库状态已同步到最新${NC}"
