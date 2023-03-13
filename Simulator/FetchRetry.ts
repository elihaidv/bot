
import fetch, { Response,RequestInit } from 'node-fetch';

export default async function fetchRetry(url, init?: RequestInit): Promise<Response> {
    let retry = 10

    while (retry > 0) {
        try {
            return await fetch(url,init)
        } catch (e) {
            retry = retry - 1
            if (retry === 0) {
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