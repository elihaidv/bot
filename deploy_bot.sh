tsc --outDir build -p tsconfig.json 
cp package.json trading-cloud.json build
git add . && git commit -m "A" && git push

rsync -rzvPu  -r   build/* root@trading:/var/www/bot
ssh root@trading  "pm2 reload Main"
