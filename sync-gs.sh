mv simulations-outputs/* simulations-outputs-back
for f in simulations-outputs-back/simulation*;
 do /home/clap/Downloads/google-cloud-sdk/bin/gsutil -m rsync -r -i $f gs://simulations-tradingbot/$(basename "$f"); 
 rm -rf $f
done;
