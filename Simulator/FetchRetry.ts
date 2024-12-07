
import fetch, { Response,RequestInit } from 'node-fetch';

export default async function fetchRetry(url, init?: RequestInit): Promise<Response> {
    let retry = 10

    while (retry > 0) {
        try {
            return await fetchWithTimeout(url, init, 30000)
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

const fetchWithTimeout = async (
    url: string,
    init: RequestInit = {},
    timeout: number = 30000
  ): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const agent = new (fetch as any).Agent({ keepAlive: true });

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        agent
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error; // Re-throw other errors
    } finally {
      clearTimeout(id); // Clean up the timeout
    }
  };
  