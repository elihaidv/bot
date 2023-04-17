inotifywait -m simulations-outputs -e create -e moved_to |
    while read dir action file; do
        mv simulations-outputs/$file simulations-outputs-back
        gsutil -m rsync -r -i simulations-outputs-back/$file gs://simulations-tradingbot/$file; 
        rm -rf simulations-outputs-back/$file
        sleep 60
    done    
    
