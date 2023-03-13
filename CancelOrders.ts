import { Severity } from "coralogix-logger";
import { BotLogger } from "./Logger.js";
import { Bot } from "./Models";

export default async function cancelOrders(bot: Bot, pair?) {
    const PAIR = pair ? pair : (bot.coin1 + bot.coin2)
    if (bot.binance && bot.binance!.orders[PAIR]) {
        const openOrders = bot.binance!.orders[PAIR]
            .filter(o => o.status == "NEW" || o.status == "PARTIALLY_FILLED")
            .filter(x => x.positionSide == bot.positionSide())

        try {
            await (bot.isFuture ?  bot.binance!.binance.futuresCancelAll(PAIR):
                    Promise.all(openOrders.map(o =>
                        bot.binance!.binance.cancel(PAIR, o.orderId))));

        } catch (e: any) {
            console.error("Cancel Error" + e.body)
            BotLogger.instance.error({
                type: "CancelError",
                bot_id: bot._id,
                coin: PAIR,
                message: e.body,
                ids: openOrders.map(o => o.orderId),
            })
        }
    }
}
