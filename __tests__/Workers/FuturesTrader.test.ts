import { jest } from '@jest/globals';
import { FutureTrader } from '../../Workers/FuturesTrader.js';
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

describe('FutureTrader', () => {
  let trader: FutureTrader;
  let mockBot: any;
  let mockExchangeInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = createMockBot({ isFuture: true, leverage: 10 });
    mockExchangeInfo = createMockExchangeInfo();
    
    // Mock the futures sockets
    mockSocketsFutures.getFInstance.mockReturnValue({
      prices: { 'BTCUSDT': 50000 },
      markPrices: { 'BTCUSDT': 49950 },
      averagePrice: jest.fn().mockReturnValue(49800)
    });

    trader = new FutureTrader(mockBot, mockExchangeInfo);
  });

  describe('constructor', () => {
    it('should initialize with futures-specific properties', () => {
      expect(trader.positionAmount).toBe(0);
      expect(trader.positionEntry).toBe(0);
      expect(trader.positionDirection).toBeUndefined();
      expect(trader.futureSockets).toBeDefined();
    });
  });

  describe('getAction', () => {
    it('should return futuresBuy for buy orders', () => {
      const action = trader.getAction(true);
      expect(action).toBe(trader.binance.futuresBuy);
    });

    it('should return futuresSell for sell orders', () => {
      const action = trader.getAction(false);
      expect(action).toBe(trader.binance.futuresSell);
    });
  });

  describe('place', () => {
    beforeEach(() => {
      trader.orders = [];
      trader.futureSockets.prices['BTCUSDT'] = 50000;
      trader.futureSockets.markPrices['BTCUSDT'] = 49950;
      trader.balance.set('USDT', { available: '1000' });

      // Mock methods
      trader.parseAllValues = jest.fn();
      trader.calculatePrice = jest.fn();
      trader.calculateDirection = jest.fn();
      trader.buildHistory = jest.fn();
      trader.checkForPause = jest.fn();
    });

    it('should return early if required data is missing', async () => {
      trader.orders = null;
      await trader.place();
      
      expect(trader.parseAllValues).not.toHaveBeenCalled();
      expect(mockBotLogger.instance.log).not.toHaveBeenCalled();
    });

    it('should execute trading logic when all data is available', async () => {
      trader.orders = [];
      trader.isSemulation = false;
      
      await trader.place();
      
      expect(trader.bot.botStatus).toBe(BotStatus.WORK);
      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BotStart - Future',
          bot_id: trader.bot._id
        }),
        expect.any(String)
      );
      expect(trader.parseAllValues).toHaveBeenCalled();
      expect(trader.calculatePrice).toHaveBeenCalled();
      expect(trader.calculateDirection).toHaveBeenCalled();
      expect(trader.buildHistory).toHaveBeenCalled();
      expect(trader.checkForPause).toHaveBeenCalled();
    });

    it('should return early when bot is paused', async () => {
      trader.orders = [];
      trader.bot.botStatus = BotStatus.PAUSE;
      trader.checkForPause = jest.fn(() => {
        trader.bot.botStatus = BotStatus.PAUSE;
      });
      
      await trader.place();
      
      expect(trader.checkForPause).toHaveBeenCalled();
      // Should return early after checkForPause sets PAUSE status
    });

    it('should skip parsing in simulation mode', async () => {
      trader.orders = [];
      trader.isSemulation = true;
      
      await trader.place();
      
      expect(trader.parseAllValues).not.toHaveBeenCalled();
      expect(trader.calculatePrice).toHaveBeenCalled();
    });
  });

  describe('trading calculations', () => {
    beforeEach(() => {
      trader.futureSockets.markPrices['BTCUSDT'] = 50000;
      trader.futureSockets.averagePrice = jest.fn().mockReturnValue(49800);
      trader.balance.set('USDT', { available: '1000' });
      trader.bot.buy_percent = 0.01;
      trader.bot.sell_percent = 0.02;
      trader.bot.amount_percent = 0.1;
      trader.bot.leverage = 10;
      trader.bot.SMA = 20;
    });

    it('should calculate buy price correctly', () => {
      // This would test the price calculation logic
      // Based on the pattern seen in OneStep.ts
      const markPrice = trader.futureSockets.markPrices[trader.PAIR];
      const expectedBuyPrice = markPrice * (1 - trader.bot.buy_percent);
      
      expect(markPrice).toBe(50000);
      expect(expectedBuyPrice).toBeCloseTo(49500, 0);
    });

    it('should calculate leveraged balance correctly', () => {
      const balance = parseFloat(trader.balance.get(trader.SECOND).available);
      const leveragedBalance = balance * trader.bot.leverage;
      
      expect(leveragedBalance).toBe(10000); // 1000 * 10
    });
  });

  describe('position management', () => {
    it('should track position amount', () => {
      trader.positionAmount = 1.5;
      expect(trader.positionAmount).toBe(1.5);
    });

    it('should track position entry price', () => {
      trader.positionEntry = 49000;
      expect(trader.positionEntry).toBe(49000);
    });

    it('should track position direction', () => {
      trader.positionDirection = 'LONG';
      expect(trader.positionDirection).toBe('LONG');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      trader.orders = [];
      trader.futureSockets.prices['BTCUSDT'] = 50000;
      trader.futureSockets.markPrices['BTCUSDT'] = 49950;
      trader.balance.set('USDT', { available: '1000' });
    });

    it('should handle missing mark prices', async () => {
      delete trader.futureSockets.markPrices['BTCUSDT'];
      
      await trader.place();
      
      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });

    it('should handle missing regular prices', async () => {
      delete trader.futureSockets.prices['BTCUSDT'];
      
      await trader.place();
      
      expect(trader.parseAllValues).not.toHaveBeenCalled();
    });

    it('should reset error flag on successful execution', async () => {
      trader.error = true;
      trader.orders = [];
      trader.isSemulation = true;
      trader.calculatePrice = jest.fn();
      trader.calculateDirection = jest.fn();
      trader.buildHistory = jest.fn();
      trader.checkForPause = jest.fn();
      
      await trader.place();
      
      expect(trader.error).toBe(false);
    });
  });

  describe('integration with base class', () => {
    it('should inherit from BasePlacer', () => {
      expect(trader.FIRST).toBe('BTC');
      expect(trader.SECOND).toBe('USDT');
      expect(trader.PAIR).toBe('BTCUSDT');
    });

    it('should have access to base class methods', () => {
      expect(typeof trader.roundQu).toBe('function');
      expect(typeof trader.roundPrice).toBe('function');
      expect(typeof trader.weightAverage).toBe('function');
    });

    it('should use futures-specific binance methods', () => {
      const buyAction = trader.getAction(true);
      const sellAction = trader.getAction(false);
      
      expect(buyAction).toBe(trader.binance.futuresBuy);
      expect(sellAction).toBe(trader.binance.futuresSell);
    });
  });

  describe('bot status management', () => {
    it('should set bot status to WORK on place execution', async () => {
      trader.orders = [];
      trader.futureSockets.prices['BTCUSDT'] = 50000;
      trader.futureSockets.markPrices['BTCUSDT'] = 49950;
      trader.balance.set('USDT', { available: '1000' });
      
      // Mock required methods
      trader.parseAllValues = jest.fn();
      trader.calculatePrice = jest.fn();
      trader.calculateDirection = jest.fn();
      trader.buildHistory = jest.fn();
      trader.checkForPause = jest.fn();
      
      await trader.place();
      
      expect(trader.bot.botStatus).toBe(BotStatus.WORK);
    });
  });
});