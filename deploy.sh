tsc --skipLibCheck -t es5 Simulator/Simulate.ts 
gcloud builds submit --pack image=gcr.io/tradingbot-361015/simulator-job