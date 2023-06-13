import fetch from 'node-fetch';
import { env } from "process";

const SECONDS_IN_DAY = 24 * 60 * 60
const SYMBOL = process.argv[2]
env.GOOGLE_APPLICATION_CREDENTIALS = "trading-cloud.json"

async function fetchDayData(dateString) {
    let t = new Date(dateString).getTime()
    const end = t + SECONDS_IN_DAY * 1000
    const promises = []

    while (t < end) {
        promises.push(fetchRetry(`https://fapi.binance.com/fapi/v1/klines?symbol=${SYMBOL}&interval=1s&startTime=${t}&endTime=${end}&limit=1000`)
            .then(r => r.json()))

        t += 1000 * 1000
        if (promises.length % 10 == 0) {
            await Promise.all(promises)
        }
    }
    const res = await Promise.all(promises)


    return res.flat().map(l => l.map(e => parseFloat(e)))
        .map(([time, open, high, low, close]) => [time, high, low, close])
}

async function fetchRetry(url, init) {
    let retry = 10

    while (retry > 0) {
        try {
            return await fetch(url, init)
        } catch (e) {
            retry = retry - 1
            if (retry === 0) {
                console.error(e)
                throw e
            }

            console.log("pausing..");
            await timeout(3000);
            console.log("done pausing...");

        }
    }
    throw new Error("fetchRetry failed")
};


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


fetchDayData("2023-05-01").then(() =>
    new Storage()
        .bucket('crypto-history')
        .file(`futures/${SYMBOL}/1s/2023-05-01.csv`)
        .save({ resumable: false })
        .then(console.log)
        .catch(console.log))