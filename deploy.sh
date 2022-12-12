tsc --skipLibCheck --resolveJsonModule --esModuleInterop -t es5 Simulator/Simulate.ts 
#gcloud builds submit --pack image=gcr.io/tradingbot-361015/simulator-job
docker build -t simulator .
docker push registry.digitalocean.com/simulator-registery/simulator