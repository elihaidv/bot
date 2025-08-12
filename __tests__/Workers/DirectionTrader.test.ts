import { jest } from '@jest/globals';
import { DirectionTrader } from '../../Workers/DirectionTrader.js';
import { BotStatus } from '../../Models.js';
import { 
  createMockBot, 
  createMockExchangeInfo, 
  createMockOrder,
  mockSocketsFutures
} from '../mocks/index.js';

// Mock external dependencies
jest.mock('../../Sockets/SocketsFuture.js', () => ({
  SocketsFutures: mockSocketsFutures
}));

describe('DirectionTrader', () => {
  let trader: DirectionTrader;
  let mockBot: any;
  let mockExchangeInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = createMockBot({ 
      isFuture: true, 
      leverage: 10,
      buy_percent: 0.01,
      amount_percent: 0.1,
      last_distance: 0.005,
      take_profit: 0.02,
      stop_loose: 0.01,
      callbackRate: 1,
      direction: false
    });
    mockExchangeInfo = createMockExchangeInfo();
    
    // Mock the futures sockets
    mockSocketsFutures.getFInstance.mockReturnValue({
      prices: { 'BTCUSDT': 50000 },
      markPrices: { 'BTCUSDT': 50000 }
    });

    trader = new DirectionTrader(mockBot, mockExchangeInfo);
    
    // Mock inherited methods
    trader.parseAllValues = jest.fn();
    trader.calculatePrice = jest.fn();
    trader.buildHistory = jest.fn();
    trader.place_order = jest.fn().mockResolvedValue({});
    trader.setDirection = jest.fn();
    trader.add = jest.fn((a, b) => a + b);
    trader.sub = jest.fn((a, b) => a - b);
    trader.maxFunc = jest.fn((a, b) => Math.max(a, b));
    trader.minFunc = jest.fn((a, b) => Math.min(a, b));
    trader.roundPrice = jest.fn((price) => Math.round(price * 100) / 100);
  });

  describe('place', () => {
    beforeEach(() => {
      trader.orders = [{}];
      trader.balance.set('USDT', { available: '1000' });
      trader.futureSockets.prices['BTCUSDT'] = 50000;
    });

    it('should return early if required conditions are not met', async () => {
      trader.binance = null;

      await trader.place();

      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });

    it('should execute buy logic when no position exists', async () => {
      trader.positionAmount = 0;

      await trader.place();

      expect(trader.parseAllValues).toHaveBeenCalled();
      expect(trader.calculatePrice).toHaveBeenCalled();
      expect(trader.buildHistory).toHaveBeenCalled();
      
      // Should call setDirection twice for both directions
      expect(trader.setDirection).toHaveBeenCalledWith(false);
      expect(trader.setDirection).toHaveBeenCalledWith(true);
      expect(trader.setDirection).toHaveBeenCalledTimes(2);
    });

    it('should execute sell logic when position exists', async () => {
      trader.positionAmount = 1.5;
      trader.positionDirection = 'LONG';

      await trader.place();

      expect(trader.parseAllValues).toHaveBeenCalled();
      expect(trader.calculatePrice).toHaveBeenCalled();
      expect(trader.buildHistory).toHaveBeenCalled();
      
      // Should set direction to current position direction
      expect(trader.setDirection).toHaveBeenCalledWith('LONG');
      expect(trader.setDirection).toHaveBeenCalledTimes(1);
    });

    it('should set bot status to STABLE when no errors', async () => {
      trader.positionAmount = 0;
      trader.error = false;

      await trader.place();

      expect(trader.bot.botStatus).toBe(BotStatus.STABLE);
    });

    it('should not set bot status to STABLE when there are errors', async () => {
      trader.positionAmount = 0;
      trader.error = true;
      const originalStatus = trader.bot.botStatus;

      await trader.place();

      expect(trader.bot.botStatus).toBe(originalStatus);
    });

    it('should handle missing balance gracefully', async () => {
      trader.balance.delete('USDT');

      await trader.place();

      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });

    it('should handle missing prices gracefully', async () => {
      delete trader.futureSockets.prices['BTCUSDT'];

      await trader.place();

      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });

    it('should handle empty orders array', async () => {
      trader.orders = [];

      await trader.place();

      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });
  });

  describe('placeBuy', () => {
    beforeEach(() => {
      trader.balance.set('USDT', { available: '1000' });
      trader.futureSockets.markPrices['BTCUSDT'] = 50000;
      trader.bot.leverage = 10;
      trader.bot.amount_percent = 0.1;
      trader.bot.buy_percent = 0.01;
      trader.bot.last_distance = 0.005;
    });

    it('should place buy order with stop market type', async () => {
      await trader.placeBuy();

      expect(trader.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number), // quantity
        0, // price (0 for stop orders)
        true, // !this.bot.direction
        expect.objectContaining({
          type: 'STOP_MARKET',
          stopPrice: expect.any(Number)
        })
      );
    });

    it('should calculate quantity based on leveraged balance', async () => {
      const balance = 1000;
      const leverage = 10;
      const amountPercent = 0.1;
      const expectedQuantity = balance * leverage * amountPercent; // 1000

      await trader.placeBuy();

      expect(trader.place_order).toHaveBeenCalledWith(
        'USDT',
        expectedQuantity,
        0,
        expect.any(Boolean),
        expect.any(Object)
      );
    });

    it('should use last order price when available', async () => {
      const mockLastOrder = createMockOrder({ 
        price: '49000',
        orderPrice: jest.fn().mockReturnValue(49000)
      });
      trader.myLastOrder = mockLastOrder;
      trader.add.mockReturnValue(49000 * (1 + 0.005));

      await trader.placeBuy();

      expect(trader.add).toHaveBeenCalledWith(1, 0.005);
      expect(trader.maxFunc).toHaveBeenCalled();
    });

    it('should use mark price when no last order exists', async () => {
      trader.myLastOrder = undefined;
      const markPrice = 50000;
      trader.add.mockReturnValue(markPrice * (1 + 0.01));

      await trader.placeBuy();

      expect(trader.add).toHaveBeenCalledWith(1, 0.01);
      expect(trader.maxFunc).toHaveBeenCalledWith(
        markPrice * (1 + 0.01),
        markPrice
      );
    });

    it('should use correct direction based on bot direction', async () => {
      trader.bot.direction = false;

      await trader.placeBuy();

      expect(trader.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number),
        0,
        true, // !false = true
        expect.any(Object)
      );
    });

    it('should handle Math.abs for quantity calculation', async () => {
      // Test case where quantity might be negative
      trader.bot.amount_percent = -0.1;
      const expectedQuantity = Math.abs(1000 * 10 * -0.1); // 1000

      await trader.placeBuy();

      expect(trader.place_order).toHaveBeenCalledWith(
        'USDT',
        expectedQuantity,
        0,
        expect.any(Boolean),
        expect.any(Object)
      );
    });
  });

  describe('placeSell', () => {
    beforeEach(() => {
      trader.positionAmount = 2.0;
      trader.positionEntry = 49000;
      trader.futureSockets.markPrices['BTCUSDT'] = 50000;
      trader.bot.callbackRate = 1;
      trader.bot.take_profit = 0.02;
      trader.bot.stop_loose = 0.01;
      trader.bot.direction = false;
    });

    it('should place trailing stop market order', async () => {
      const expectedActivationPrice = trader.positionEntry * (1 + trader.bot.callbackRate / 100);
      trader.add.mockReturnValue(1 + trader.bot.callbackRate / 100);
      trader.maxFunc.mockReturnValue(expectedActivationPrice);
      trader.roundPrice.mockReturnValue(expectedActivationPrice);

      await trader.placeSell();

      expect(trader.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        trader.positionAmount * 2, // 4.0
        0,
        false, // !!false = false
        expect.objectContaining({
          type: 'TRAILING_STOP_MARKET',
          activationPrice: expectedActivationPrice,
          callbackRate: trader.bot.callbackRate
        })
      );
    });

    it('should place take profit stop market order', async () => {
      const expectedTakeProfitPrice = trader.positionEntry * (1 + trader.bot.take_profit);
      trader.add.mockReturnValue(1 + trader.bot.take_profit);
      trader.roundPrice.mockReturnValue(expectedTakeProfitPrice);

      await trader.placeSell();

      expect(trader.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        trader.positionAmount * 2, // 4.0
        0,
        false, // !!false = false
        expect.objectContaining({
          type: 'STOP_MARKET',
          stopPrice: expectedTakeProfitPrice
        })
      );
    });

    it('should place stop loss order when error exists', async () => {
      trader.error = true;
      const expectedStopLossPrice = trader.positionEntry * (1 - trader.bot.stop_loose);
      trader.sub.mockReturnValue(1 - trader.bot.stop_loose);
      trader.minFunc.mockReturnValue(expectedStopLossPrice);
      trader.roundPrice.mockReturnValue(expectedStopLossPrice);

      await trader.placeSell();

      expect(trader.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        0,
        0,
        false, // !!false = false
        expect.objectContaining({
          type: 'STOP_MARKET',
          stopPrice: expectedStopLossPrice,
          closePosition: true
        })
      );
    });

    it('should not place stop loss order when no error', async () => {
      trader.error = false;

      await trader.placeSell();

      // Should only place 2 orders (trailing stop and take profit), not 3
      expect(trader.place_order).toHaveBeenCalledTimes(2);
    });

    it('should handle different directions correctly', async () => {
      trader.bot.direction = true;

      await trader.placeSell();

      expect(trader.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        expect.any(Number),
        0,
        true, // !!true = true
        expect.any(Object)
      );
    });

    it('should calculate activation price correctly', async () => {
      const positionEntry = 49000;
      const callbackRate = 1;
      const expectedMultiplier = 1 + callbackRate / 100; // 1.01
      
      trader.add.mockReturnValue(expectedMultiplier);

      await trader.placeSell();

      expect(trader.add).toHaveBeenCalledWith(1, callbackRate / 100);
    });
  });

  describe('error handling', () => {
    it('should handle place_order errors in placeBuy gracefully', async () => {
      trader.place_order = jest.fn().mockRejectedValue(new Error('Order failed'));

      await expect(trader.placeBuy()).resolves.not.toThrow();
    });

    it('should handle place_order errors in placeSell gracefully', async () => {
      trader.positionAmount = 2.0;
      trader.positionEntry = 49000;
      trader.place_order = jest.fn().mockRejectedValue(new Error('Order failed'));

      await expect(trader.placeSell()).resolves.not.toThrow();
    });

    it('should handle missing mark prices gracefully', async () => {
      delete trader.futureSockets.markPrices['BTCUSDT'];

      await expect(trader.placeBuy()).resolves.not.toThrow();
    });
  });

  describe('inheritance from FutureTrader', () => {
    it('should inherit all FutureTrader properties', () => {
      expect(trader.positionAmount).toBeDefined();
      expect(trader.positionEntry).toBeDefined();
      expect(trader.futureSockets).toBeDefined();
    });

    it('should have access to inherited utility methods', () => {
      expect(typeof trader.add).toBe('function');
      expect(typeof trader.sub).toBe('function');
      expect(typeof trader.maxFunc).toBe('function');
      expect(typeof trader.minFunc).toBe('function');
      expect(typeof trader.roundPrice).toBe('function');
    });
  });

  describe('trading logic flow', () => {
    it('should execute correct sequence for new position', async () => {
      trader.positionAmount = 0;
      const placeBuySpy = jest.spyOn(trader, 'placeBuy').mockResolvedValue();

      await trader.place();

      expect(trader.setDirection).toHaveBeenNthCalledWith(1, false);
      expect(placeBuySpy).toHaveBeenCalledTimes(2);
      expect(trader.setDirection).toHaveBeenNthCalledWith(2, true);
    });

    it('should execute correct sequence for existing position', async () => {
      trader.positionAmount = 1.5;
      trader.positionDirection = 'SHORT';
      const placeSellSpy = jest.spyOn(trader, 'placeSell').mockResolvedValue();

      await trader.place();

      expect(trader.setDirection).toHaveBeenCalledWith('SHORT');
      expect(placeSellSpy).toHaveBeenCalledTimes(1);
    });
  });
});