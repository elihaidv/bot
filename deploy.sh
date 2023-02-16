tsc --outDir build -p tsconfig.json 
cp package.json DB.js trading-cloud.json ecosystem.config.js build
sed -i 's/debugger;/console.error("debugger");/g' build/**/*.js
git add . && git commit -m "A" && git push

servers=(
    # "137.184.124.50"
    # "137.184.5.238"
    # "143.198.146.81"
    # "143.198.75.7"
    "146.190.116.103" 
    # "146.190.36.25" 
    # "159.223.200.43"
    # "159.223.201.42"
    # "159.223.201.66"
    # "161.35.225.173"
    # "164.92.112.73"
    # "164.92.65.225"
    # "164.92.69.32"
    # "164.92.70.95"
    # "164.92.73.53"
)

for server in "${servers[@]}"
do echo "Deploying to $server"
# ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 start Simulator/rabbitConsumer.js --node-args=\"--max-old-space-size=4096\""
# ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && pm2 logs"


    # ssh root@$server -i $HOME/.ssh/simulator "tail -200 /root/.pm2/logs/rabbitConsumer-error.log"
# ssh root@$server -i $HOME/.ssh/simulator "cd /root/bot && ./countfiles.sh"
    # ssh root@$server -i $HOME/.ssh/simulator "cd /root/bot && rm -rf spot"
    # ssh root@$server -i $HOME/.ssh/simulator "swapon /swapfile1"
    # ssh root@$server -i $HOME/.ssh/simulator "free"
    # ssh root@$server -i $HOME/.ssh/simulator "rm -rf /root/.pm2/logs/*"
    # ssh root@$server -i $HOME/.ssh/simulator "cat /root/.pm2/logs/rabbitConsumer-error.log | sort"
    # ssh root@$server -i $HOME/.ssh/simulator "wc -l /root/bot/spot/ETHUSDT/1s/2022-01-05.csv"
    # ssh root@$server -i $HOME/.ssh/simulator "tail /root/.pm2/pm2.log"
    # rsync -rzvP  -r -q  -e "ssh -i $HOME/.ssh/simulator" ecosystem.config.js root@$server:/root/bot
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 stop Simulator/rabbitConsumer.js --node-args=\"--max-old-space-size=4096\""
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 restart ecosystem.config.js --node-args=\"--max-old-space-size=4096\""
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 reload Simulator/rabbitConsumer.js --node-args=\"--max-old-space-size=4096\""

    # ssh root@$server -i $HOME/.ssh/simulator "cd /root/bot && ./countfiles.sh > countfiles.log"
    rsync -rzvPu  -r  -e "ssh -i $HOME/.ssh/simulator" build/* root@$server:/root/bot
    ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 reload Simulator/rabbitConsumer.js --node-args=\"--max-old-space-size=4096\""
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 start ecosystem.config.js --node-args=\"--max-old-space-size=4096\""

    # scp -i $HOME/.ssh/simulator root@$server:/root/bot/countfiles.log logs/$server-countfiles.log
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && npm install"
    # ssh root@$server -i $HOME/.ssh/simulator "PATH=$PATH:/root/.nvm/versions/node/v18.12.1/bin && cd /root/bot && pm2 reload Simulator/rabbitConsumer.js --node-args=\"--max-old-space-size=4096\""

done