const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: process.argv[2],
  APISECRET: process.argv[3]
});
res = {}
Promise.all([
    binance.futuresAccount().then(r => res.account = r),
    binance.futuresOpenOrders().then(r => res.orders = r),
]).then(r => console.log(JSON.stringify(res)))
