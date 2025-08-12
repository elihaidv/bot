import { jest } from '@jest/globals';
import { FutureDataManager } from '../../Simulator/FutureDataManager.js';
import { 
  createMockSimulationBot, 
  createMockCandleStick, 
  createMockChart, 
  createMockSimulationOrder,
  createMockExchangeInfoForSim,
  mockSimulationDAL,
  mockFuturesSockets
} from '../mocks/simulation.js';
import { BotStatus } from '../../Models.js';

// Mock external dependencies
jest.mock('../../DALSimulation.js', () => ({
  DAL: jest.fn().mockImplementation(() => mockSimulationDAL)
}));

jest.mock('../../Sockets/SocketsFuture.js', () => ({
  SocketsFutures: mockFuturesSockets
}));

describe('FutureDataManager', () => {
  let futureDataManager: FutureDataManager;
  let mockBots: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBots = [
      createMockSimulationBot({ 
        isFuture: true,
        leverage: 10,
        pause: 60
      })
    ];
    futureDataManager = new FutureDataManager(mockBots);
  });

  describe('constructor', () => {
    it('should inherit from DataManager and set up futures sockets', () => {
      expect(futureDataManager.bots).toBe(mockBots);
      expect(futureDataManager.PAIR).toBe('BTCUSDT');
      expect(futureDataManager.sockets).toBeDefined();
    });

    it('should bind futures-specific socket methods', () => {
      expect(futureDataManager.sockets.averagePrice).toBe(futureDataManager.averagePrice.bind(futureDataManager));
      expect(futureDataManager.sockets.averagePriceQuarter).toBe(futureDataManager.averagePriceQuarter.bind(futureDataManager));
      expect((futureDataManager.sockets as any).addRealtimePrices).toBe(futureDataManager.addRealtimePrices.bind(futureDataManager));
      expect((futureDataManager.sockets as any).getRealtimePrices).toBe(futureDataManager.getRealtimePrices.bind(futureDataManager));
    });
  });

  describe('orderexecute', () => {
    let mockOrder: any;
    let mockCandle: any;
    let mockBot: any;

    beforeEach(() => {
      mockBot = createMockSimulationBot({ 
        isFuture: true,
        leverage: 10,
        pause: 60,
        coin2: 'USDT'
      });
      
      // Set up initial position
      mockBot.binance.positions['BTCUSDTLONG'] = {
        positionAmount: 0,
        positionEntry: 0
      };
      
      mockOrder = createMockSimulationOrder({
        side: 'BUY',
        executedQty: 0.1,
        price: 50000,
        closePosition: false,
        type: 'LIMIT',
        bot: mockBot
      });
      
      mockCandle = createMockCandleStick({
        time: Date.now(),
        high: 51000,
        low: 49000,
        close: 50000
      });

      futureDataManager.PAIR = 'BTCUSDT';
      futureDataManager.chart = [mockCandle];
    });

    it('should set bot status to WORK when executing order', () => {
      futureDataManager.orderexecute(mockOrder, mockCandle);
      
      expect(mockOrder.bot.botStatus).toBe(BotStatus.WORK);
    });

    it('should handle close position orders correctly', () => {
      // Set up existing position
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockOrder.closePosition = true;
      mockOrder.price = 51000;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(mockOrder.executedQty).toBe(Math.abs(position.positionAmount));
      expect(position.positionAmount).toBe(0);
      expect(position.positionEntry).toBe(0);
      expect(mockBot.binance.orders[futureDataManager.PAIR]).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Closing position'));

      consoleSpy.mockRestore();
    });

    it('should pause bot on STOP_MARKET close position', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockOrder.closePosition = true;
      mockOrder.type = 'STOP_MARKET';
      mockOrder.price = 48000; // Stop loss

      jest.spyOn(console, 'log').mockImplementation();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(mockBot.botStatus).toBe(BotStatus.PAUSE);
      expect(mockBot.lastOrder).toBe(mockCandle.time + mockBot.pause * 1000);
    });

    it('should handle position increase correctly', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0.5;
      position.positionEntry = 49000;
      
      mockOrder.side = 'BUY';
      mockOrder.executedQty = 0.3;
      mockOrder.price = 51000;

      futureDataManager.orderexecute(mockOrder, mockCandle);

      // Position should increase and weighted average entry price should be calculated
      expect(position.positionAmount).toBe(0.8); // 0.5 + 0.3
      expect(position.positionEntry).toBeCloseTo(49750, 0); // Weighted average
    });

    it('should handle position decrease correctly', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockOrder.side = 'SELL';
      mockOrder.executedQty = 0.3;
      mockOrder.price = 51000;

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(position.positionAmount).toBe(0.7); // 1.0 - 0.3
      expect(position.positionEntry).toBe(49000); // Entry price unchanged on decrease
    });

    it('should handle position reversal correctly', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0.5;
      position.positionEntry = 49000;
      
      mockOrder.side = 'SELL';
      mockOrder.executedQty = 0.8; // More than current position
      mockOrder.price = 51000;

      futureDataManager.orderexecute(mockOrder, mockCandle);

      // Position should reverse to -0.3
      expect(position.positionAmount).toBe(-0.3);
      expect(position.positionEntry).toBe(51000);
    });

    it('should calculate profit correctly on position close', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockOrder.closePosition = true;
      mockOrder.price = 51000;
      
      const initialBalance = 10000;
      mockBot.binance.balance[mockBot.coin2] = initialBalance;

      jest.spyOn(console, 'log').mockImplementation();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      const expectedGain = (51000 - 49000) * 1.0; // 2000
      const expectedPercentage = (expectedGain / initialBalance) * 100; // 20%

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('20%')
      );
    });

    it('should update balance on position change', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0;
      position.positionEntry = 0;
      
      mockOrder.side = 'BUY';
      mockOrder.executedQty = 0.1;
      mockOrder.price = 50000;
      
      const initialBalance = 10000;
      mockBot.binance.balance[mockBot.coin2] = initialBalance;

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(mockSimulationDAL.updateBalance).toHaveBeenCalledWith(
        mockBot,
        mockBot.coin2,
        expect.any(Number)
      );
    });

    it('should log DAL step for close position', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockOrder.closePosition = true;
      jest.spyOn(console, 'log').mockImplementation();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(mockSimulationDAL.logStep).toHaveBeenCalledWith(
        { type: 'Close Position', priority: 5 },
        mockBot
      );
    });

    it('should handle zero position amount', () => {
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0;
      position.positionEntry = 0;
      
      mockOrder.side = 'BUY';
      mockOrder.executedQty = 0.1;
      mockOrder.price = 50000;

      expect(() => {
        futureDataManager.orderexecute(mockOrder, mockCandle);
      }).not.toThrow();

      expect(position.positionAmount).toBe(0.1);
      expect(position.positionEntry).toBe(50000);
    });
  });

  describe('realtime prices functionality', () => {
    it('should add realtime prices', () => {
      const prices = { 'BTCUSDT': 50000, 'ETHUSDT': 3000 };
      
      expect(() => {
        futureDataManager.addRealtimePrices(prices);
      }).not.toThrow();
    });

    it('should get realtime prices', () => {
      const prices = futureDataManager.getRealtimePrices();
      
      expect(prices).toBeDefined();
      expect(typeof prices).toBe('object');
    });
  });

  describe('futures-specific calculations', () => {
    it('should handle leverage calculations in position sizing', () => {
      const position = mockBots[0].binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0;
      position.positionEntry = 0;
      
      const mockOrder = createMockSimulationOrder({
        side: 'BUY',
        executedQty: 0.1,
        price: 50000,
        bot: mockBots[0]
      });
      
      const mockCandle = createMockCandleStick();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      expect(position.positionAmount).toBe(0.1);
      expect(position.positionEntry).toBe(50000);
    });

    it('should calculate weighted average entry price correctly', () => {
      const position = mockBots[0].binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 48000;
      
      const mockOrder = createMockSimulationOrder({
        side: 'BUY',
        executedQty: 0.5,
        price: 52000,
        bot: mockBots[0]
      });
      
      const mockCandle = createMockCandleStick();

      futureDataManager.orderexecute(mockOrder, mockCandle);

      // Weighted average: (1.0 * 48000 + 0.5 * 52000) / 1.5 = 49333.33
      expect(position.positionEntry).toBeCloseTo(49333.33, 2);
      expect(position.positionAmount).toBe(1.5);
    });
  });

  describe('error handling', () => {
    it('should handle missing bot gracefully', () => {
      const mockOrder = createMockSimulationOrder({ bot: undefined });
      const mockCandle = createMockCandleStick();

      expect(() => {
        futureDataManager.orderexecute(mockOrder, mockCandle);
      }).not.toThrow();
    });

    it('should handle missing position data', () => {
      const mockBot = createMockSimulationBot({ isFuture: true });
      mockBot.binance.positions = {}; // No positions defined
      
      const mockOrder = createMockSimulationOrder({ bot: mockBot });
      const mockCandle = createMockCandleStick();

      expect(() => {
        futureDataManager.orderexecute(mockOrder, mockCandle);
      }).not.toThrow();
    });

    it('should handle invalid order data', () => {
      const mockOrder = createMockSimulationOrder({
        side: undefined,
        executedQty: undefined,
        price: undefined
      });
      const mockCandle = createMockCandleStick();

      expect(() => {
        futureDataManager.orderexecute(mockOrder, mockCandle);
      }).not.toThrow();
    });
  });

  describe('inheritance from DataManager', () => {
    it('should have access to parent class methods', () => {
      expect(typeof futureDataManager.averagePrice).toBe('function');
      expect(typeof futureDataManager.averagePriceQuarter).toBe('function');
      expect(typeof futureDataManager.setExchangeInfo).toBe('function');
      expect(typeof futureDataManager.openOrder).toBe('function');
    });

    it('should inherit chart management functionality', () => {
      const chart = createMockChart(10);
      futureDataManager.chart = chart;

      expect(futureDataManager.chart.length).toBe(10);
      expect(futureDataManager.currentCandle).toBe(0);
    });

    it('should work with exchange info', () => {
      const exchangeInfo = createMockExchangeInfoForSim();
      futureDataManager.setExchangeInfo(exchangeInfo);

      expect(futureDataManager.exchangeInfo).toBe(exchangeInfo);
      expect(futureDataManager.filters).toBeDefined();
    });
  });

  describe('position side handling', () => {
    it('should handle LONG positions correctly', () => {
      const mockBot = createMockSimulationBot({ 
        isFuture: true,
        positionSide: jest.fn().mockReturnValue('LONG')
      });
      
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 0;
      position.positionEntry = 0;
      
      const mockOrder = createMockSimulationOrder({
        side: 'BUY',
        executedQty: 0.1,
        price: 50000,
        bot: mockBot
      });
      
      const futureManager = new FutureDataManager([mockBot]);
      futureManager.PAIR = 'BTCUSDT';
      
      expect(() => {
        futureManager.orderexecute(mockOrder, createMockCandleStick());
      }).not.toThrow();
    });

    it('should handle SHORT positions correctly', () => {
      const mockBot = createMockSimulationBot({ 
        isFuture: true,
        positionSide: jest.fn().mockReturnValue('SHORT')
      });
      
      mockBot.binance.positions['BTCUSDTSHORT'] = {
        positionAmount: 0,
        positionEntry: 0
      };
      
      const mockOrder = createMockSimulationOrder({
        side: 'SELL',
        executedQty: 0.1,
        price: 50000,
        bot: mockBot
      });
      
      const futureManager = new FutureDataManager([mockBot]);
      futureManager.PAIR = 'BTCUSDT';
      
      expect(() => {
        futureManager.orderexecute(mockOrder, createMockCandleStick());
      }).not.toThrow();
    });
  });

  describe('profit and loss calculations', () => {
    it('should calculate profit correctly for long positions', () => {
      const mockBot = createMockSimulationBot({ 
        isFuture: true,
        coin2: 'USDT'
      });
      
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 49000;
      
      mockBot.binance.balance.USDT = 10000;
      
      const mockOrder = createMockSimulationOrder({
        closePosition: true,
        price: 51000,
        bot: mockBot
      });
      
      jest.spyOn(console, 'log').mockImplementation();
      
      futureDataManager.orderexecute(mockOrder, createMockCandleStick());
      
      // Profit = (51000 - 49000) * 1.0 = 2000
      // Percentage = (2000 / 10000) * 100 = 20%
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('20%')
      );
    });

    it('should calculate loss correctly for long positions', () => {
      const mockBot = createMockSimulationBot({ 
        isFuture: true,
        coin2: 'USDT'
      });
      
      const position = mockBot.binance.positions['BTCUSDTLONG'];
      position.positionAmount = 1.0;
      position.positionEntry = 51000;
      
      mockBot.binance.balance.USDT = 10000;
      
      const mockOrder = createMockSimulationOrder({
        closePosition: true,
        price: 49000,
        bot: mockBot
      });
      
      jest.spyOn(console, 'log').mockImplementation();
      
      futureDataManager.orderexecute(mockOrder, createMockCandleStick());
      
      // Loss = (49000 - 51000) * 1.0 = -2000
      // Percentage = (-2000 / 10000) * 100 = -20%
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('-20%')
      );
    });
  });
});