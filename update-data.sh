#!/bin/bash
#
# 一键更新脚本
# 用于快速更新菜品和门店数据
# 开发者：石中伟
#

set -e

echo "======================================"
echo "  数据更新脚本"
echo "  开发者：石中伟"
echo "======================================"

# 备份现有数据
echo ""
echo ">>> 备份现有数据"
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp lambda/data/*.json "$BACKUP_DIR/"
echo "备份完成: $BACKUP_DIR"

# 验证JSON格式
echo ""
echo ">>> 验证JSON格式"
for file in lambda/data/*.json; do
    echo -n "检查 $(basename $file)... "
    if node -e "JSON.parse(require('fs').readFileSync('$file'))" 2>/dev/null; then
        echo "OK"
    else
        echo "错误: JSON格式无效"
        exit 1
    fi
done

# 统计菜品数量
echo ""
echo ">>> 统计数据"
DISH_COUNT=$(node -e "console.log(require('./lambda/data/dishes.json').length)")
STORE_COUNT=$(node -e "console.log(require('./lambda/data/stores.json').length)")
RECIPE_COUNT=$(node -e "console.log(require('./lambda/data/recipes.json').length)")

echo "  菜品数量: $DISH_COUNT"
echo "  门店数量: $STORE_COUNT"
echo "  菜谱数量: $RECIPE_COUNT"

echo ""
echo "======================================"
echo "  数据验证完成！"
echo "======================================"
