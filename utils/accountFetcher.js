import Binance from 'node-binance-api';

const binance = new Binance().options({
    APIKEY: process.argv[2],
    APISECRET: process.argv[3],
});

let res = {}
const accountFetcher = async () => {
    const account = await binance.futuresAccount();
    res.account = account;
};

const ordersFetcher = async () => {
    const orders = await binance.futuresAllOrders();
    res.orders = orders;
};

Promise.all([accountFetcher(), ordersFetcher()]).then(() => {
    console.log(res);
}).catch(console.error);