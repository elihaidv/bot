const Binance = require("node-binance-api")
const fs = require('fs');

// import Binance from "node-binance-api";
// import fs from "fs";

const binance = Binance()

const symbols = [
    "MATICUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "LINKUSDT",
    "XRPUSDT",
    "DOTUSDT",
    "DOGEUSDT",
    "MATICBUSD",
    "ETHBUSD",
    "BNBBUSD",
    "SOLBUSD",
    "LINKBUSD",
    "XRPBUSD",
    "DOTBUSD",
    "DOGEBUSD",
]
const SECONDS_IN_DAY = 24 * 60 * 60 * 1000
symbols.forEach(symbol => {
    fs.mkdir(`future/${symbol}`,()=>{});
    let time = new Date().getTime() 
    let date = time - (time % SECONDS_IN_DAY)

    var stream = fs.createWriteStream(`future/${symbol}/${new Date(date).toISOString().split("T")[0]}.csv`, {flags:'a'});

    binance.futuresMarkPriceStream(symbol, data => {
        if (data.eventTime > date + SECONDS_IN_DAY) {
            date += SECONDS_IN_DAY
            stream.end()
            stream = fs.createWriteStream(`future/${symbol}/${new Date(date).toISOString().split("T")}.csv`, {flags:'a'});
        }
        const price = parseFloat(data.markPrice)
        stream.write(`${data.eventTime},${price}\n`);
    });
})
