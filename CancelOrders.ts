import { Severity } from "coralogix-logger";
import { BotLogger } from "./Logger";
import { Bot } from "./Models";

async function cancelOrders(bot: Bot, pair?) {
    const PAIR = pair ? pair : (bot.coin1 + bot.coin2)
    if (bot.binance && bot.binance!.orders[PAIR]) {
        const openOrders = bot.binance!.orders[PAIR]
            .filter(o => o.status == "NEW" || o.status == "PARTIALLY_FILLED")
            .filter(x => x.positionSide == bot.positionSide())

        try {
            await Promise.all(openOrders.map(o =>
                bot.isFuture ?
                    bot.binance!.binance.futuresCancel(PAIR, { orderId: o.orderId.toString() }) :
                    bot.binance!.binance.cancel(PAIR, o.orderId)));

        } catch (e: any) {
            console.log("Cancel Error" + e.body)
            BotLogger.instance.error({
                type: "CancelError",
                bot_id: bot._id,
                coin: PAIR,
                message: e.body
            })
        }
    }
}

module.exports = cancelOrders