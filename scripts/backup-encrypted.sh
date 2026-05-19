#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_PATH:-/workspace/backups}"
DATE=$(date +%Y%m%d_%H%M%S)

# 检查加密密钥是否设置
if [ -z "${BACKUP_ENCRYPTION_KEY}" ]; then
    log "错误: 未设置 BACKUP_ENCRYPTION_KEY 环境变量"
    log "请设置: export BACKUP_ENCRYPTION_KEY='your-32-char-encryption-key'"
    exit 1
fi
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "========== 数据库加密自动备份开始 =========="

if [ ! -d "${BACKUP_DIR}" ]; then
  mkdir -p "${BACKUP_DIR}"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-yushan_app}"
DB_NAME="${DB_NAME:-yushan_restaurant}"

if [ -n "${DB_PASSWORD}" ]; then
  export MYSQL_PWD="${DB_PASSWORD}"
fi

TEMP_FILE=$(mktemp)
mysqldump -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" \
  --single-transaction --routines --triggers --events --hex-blob \
  "${DB_NAME}" > "${TEMP_FILE}"

gzip -c "${TEMP_FILE}" | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -k "${ENCRYPTION_KEY}" \
  > "${BACKUP_DIR}/backup_${DATE}.sql.gz.enc"

rm "${TEMP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_DIR}/backup_${DATE}.sql.gz.enc" | cut -f1)
log "加密备份成功: backup_${DATE}.sql.gz.enc (${FILE_SIZE})"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
find "${BACKUP_DIR}" -type f -name "backup_*.sql.gz.enc" -mtime +${RETENTION_DAYS} -delete
log "清理${RETENTION_DAYS}天前的备份完成"

log "========== 加密备份完成 =========="
