import { jest } from '@jest/globals';
import fetchRetry from '../../Simulator/FetchRetry.js';
import { mockFetch } from '../mocks/simulation.js';

// Mock node-fetch
jest.mock('node-fetch', () => mockFetch);

describe('FetchRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('successful requests', () => {
    it('should return response on first successful attempt', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await fetchRetry('https://api.example.com/data');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);
      expect(response).toBe(mockResponse);
    });

    it('should pass through request init options', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      };

      await fetchRetry('https://api.example.com/data', requestInit);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data', 
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on network error and eventually succeed', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const responsePromise = fetchRetry('https://api.example.com/data');

      // Fast-forward through the delays
      jest.advanceTimersByTime(6000); // Two 3-second delays

      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response).toBe(mockResponse);
    });

    it('should retry up to 10 times before giving up', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      const responsePromise = fetchRetry('https://api.example.com/data');

      // Fast-forward through all delays (9 retries with 3-second delays each)
      jest.advanceTimersByTime(27000);

      await expect(responsePromise).rejects.toThrow('Persistent network error');
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should wait 3 seconds between retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const responsePromise = fetchRetry('https://api.example.com/data');

      // After first failure, should not have retried yet
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance by 2.9 seconds - should not retry yet
      jest.advanceTimersByTime(2900);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance by remaining 100ms - should retry now
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Clean up
      jest.advanceTimersByTime(30000);
      await expect(responsePromise).rejects.toThrow();
    });
  });

  describe('timeout handling', () => {
    it('should timeout requests after 30 seconds by default', async () => {
      let abortController: AbortController;
      mockFetch.mockImplementation((url, init: any) => {
        abortController = { signal: init.signal } as AbortController;
        return new Promise((resolve, reject) => {
          // Simulate a request that never completes
          init.signal.addEventListener('abort', () => {
            const error = new DOMException('The operation was aborted.', 'AbortError');
            reject(error);
          });
        });
      });

      const responsePromise = fetchRetry('https://api.example.com/slow-endpoint');

      // Advance time to trigger timeout
      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow('Request timed out after 30000ms');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle AbortError correctly', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);

      const responsePromise = fetchRetry('https://api.example.com/data');

      // Fast-forward through retries
      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow('Request timed out after 30000ms');
    });
  });

  describe('error handling', () => {
    it('should propagate errors after all retries are exhausted', async () => {
      const persistentError = new Error('API is down');
      mockFetch.mockRejectedValue(persistentError);

      const responsePromise = fetchRetry('https://api.example.com/data');

      // Fast-forward through all retries
      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow('API is down');
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should handle different types of errors', async () => {
      // Test with TypeError (common network error)
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError);

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const responsePromise = fetchRetry('https://api.example.com/data');

      jest.advanceTimersByTime(3000);

      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response).toBe(mockResponse);
    });

    it('should log errors during retries', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockFetch.mockRejectedValue(new Error('Network error'));

      const responsePromise = fetchRetry('https://api.example.com/data');

      // Fast-forward through all retries
      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow('Network error');

      // Should log "pausing.." and "done pausing..." for each retry
      expect(consoleSpy).toHaveBeenCalledWith('pausing..');
      expect(consoleSpy).toHaveBeenCalledWith('done pausing...');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty URL', async () => {
      mockFetch.mockRejectedValue(new Error('Invalid URL'));

      const responsePromise = fetchRetry('');

      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow('Invalid URL');
    });

    it('should handle null/undefined request init', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await fetchRetry('https://api.example.com/data', null as any);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };

      // Fail, succeed, (shouldn't reach third)
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(mockResponse);

      const responsePromise = fetchRetry('https://api.example.com/data');

      jest.advanceTimersByTime(3000);

      const response = await responsePromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response).toBe(mockResponse);
    });
  });

  describe('performance and resource cleanup', () => {
    it('should properly clean up timeouts on success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      await fetchRetry('https://api.example.com/data');

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should properly clean up timeouts on error', async () => {
      mockFetch.mockRejectedValue(new Error('Error'));

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const responsePromise = fetchRetry('https://api.example.com/data');

      jest.advanceTimersByTime(30000);

      await expect(responsePromise).rejects.toThrow();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });
});