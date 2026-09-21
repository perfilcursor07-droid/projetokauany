// PM2 - roda os DOIS servicos do projeto:
//   studioflora-api  -> Fastify (porta 3333, definida no .env)
//   studioflora-web  -> Next.js (porta 3000)
// Uso:
//   pm2 startOrReload ecosystem.config.cjs --update-env
//   pm2 save
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'studioflora-api',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production' },
      time: true,
      max_restarts: 10,
    },
    {
      name: 'studioflora-web',
      cwd: path.join(__dirname, 'web'),
      script: 'npm',
      args: 'start',
      // Next.js escuta na porta definida por PORT.
      env: { NODE_ENV: 'production', PORT: '3000' },
      time: true,
      max_restarts: 10,
    },
  ],
};
