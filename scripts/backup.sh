#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_PATH:-/workspace/backups}"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
TIMESTAMP="${DATE}_${TIME}"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 数据库自动备份开始 =========="

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-yushan_app}"
DB_NAME="${DB_NAME:-yushan_restaurant}"

if [ -n "$DB_PASSWORD" ]; then
    export MYSQL_PWD="$DB_PASSWORD"
fi

mysqldump -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "备份成功: $BACKUP_FILE (${FILE_SIZE})"
    
    RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    log "清理${RETENTION_DAYS}天前的备份完成"
    
    if [ -n "$CLOUD_STORAGE_URL" ]; then
        log "开始上传到云存储..."
        UPLOAD_URL="${CLOUD_STORAGE_URL}/backup_${TIMESTAMP}.sql.gz"
        if curl -T "$BACKUP_FILE" "$UPLOAD_URL" 2>/dev/null; then
            log "云存储上传成功: $UPLOAD_URL"
        else
            log "警告: 云存储上传失败"
        fi
    fi
else
    log "错误: 备份失败"
    exit 1
fi

log "========== 备份完成 =========="
