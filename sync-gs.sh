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
