SUBIR GIT

git add .
git commit -m "feat: sua mensagem aqui"
git push origin main

rapido SERVIDOR
cd /home/studioflora/htdocs/studioflora.site

git pull origin main

chown -R studioflora:studioflora /home/studioflora/htdocs/studioflora.site

su - studioflora -c '
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

cd /home/studioflora/htdocs/studioflora.site
npm install
npx prisma generate
npm run build

cd /home/studioflora/htdocs/studioflora.site/web
npm install
npm run build

pm2 restart studioflora-api --update-env
pm2 restart studioflora-web --update-env
pm2 save
pm2 status
'