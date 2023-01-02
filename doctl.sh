
droplets=(
    "331077483"
    "331077484"
    "331077486"
    "332969359"
    "332969434"
    "332969435"
    "332969436"
    "332969437"
    "332969438"
    "332969439"
    "332969440"
    "332969441"
    "332969442"
    "332969443"
    "332969822"

)

for server in "${droplets[@]}"
do echo $server
    # doctl compute droplet-action shutdown $server
    # doctl compute droplet-action resize $server --size s-1vcpu-1gb
    doctl compute droplet-action $1 $server
done