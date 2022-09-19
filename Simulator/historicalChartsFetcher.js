const fetch = require('fetch')
const fs = require('fs')
const SYMBOL = process.argv[2]
const { exec } = require("child_process");

const filename = `cryptoHistory/${SYMBOL}_${process.argv[3]}`

function runMain(t) {
    const BASE_URL = process.argv[3] == "SPOT" ? "https://api.binance.com/api/v3/" : "https://fapi.binance.com/fapi/v1/"

    fetch.fetchUrl(`${BASE_URL}klines?symbol=${SYMBOL}&interval=1m&startTime=${t}&limit=1000`, (e, m, b) => {
        const data = JSON.parse(b)
        if (!data.length) {
            console.log(data)
            return
        }
        fs.appendFileSync(filename, data.map(d =>
            `${d[0]},${d[2].replace(/0+$/, '')},${d[3].replace(/0+$/, '')},${d[4].replace(/0+$/, '')}`)
            .join("\n") + "\n")
        console.log(new Date(data[0][0]));
        setTimeout(() => runMain(data[data.length - 1][6]), 1000)
    });
}

let startTime
if (process.argv.length == 5) {

    if (fs.existsSync(filename)) {
        fs.rmSync(filename)
    }
    startTime = new Date(process.argv[4]).getTime()
    runMain(startTime)

} else if (fs.existsSync(filename)) {
    exec(`tail -n 1 ${filename}`, (error, stdout, stderr) => {
        const line = stdout.split(",")
        startTime = line[0]
        runMain(parseInt(parseInt(startTime) + (1000 * 60)))
    })
} else {
    
    startTime = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).getTime()
    runMain(startTime)
}