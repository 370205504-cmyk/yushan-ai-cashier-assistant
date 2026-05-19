FROM node:18.20.2-alpine3.19

LABEL maintainer="yushan-ai-cashier"
LABEL description="雨姗AI收银助手 - 智能餐饮系统"
LABEL node.version=">=18.0.0 <22.0.0"

ENV NODE_ENV=production
ENV PORT=3000

# 安装必要的系统依赖
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init tini curl wget && \
    rm -rf /var/cache/apk/*

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nodejs -G nodejs -s /bin/ash -D nodejs && \
    chown -R nodejs:nodejs /home/nodejs

WORKDIR /app

# 复制package文件并安装依赖
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs lambda/package*.json ./lambda/

# 安装生产依赖
RUN npm ci --only=production --no-audit && \
    cd lambda && npm ci --only=production --no-audit && \
    npm cache clean --force && \
    rm -rf /root/.npm

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 创建必要的目录
RUN mkdir -p /app/uploads /app/logs /app/backups && \
    chown -R nodejs:nodejs /app/uploads /app/logs /app/backups

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["tini", "--"]

CMD ["node", "lambda/server.js"]
