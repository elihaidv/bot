<<<<<<< HEAD
inotifywait -m simulations-outputs -e create -e moved_to |
    while read dir action file; do
        mv simulations-outputs/$file simulations-outputs-back
        gsutil -m rsync -r -i simulations-outputs-back/$file gs://simulations-tradingbot/$file; 
        rm -rf simulations-outputs-back/$file
        sleep 60
    done   

# mv simulations-outputs/* simulations-outputs-back
# for f in simulations-outputs-back/simulation*;
#  do /home/clap/Downloads/google-cloud-sdk/bin/gsutil -m rsync -r -i $f gs://simulations-tradingbot/$(basename "$f"); 
#  rm -rf $f
# done;
=======
# inotifywait -m simulations-outputs -e create -e moved_to |
#     while read dir action file; do
#         mv simulations-outputs/$file simulations-outputs-back
#         gsutil -m rsync -r -i simulations-outputs-back/$file gs://simulations-tradingbot/$file; 
#         rm -rf simulations-outputs-back/$file
#         sleep 60
#     done    
    
mv simulations-outputs/* simulations-outputs-back
for f in simulations-outputs-back/simulation*;
 do gsutil -m rsync -r -i $f gs://simulations-tradingbot/$(basename "$f"); 
 rm -rf $f
done;
>>>>>>> 994f9e0e4264b00be8ae65b88c400d7efd01a8a6
