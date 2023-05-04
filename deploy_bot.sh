tsc --outDir build -p tsconfig.json 
cp -r package.json trading-cloud.json utils build

rsync -rzvPu  -r --exclude build/DB.js build/* root@trading:/var/www/bot
ssh root@trading  "/root/.nvm/versions/node/v17.9.1/bin/pm2 reload Main"
git add . && git commit -m "A" && git push
