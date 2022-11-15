const fetch = require('node-fetch')
const admZip = require('adm-zip');

async function runMain() {
    let startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    const promises = []
    for (let i = 0; i < 365; i ++) {
        
        startDate.setDate(startDate.getDate() + 1)
        const date = startDate.toISOString().split("T")[0]
        
        promises.push(fetch(`https://data.binance.vision/data/spot/daily/klines/MATICUSDT/1s/MATICUSDT-1s-${date}.zip`)
            .then(res => res.buffer())
            .then(r => new admZip(r)) 
            .catch(console.log))

        // if (promises.length == 10) {
        //     await Promise.all(promises)
            
        //     promises.length = 0
        // }

    }
    const arr = await Promise.all(promises)
}
runMain()