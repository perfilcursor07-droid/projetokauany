// PM2 - roda os DOIS servicos do projeto:
//   studioflora-api  -> Fastify (porta definida no .env, no servidor: 3007)
//   studioflora-web  -> Next.js (WEB_PORT ou 3011)
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
      env: { NODE_ENV: 'production', PORT: process.env.WEB_PORT || '3011' },
      time: true,
      max_restarts: 10,
    },
  ],
};
