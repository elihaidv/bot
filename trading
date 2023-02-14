import Binance from "node-binance-api";
import fs from "fs";

const binance = new Binance()

const symbols = [
    "MATICUSDT",
    "ETHUSDT",
]

symbols.forEach(symbol => {
    var stream = fs.createWriteStream(symbol + ".csv", {flags:'a'});

    binance.futuresMarkPriceStream(symbol, data => {
        const price = parseFloat(data.markPrice)
        stream.write(`${data.eventTime},${price},${price},${price}\n`);
    });
})