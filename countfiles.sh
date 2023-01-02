for file in spot/ETHUSDT/1s/2022-01-*.csv
do
    checksum=$(xxd -p -c 1 $file | awk '{s+=$1; if(s > 4294967295) s = and(4294967295, s) } END {print s}')
    echo $file $checksum
done;