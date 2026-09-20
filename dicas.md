SUBIR GIT

git add .
git commit -m "feat: sua mensagem aqui"
git push origin main

rapido
cd /home/studioflora/htdocs/studioflora.site
git pull --ff-only origin main
npm ci --omit=dev
npm run migrate
npm run build:css
npm run gateway:sync
pm2 restart viralizeai --update-env
pm2 save
pm2 logs viralizeai --lines 50