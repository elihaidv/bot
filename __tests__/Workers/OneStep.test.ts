import { jest } from '@jest/globals';
import { OneStep } from '../../Workers/OneStep.js';
import { BotStatus } from '../../Models.js';
import { 
  createMockBot, 
  createMockExchangeInfo,
  mockBotLogger,
  mockSocketsFutures
} from '../mocks/index.js';

// Mock external dependencies
jest.mock('../../Logger.js', () => ({
  BotLogger: mockBotLogger
}));

jest.mock('../../Sockets/SocketsFuture.js', () => ({
  SocketsFutures: mockSocketsFutures
}));

describe('OneStep', () => {
  let oneStep: OneStep;
  let mockBot: any;
  let mockExchangeInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = createMockBot({ 
      isFuture: true, 
      leverage: 10,
      buy_percent: 0.01,
      amount_percent: 0.1,
      SMA: 20,
      take_profit: 0.02,
      stop_loose: 0.01,
      direction: false // BUY direction
    });
    mockExchangeInfo = createMockExchangeInfo();
    
    // Mock the futures sockets
    mockSocketsFutures.getFInstance.mockReturnValue({
      prices: { 'BTCUSDT': 50000 },
      markPrices: { 'BTCUSDT': 50000 },
      averagePrice: jest.fn().mockReturnValue(49800)
    });

    oneStep = new OneStep(mockBot, mockExchangeInfo);
    
    // Mock inherited methods
    oneStep.place_order = jest.fn().mockResolvedValue({});
    oneStep.sub = jest.fn((a, b) => a - b);
    oneStep.minFunc = jest.fn((a, b) => Math.min(a, b));
    oneStep.maxFunc = jest.fn((a, b) => Math.max(a, b));
    oneStep.add = jest.fn((a, b) => a + b);
    oneStep.roundPrice = jest.fn((price) => Math.round(price * 100) / 100);
  });

  describe('placeBuy', () => {
    beforeEach(() => {
      oneStep.positionAmount = 0; // No existing position
      oneStep.balance.set('USDT', { available: '1000' });
      oneStep.futureSockets.markPrices['BTCUSDT'] = 50000;
      oneStep.futureSockets.averagePrice = jest.fn().mockReturnValue(49800);
    });

    it('should place buy order when no position exists', async () => {
      await oneStep.placeBuy();

      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BeforeBuy - OneStep',
          bot_id: oneStep.bot._id,
          markPrice: 50000,
          positionAmount: 0
        })
      );

      expect(oneStep.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number), // quantity
        expect.any(Number), // price
        true, // direction (inverted from bot.direction)
        {}
      );
    });

    it('should not place buy order when position already exists', async () => {
      oneStep.positionAmount = 1.5; // Existing position

      await oneStep.placeBuy();

      expect(oneStep.place_order).not.toHaveBeenCalled();
      expect(mockBotLogger.instance.log).not.toHaveBeenCalled();
    });

    it('should calculate buy price correctly', async () => {
      const markPrice = 50000;
      const buyPercent = 0.01;
      const expectedFBuyPrice = markPrice * (1 - buyPercent); // 49500
      const expectedAverage = 49800;
      const expectedBuyPrice = Math.min(expectedFBuyPrice, expectedAverage); // 49500

      oneStep.sub.mockReturnValue(1 - buyPercent);
      oneStep.minFunc.mockReturnValue(expectedBuyPrice);

      await oneStep.placeBuy();

      expect(oneStep.sub).toHaveBeenCalledWith(1, buyPercent);
      expect(oneStep.minFunc).toHaveBeenCalledWith(expectedFBuyPrice, expectedAverage);
    });

    it('should calculate quantity based on leveraged balance', async () => {
      const balance = 1000;
      const leverage = 10;
      const amountPercent = 0.1;
      const expectedLeveragedBalance = balance * leverage; // 10000
      const buyPrice = 49500;
      const expectedQuantity = (expectedLeveragedBalance * amountPercent) / buyPrice;

      oneStep.minFunc.mockReturnValue(buyPrice);

      await oneStep.placeBuy();

      expect(oneStep.place_order).toHaveBeenCalledWith(
        'USDT',
        expect.any(Number),
        buyPrice,
        true,
        {}
      );
    });

    it('should log detailed buy information', async () => {
      await oneStep.placeBuy();

      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BeforeBuy - OneStep',
          bot_id: oneStep.bot._id,
          markPrice: expect.any(Number),
          balance: expect.any(String),
          positionAmount: 0,
          positionEntry: 0,
          direction: false
        })
      );
    });
  });

  describe('placeSell', () => {
    beforeEach(() => {
      oneStep.positionAmount = 1.5;
      oneStep.positionEntry = 49000;
      oneStep.futureSockets.markPrices['BTCUSDT'] = 50000;
      oneStep.bot.take_profit = 0.02;
      oneStep.bot.stop_loose = 0.01;
      oneStep.bot.direction = false;
    });

    it('should place take profit order', async () => {
      const expectedTakeProfitPrice = oneStep.positionEntry * (1 + oneStep.bot.take_profit);
      oneStep.add.mockReturnValue(1 + oneStep.bot.take_profit);
      oneStep.maxFunc.mockReturnValue(expectedTakeProfitPrice);
      oneStep.roundPrice.mockReturnValue(expectedTakeProfitPrice);

      await oneStep.placeSell();

      expect(oneStep.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        0,
        0,
        true, // opposite of bot.direction
        expect.objectContaining({
          type: 'TAKE_PROFIT_MARKET',
          stopPrice: expectedTakeProfitPrice,
          closePosition: true
        })
      );
    });

    it('should place stop loss order', async () => {
      const expectedStopLossPrice = oneStep.positionEntry * (1 - oneStep.bot.stop_loose);
      oneStep.sub.mockReturnValue(1 - oneStep.bot.stop_loose);
      oneStep.minFunc.mockReturnValue(expectedStopLossPrice);
      oneStep.roundPrice.mockReturnValue(expectedStopLossPrice);

      await oneStep.placeSell();

      expect(oneStep.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        0,
        0,
        true, // opposite of bot.direction
        expect.objectContaining({
          type: 'STOP_MARKET',
          stopPrice: expectedStopLossPrice,
          closePosition: true
        })
      );
    });

    it('should log sell information before placing orders', async () => {
      await oneStep.placeSell();

      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BeforeSell - OneStep',
          bot_id: oneStep.bot._id,
          markPrice: 50000,
          positionAmount: 1.5,
          positionEntry: 49000,
          direction: false
        })
      );
    });

    it('should set bot status to STABLE when no errors', async () => {
      oneStep.error = false;

      await oneStep.placeSell();

      expect(oneStep.bot.botStatus).toBe(BotStatus.STABLE);
    });

    it('should not set bot status to STABLE when there are errors', async () => {
      oneStep.error = true;
      const originalStatus = oneStep.bot.botStatus;

      await oneStep.placeSell();

      expect(oneStep.bot.botStatus).toBe(originalStatus);
    });

    it('should handle different directions correctly', async () => {
      oneStep.bot.direction = true; // SELL direction

      await oneStep.placeSell();

      // Should place orders with false (opposite direction)
      expect(oneStep.place_order).toHaveBeenCalledWith(
        'BTCUSDT',
        0,
        0,
        false, // opposite of bot.direction (true)
        expect.any(Object)
      );
    });
  });

  describe('price calculations', () => {
    beforeEach(() => {
      oneStep.positionEntry = 50000;
      oneStep.bot.take_profit = 0.02;
      oneStep.bot.stop_loose = 0.01;
      oneStep.futureSockets.markPrices['BTCUSDT'] = 51000;
    });

    it('should calculate take profit price correctly', async () => {
      const positionEntry = 50000;
      const takeProfit = 0.02;
      const markPrice = 51000;
      
      oneStep.add.mockReturnValue(1 + takeProfit);
      oneStep.maxFunc.mockReturnValue(Math.max(positionEntry * (1 + takeProfit), markPrice));
      oneStep.roundPrice.mockReturnValue(51000);

      await oneStep.placeSell();

      expect(oneStep.add).toHaveBeenCalledWith(1, takeProfit);
      expect(oneStep.maxFunc).toHaveBeenCalled();
      expect(oneStep.roundPrice).toHaveBeenCalled();
    });

    it('should calculate stop loss price correctly', async () => {
      const positionEntry = 50000;
      const stopLoose = 0.01;
      const markPrice = 51000;
      
      oneStep.sub.mockReturnValue(1 - stopLoose);
      oneStep.minFunc.mockReturnValue(Math.min(positionEntry * (1 - stopLoose), markPrice));
      oneStep.roundPrice.mockReturnValue(49500);

      await oneStep.placeSell();

      expect(oneStep.sub).toHaveBeenCalledWith(1, stopLoose);
      expect(oneStep.minFunc).toHaveBeenCalled();
      expect(oneStep.roundPrice).toHaveBeenCalled();
    });
  });

  describe('inheritance from FutureTrader', () => {
    it('should inherit all FutureTrader properties', () => {
      expect(oneStep.positionAmount).toBeDefined();
      expect(oneStep.positionEntry).toBeDefined();
      expect(oneStep.futureSockets).toBeDefined();
    });

    it('should inherit place method from FutureTrader', () => {
      expect(typeof oneStep.place).toBe('function');
    });

    it('should inherit getAction method from FutureTrader', () => {
      expect(typeof oneStep.getAction).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle place_order errors gracefully in placeBuy', async () => {
      oneStep.positionAmount = 0;
      oneStep.place_order = jest.fn().mockRejectedValue(new Error('Order failed'));

      await expect(oneStep.placeBuy()).resolves.not.toThrow();
    });

    it('should handle place_order errors gracefully in placeSell', async () => {
      oneStep.place_order = jest.fn().mockRejectedValue(new Error('Order failed'));

      await expect(oneStep.placeSell()).resolves.not.toThrow();
    });
  });
});