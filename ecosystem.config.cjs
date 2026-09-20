// PM2 Ecosystem Configuration
// Configuração para gerenciamento de processos Node.js

module.exports = {
  apps: [
    {
      name: 'studioflora',
      script: './dist/server.js',
      cwd: '/home/studioflora/htdocs/studioflora.site',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
