// const Binance = require("node-binance-api")
// const fs = require('fs');

import Binance from "node-binance-api";
import fs from "fs";

const binance = Binance()
    
// binance.futuresChart(["BNBUSDT"], "5m", (symbol, interval, chart) =>
//  console.log(new Date(parseInt(Object.keys(chart)[499])), chart[Object.keys(chart)[499]].open))

// setInterval(() => {
    // }, 1000);
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
    "BTCUSDT",
    "BTCBUSD"
]
const SECONDS_IN_DAY = 24 * 60 * 60 * 1000
symbols.forEach(symbol => {
    fs.mkdir(`/var/www/bot/future/${symbol}`,()=>{});
    let time = new Date().getTime() 
    let date = time - (time % SECONDS_IN_DAY)

    var stream = fs.createWriteStream(`/var/www/bot/future/${symbol}/${new Date(date).toISOString().split("T")[0]}.csv`, {flags:'a'});

    binance.futuresMarkPriceStream(symbol, data => {
        if (data.eventTime > date + SECONDS_IN_DAY) {
            date += SECONDS_IN_DAY
            stream.end()
            stream = fs.createWriteStream(`/var/www/bot/future/${symbol}/${new Date(date).toISOString().split("T")[0]}.csv`, {flags:'a'});
        }
        const price = parseFloat(data.markPrice)
        stream.write(`${data.eventTime},${price}\n`);
    });


})
