module.exports = {
  apps: [
    {
      name: 'yushan-ai-cashier-canary',
      script: 'lambda/server.js',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        INSTANCE_TYPE: 'canary',
        CANARY_WEIGHT: '10'
      }
    },
    {
      name: 'yushan-ai-cashier-primary',
      script: 'lambda/server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        INSTANCE_TYPE: 'primary',
        CANARY_WEIGHT: '90'
      }
    }
  ]
};