{
  "apps": [
    {
      "name": "yushan-ai-cashier",
      "script": "lambda/server.js",
      "instances": 1,
      "exec_mode": "cluster",
      "max_memory_restart": "500M",
      "autorestart": true,
      "watch": false,
      "max_uptime": "4h",
      "restart_delay": 4000,
      "env": {
        "NODE_ENV": "production"
      },
      "env_staging": {
        "NODE_ENV": "staging"
      },
      "env_development": {
        "NODE_ENV": "development"
      },
      "error_file": "logs/pm2-error.log",
      "out_file": "logs/pm2-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss",
      "merge_logs": true,
      "kill_timeout": 5000,
      "listen_timeout": 3000,
      "shutdown_with_message": true
    }
  ]
}