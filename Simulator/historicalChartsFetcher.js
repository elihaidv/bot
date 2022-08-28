const fetch = require('fetch')
const fs = require('fs')
const SYMBOL = process.argv[2]
const filename = `cryptoHistory/${SYMBOL}`
const { exec } = require("child_process");
const { collationNotSupported } = require('mongodb/lib/core/utils');


function runMain(t) {
    fetch.fetchUrl(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=1m&startTime=${t}&limit=1000`, (e, m, b) => {
        const data = JSON.parse(b)
        if (!data.length) {
            console.log(data)
            return
        }
        fs.appendFileSync(filename, data.map(d =>
                `${d[0]},${d[2].replace(/0+$/,'')},${d[3].replace(/0+$/,'')},${d[4].replace(/0+$/,'')}`)
            .join("\n") + "\n")
        console.log(new Date(data[0][0]));
        setTimeout(() => runMain(data[data.length - 1][6]), 1000)
    });
}

let startTime
if (process.argv.length == 4) {
    fs.rm(filename, () => {
            startTime = new Date(process.argv[3]).getTime()
        runMain(startTime)
    })
} else if (fs.existsSync(filename)) {
    exec(`tail -n 1 ${filename}`, (error, stdout, stderr) => {d
        const line = stdout.split(",")
        startTime = line[0]
        runMain(parseInt(startTime))
    })
} else {
    startTime = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).getTime()
    runMain(startTime)
}