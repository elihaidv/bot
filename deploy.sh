tsc --skipLibCheck --resolveJsonModule --esModuleInterop --outDir build -t es5 Simulator/rabbitConsumer.ts
cp package.json DB.js trading-cloud.json build
git add . && git commit -m "A" && git push

servers=(
    "137.184.11.204"
    "137.184.179.207"
    "137.184.46.247"
    "146.190.116.103" 
    "146.190.122.121"
    "146.190.122.81"
    "146.190.33.175"
    "146.190.36.25" 
    "146.190.49.91"
    "161.35.225.173"
    "161.35.233.186" 
    "164.92.109.80"
    "164.92.125.56"
    "165.232.143.238"
    "64.227.97.125"

)

for server in "${servers[@]}"
do echo "Deploying to $server"
# ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && pm2 logs rabbitConsumer --lines 30"
# rsync -rzvP  -r -q  -e "ssh -i $HOME/.ssh/simulator" countfiles.sh root@$server:/root/bot
# ssh root@$server -i $HOME/.ssh/simulator "cd /root/bot && ./countfiles.sh"

    # ssh root@$server -i $HOME/.ssh/simulator "df"
    rsync -rzvP  -r  -e "ssh -i $HOME/.ssh/simulator" build/* root@$server:/root/bot
    ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && rm -rf spot"
    ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && npm install"
    ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 reload rabbitConsumer"
done