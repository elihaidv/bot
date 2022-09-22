const fs = require('fs/promises')
const cf = require('node-fetch-cache')
const fetch = cf.fetchBuilder.withCache(new cf.FileSystemCache({
    cacheDirectory: '/tmp/simcache',
}));



async function main() {
    const regex = '📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\\|Loss:(.*)'
    const data = await fs.readFile('/home/elihai/Downloads/ChatExport_2022-09-20/result.json', 'utf8')

    let balance = 10000
    const messages = JSON.parse(data).messages
    for (const message of messages) {
        if (message.type == 'message' && message.text) {
            const lines = message.text.map((x) => x.text || x).join('').replace(/\s/g, '')
            const match = lines.match(regex)
            if (match) {
                let time = message.date_unixtime * 1000
                console.log(`Signaling: ${match[5]}${match[1]}/${match[2]}-${new Date(time)}`)
                const sign = match[4] == 'Bullish' ? 1 : -1
                const enters = [parseFloat(match[7]), (parseFloat(match[7]) + parseFloat(match[8])) / 2, parseFloat(match[8])]
                const targets = [parseFloat(match[9]), parseFloat(match[10]), parseFloat(match[11]), parseFloat(match[12]), parseFloat(match[13]), parseFloat(match[14])]
                let enterCount = 0
                let exitCount = 0
                let stopExit = false

                while (enterCount < enters.length && exitCount < targets.length && !stopExit) {
                    const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${match[1]}${match[2]}&interval=1m&startTime=${time}&limit=1000`)
                        .then((x) => x.json())

                    

                    for (const candle of res) {
                        const high = parseFloat(candle[2])
                        const low = parseFloat(candle[3])

                        if (!exitCount && enterCount < enters.length) {
                            if (high > enters[enterCount] && low < enters[enterCount]) {
                                console.log("Open Position", enters[enterCount])
                                enterCount++
                            }
                        }
                        if (enterCount && exitCount < targets.length) {
                            if (high > targets[exitCount] && low < targets[exitCount]) {
                                console.log("Close Position. ", targets[exitCount])
                                exitCount++
                            }
                            if (high > match[15] && low < match[15]) {
                                console.log("StopLoss.", match[15])
                                stopExit = true
                                break
                            }

                        }
                    }
                    if (res[res.length - 1][0] - message.date_unixtime * 1000 > 1000 * 60 * 60 * 24 * 3) {
                        console.log("No data for 3 days. Stop")
                        if (exitCount < targets.length) {
                            targets[exitCount] = parseFloat(res[res.length - 1][4])
                            console.log("Close Position. ",  parseFloat(res[res.length - 1][4]))
                            exitCount++
                        }
                        break
                    } else {
                        time = res[res.length - 1][0]
                    }
                }
                let avgEnter = enterCount > 0 ? enters.slice(0, enterCount).reduce((a, b) => a + b, 0) / enterCount : 0
                let avgExit = exitCount > 0 ? targets.slice(0, exitCount).reduce((a, b) => a + b, 0) / exitCount : 0

                if (stopExit){
                    avgExit = (avgExit * exitCount + match[15] * (6 - exitCount)) / 6
                    
                }

                if (avgEnter && avgExit) {
                    const profit = ((avgExit - avgEnter) / avgEnter) * 100 * sign
                    const amount = (balance / 10)  * enterCount
                    balance += (amount * (1 + profit / 100)) - amount
                    console.log(`Profit: ${profit.toFixed(2)}%  Balance: ${balance.toFixed(2)}`)
                }


            }

        }
    }

}
main()