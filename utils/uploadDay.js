// const fs = require('fs')
// const { env } = require('process')
// const { Storage } = require('@google-cloud/storage')
// const { exec } = require('child_process')

import { Storage } from "@google-cloud/storage";
import { exec } from "child_process";
import fs from "fs";
import { env } from "process";


env.GOOGLE_APPLICATION_CREDENTIALS = "trading-cloud.json"

const SECONDS_IN_DAY = 24 * 60 * 60 * 1000

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// fs.readdir(`future`, (err, dirs) => {
//     for (let d of dirs) {
//         const SYMBOL = d.split('.')[0]
//         fs.readdir(`future/${d}`, (err, files) => {
//             for (let f of files) {
//                 const date = f.split(".")[0]
//                 fs.readFile(`future/${d}/${f}`, 'utf8', (err, data) => {
//                     if (err) {
//                         console.error(err)
//                         return
//                     }
//                     const lines = data.split("\n")
//                         .map(l => l.split(","))
//                         .map(l => [(parseInt(l[0] / 1000)) * 1000, l[1], l[1], l[1]])


//                     new Storage()
//                         .bucket('crypto-history')
//                         .file(`futures/${SYMBOL}/1s/${date}.csv`)
//                         .save(lines.map(l => l.join(',')).join('\n'), { resumable: false })
//                         .then(console.log)
//                         .catch(console.log);
//                 })
//                 if (new Date().getTime() - new Date(date).getTime() > SECONDS_IN_DAY) {
//                     exec(`rm future/${d}/${f}`)
//                 }
//             }
//         })
//     }
// })

fs.readdir(`logs`, (err, files) => {
    for (let f of files) {
        fs.readFile(`logs/${f}`, 'utf8', async (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            const date = f.split("T")[0]
            const hour = f.split("T")[1].split("~")[0]
            const botId = f.split("T")[1].split("~")[1]
            const bucketFileName = `${botId}/${date}/${hour}.json`
            await new Storage()
                .bucket('trading-bot-logs')
                .file(bucketFileName)
                .save(data, { resumable: false, metadata: { contentType: 'application/json' } })
                .then((r) => {
                    console.log(r)
                    exec(`rm logs/${f}`)
                })
                .catch(console.log);
            
           
        })
    }
})