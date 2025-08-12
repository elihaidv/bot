import { jest } from '@jest/globals';
import { Periodically } from '../../Workers/Periodically.js';
import { 
  createMockBot, 
  createMockExchangeInfo,
  mockSockets
} from '../mocks/index.js';

// Mock external dependencies
jest.mock('../../Sockets/Sockets.js', () => ({
  Sockets: mockSockets
}));

describe('Periodically', () => {
  let periodically: Periodically;
  let mockBot: any;
  let mockExchangeInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = createMockBot();
    mockExchangeInfo = createMockExchangeInfo();
    
    // Mock the sockets with order book data
    mockSockets.getInstance.mockReturnValue({
      prices: { 'BTCUSDT': 50000 },
      orderBooks: {
        'BTCUSDT': {
          bids: { '49000': 2.5, '48000': 1.0 },
          asks: { '51000': 1.5, '52000': 2.0 }
        }
      }
    });

    periodically = new Periodically(mockBot, mockExchangeInfo);
    
    // Mock inherited methods
    periodically.parseAllValues = jest.fn();
    periodically.buyBNB = jest.fn().mockResolvedValue(undefined);
    periodically.buildHistory = jest.fn();
    periodically.place_order = jest.fn().mockResolvedValue({});
    
    // Mock properties that would be set by parent classes
    periodically.isFirst = false;
    periodically.myLastBuyAvg = 48000;
  });

  describe('place', () => {
    beforeEach(() => {
      periodically.balance.set('USDT', { available: '1000' });
      periodically.orders = [{}]; // Non-empty orders array
    });

    it('should execute full trading cycle when all conditions are met', async () => {
      await periodically.place();

      expect(periodically.parseAllValues).toHaveBeenCalled();
      expect(periodically.buyBNB).toHaveBeenCalled();
      expect(periodically.buildHistory).toHaveBeenCalled();
      expect(periodically.place_order).toHaveBeenCalled();
    });

    it('should return early if binance is not available', async () => {
      periodically.binance = null;

      await periodically.place();

      expect(periodically.parseAllValues).not.toHaveBeenCalled();
      expect(periodically.place_order).not.toHaveBeenCalled();
    });

    it('should return early if balance is not available', async () => {
      periodically.balance.delete('USDT');

      await periodically.place();

      expect(periodically.parseAllValues).not.toHaveBeenCalled();
      expect(periodically.place_order).not.toHaveBeenCalled();
    });

    it('should return early if orders array is empty', async () => {
      periodically.orders = [];

      await periodically.place();

      expect(periodically.parseAllValues).not.toHaveBeenCalled();
      expect(periodically.place_order).not.toHaveBeenCalled();
    });

    it('should return early if prices are not available', async () => {
      mockSockets.getInstance.mockReturnValue({
        prices: {},
        orderBooks: {
          'BTCUSDT': {
            bids: { '49000': 2.5 },
            asks: { '51000': 1.5 }
          }
        }
      });
      periodically.sockets = mockSockets.getInstance();

      await periodically.place();

      expect(periodically.parseAllValues).not.toHaveBeenCalled();
      expect(periodically.place_order).not.toHaveBeenCalled();
    });

    it('should return early if order books are not available', async () => {
      mockSockets.getInstance.mockReturnValue({
        prices: { 'BTCUSDT': 50000 },
        orderBooks: {}
      });
      periodically.sockets = mockSockets.getInstance();

      await periodically.place();

      expect(periodically.parseAllValues).not.toHaveBeenCalled();
      expect(periodically.place_order).not.toHaveBeenCalled();
    });
  });

  describe('placeOrder', () => {
    beforeEach(() => {
      periodically.sockets = mockSockets.getInstance();
      periodically.isFirst = false;
      periodically.myLastBuyAvg = 48000;
    });

    it('should use highest bid price as max buy price', async () => {
      await periodically.placeOrder();

      // Highest bid should be 49000 based on mock data
      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number), // quantity calculated as 12/maxBuyPrice
        49000, // maxBuyPrice
        expect.any(Boolean)
      );
    });

    it('should calculate quantity as 12 divided by max buy price', async () => {
      const expectedMaxBuyPrice = 49000;
      const expectedQuantity = 12 / expectedMaxBuyPrice;

      await periodically.placeOrder();

      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        expectedQuantity,
        expectedMaxBuyPrice,
        expect.any(Boolean)
      );
    });

    it('should determine side based on isFirst or price comparison', async () => {
      // Case 1: isFirst is true
      periodically.isFirst = true;
      periodically.myLastBuyAvg = 50000; // Higher than max buy price

      await periodically.placeOrder();

      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number),
        expect.any(Number),
        true // side should be true when isFirst is true
      );
    });

    it('should determine side based on price comparison when not first', async () => {
      // Case 2: myLastBuyAvg > maxBuyPrice
      periodically.isFirst = false;
      periodically.myLastBuyAvg = 50000; // Higher than max buy price (49000)

      await periodically.placeOrder();

      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number),
        expect.any(Number),
        true // side should be true when myLastBuyAvg > maxBuyPrice
      );
    });

    it('should use false side when myLastBuyAvg is lower than max buy price', async () => {
      periodically.isFirst = false;
      periodically.myLastBuyAvg = 45000; // Lower than max buy price (49000)

      await periodically.placeOrder();

      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number),
        expect.any(Number),
        false // side should be false when myLastBuyAvg <= maxBuyPrice
      );
    });

    it('should handle empty order book gracefully', async () => {
      mockSockets.getInstance.mockReturnValue({
        prices: { 'BTCUSDT': 50000 },
        orderBooks: {
          'BTCUSDT': {
            bids: {},
            asks: {}
          }
        }
      });
      periodically.sockets = mockSockets.getInstance();

      await periodically.placeOrder();

      // Should handle parsing undefined/NaN gracefully
      expect(periodically.place_order).toHaveBeenCalled();
    });

    it('should handle multiple bid levels correctly', async () => {
      mockSockets.getInstance.mockReturnValue({
        prices: { 'BTCUSDT': 50000 },
        orderBooks: {
          'BTCUSDT': {
            bids: { 
              '49500': 1.0,  // This should be the highest (first key)
              '49000': 2.5, 
              '48000': 1.0 
            },
            asks: { '51000': 1.5 }
          }
        }
      });
      periodically.sockets = mockSockets.getInstance();

      await periodically.placeOrder();

      // Should use the first (highest) bid price
      expect(periodically.place_order).toHaveBeenCalledWith(
        'USDT',
        12 / 49500, // quantity
        49500, // maxBuyPrice (highest bid)
        expect.any(Boolean)
      );
    });
  });

  describe('inheritance from WeightAvg', () => {
    it('should inherit WeightAvg properties and methods', () => {
      expect(periodically.FIRST).toBe('BTC');
      expect(periodically.SECOND).toBe('USDT');
      expect(periodically.PAIR).toBe('BTCUSDT');
    });

    it('should have access to inherited methods', () => {
      expect(typeof periodically.parseAllValues).toBe('function');
      expect(typeof periodically.buildHistory).toBe('function');
      expect(typeof periodically.buyBNB).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle place_order errors gracefully', async () => {
      periodically.balance.set('USDT', { available: '1000' });
      periodically.orders = [{}];
      periodically.place_order = jest.fn().mockRejectedValue(new Error('Order failed'));

      await expect(periodically.place()).resolves.not.toThrow();
    });

    it('should handle buyBNB errors gracefully', async () => {
      periodically.balance.set('USDT', { available: '1000' });
      periodically.orders = [{}];
      periodically.buyBNB = jest.fn().mockRejectedValue(new Error('BNB purchase failed'));

      await expect(periodically.place()).resolves.not.toThrow();
    });

    it('should handle missing order book data', async () => {
      periodically.balance.set('USDT', { available: '1000' });
      periodically.orders = [{}];
      
      mockSockets.getInstance.mockReturnValue({
        prices: { 'BTCUSDT': 50000 },
        orderBooks: {
          'BTCUSDT': null
        }
      });
      periodically.sockets = mockSockets.getInstance();

      await expect(periodically.place()).resolves.not.toThrow();
    });
  });

  describe('trading logic', () => {
    it('should execute trading steps in correct order', async () => {
      const callOrder: string[] = [];
      
      periodically.parseAllValues = jest.fn(() => callOrder.push('parseAllValues'));
      periodically.buyBNB = jest.fn().mockImplementation(() => {
        callOrder.push('buyBNB');
        return Promise.resolve();
      });
      periodically.buildHistory = jest.fn(() => callOrder.push('buildHistory'));
      periodically.place_order = jest.fn().mockImplementation(() => {
        callOrder.push('placeOrder');
        return Promise.resolve({});
      });

      periodically.balance.set('USDT', { available: '1000' });
      periodically.orders = [{}];

      await periodically.place();

      expect(callOrder).toEqual(['parseAllValues', 'buyBNB', 'buildHistory', 'placeOrder']);
    });
  });
});