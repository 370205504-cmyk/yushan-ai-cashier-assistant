#!/bin/bash
#
# 文字接口测试脚本
# 开发者：石中伟
#
# 使用方法：
#   ./test-api.sh "你好"
#   ./test-api.sh "WiFi密码是多少"
#   ./test-api.sh "推荐一道川菜"

API_URL="${1:-http://localhost:3000/text}"
TEXT="${1:-你好}"

echo "发送请求..."
echo "文字: $TEXT"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEXT\", \"userId\": \"test-user\"}" \
  2>/dev/null | jq .
