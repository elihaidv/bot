for file in spot/*/1s/*.csv
do
    count=$(wc -l < $file )
    if [ $count -le 86000 ]
    then
        echo $file $count
    fi
done;