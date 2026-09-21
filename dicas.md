SUBIR GIT

git add .
git commit -m "feat: sua mensagem aqui"
git push origin main

rapido SERVIDOR
cd /home/studioflora/htdocs/studioflora.site

git stash push -u -m "backup-local-before-layout-deploy" || true
git pull --ff-only origin main

if grep -q '^RESERVATION_MINUTES=' .env; then
  sed -i 's/^RESERVATION_MINUTES=.*/RESERVATION_MINUTES=5/' .env
else
  printf '\nRESERVATION_MINUTES=5\n' >> .env
fi

chown -R studioflora:studioflora /home/studioflora/htdocs/studioflora.site

su - studioflora -c '
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"

cd /home/studioflora/htdocs/studioflora.site/web
npm ci
npm run build

cd /home/studioflora/htdocs/studioflora.site
pm2 restart studioflora-web --update-env
pm2 restart studioflora-api --update-env
pm2 save
pm2 status
'

grep '^RESERVATION_MINUTES=' /home/studioflora/htdocs/studioflora.site/.env