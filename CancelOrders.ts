import { Bot } from "./Models";

const logger = require('log4js').getLogger("cancelOrders");


async function cancelOrders(bot: Bot) {
    const PAIR = bot.coin1 + bot.coin2
    if (bot.binance && bot.binance!.orders[PAIR]) {
        const openOrders = bot.binance!.orders[PAIR]
            .filter(o => o.status == "NEW" || o.status == "PARTIALLY_FILLED")
            .filter(x => x.positionSide == bot.positionSide())

        try {
            await Promise.all(openOrders.map(o =>
                bot.isFuture ?
                    bot.binance!.binance.futuresCancel(PAIR, { orderId: o.orderId.toString() }) :
                    bot.binance!.binance.cancel(PAIR, o.orderId)));
            logger.info("cancel order! => PAIR = ", PAIR, ", orderId = ");
        } catch (e: any) {
            // console.log(e.body)
            logger.error(e.body);
        }
    }
}

module.exports = cancelOrders