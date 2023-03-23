import { parse } from 'node-html-parser';
import fetch from 'node-fetch';

const fetchOldestHistory = async (url) => {
    const response = await fetch("https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?delimiter=/&prefix=data/spot/daily/klines/MATICUSDT/1s/").then(res => res.text());

    const root = parse(response);

    const arr = root.childNodes[1].childNodes

    console.log(arr[7].childNodes[0].textContent.split("-1s-")[1].split(".")[0])

};

fetchOldestHistory();