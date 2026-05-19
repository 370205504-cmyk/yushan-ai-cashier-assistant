#!/bin/bash

APP_NAME="yushan-ai-cashier-skill"
LOG_DIR="logs"

case "$1" in
  start)
    echo "Starting $APP_NAME with PM2..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    ;;
  stop)
    echo "Stopping $APP_NAME..."
    pm2 stop $APP_NAME
    ;;
  restart)
    echo "Restarting $APP_NAME..."
    pm2 restart $APP_NAME
    ;;
  reload)
    echo "Reloading $APP_NAME..."
    pm2 reload $APP_NAME
    ;;
  status)
    pm2 status
    ;;
  logs)
    if [ -n "$2" ]; then
      pm2 logs $APP_NAME --lines $2
    else
      pm2 logs $APP_NAME --lines 100
    fi
    ;;
  monit)
    pm2 monit
    ;;
  info)
    pm2 show $APP_NAME
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|reload|status|logs|monit|info}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the application"
    echo "  stop    - Stop the application"
    echo "  restart - Restart the application"
    echo "  reload  - Zero-downtime reload"
    echo "  status  - Show PM2 status"
    echo "  logs N  - Show last N log lines (default: 100)"
    echo "  monit   - Open PM2 monitoring dashboard"
    echo "  info    - Show application info"
    exit 1
    ;;
esac

exit 0
