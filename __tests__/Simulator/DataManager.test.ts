import { jest } from '@jest/globals';
import { DataManager, CandleStick, SECONDS_IN_DAY, MIN_CHART_SIZE } from '../../Simulator/DataManager.js';
import { 
  createMockSimulationBot, 
  createMockCandleStick, 
  createMockChart, 
  createMockSimulationOrder,
  createMockExchangeInfoForSim,
  mockSimulationDAL,
  mockSimulationSockets,
  mockFS,
  mockChildProcess
} from '../mocks/simulation.js';
import { BotStatus } from '../../Models.js';

// Mock external dependencies
jest.mock('../../DALSimulation.js', () => ({
  DAL: jest.fn().mockImplementation(() => mockSimulationDAL)
}));

jest.mock('../../Sockets/Sockets.js', () => ({
  Sockets: mockSimulationSockets
}));

jest.mock('node:fs/promises', () => mockFS);
jest.mock('node:child_process', () => mockChildProcess);

describe('DataManager', () => {
  let dataManager: DataManager;
  let mockBots: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockBots = [
      createMockSimulationBot(),
      createMockSimulationBot({ _id: 'bot-2' })
    ];
    dataManager = new DataManager(mockBots);
  });

  describe('constructor', () => {
    it('should initialize with bots and set up sockets', () => {
      expect(dataManager.bots).toBe(mockBots);
      expect(dataManager.PAIR).toBe('BTCUSDT');
      expect(dataManager.sockets).toBeDefined();
      expect(dataManager.chart).toEqual([]);
      expect(dataManager.openOrders).toEqual([]);
      expect(dataManager.currentCandle).toBe(0);
    });

    it('should bind average price methods to sockets', () => {
      expect(dataManager.sockets.averagePrice).toBe(dataManager.averagePrice.bind(dataManager));
      expect(dataManager.sockets.averagePriceQuarter).toBe(dataManager.averagePriceQuarter.bind(dataManager));
    });

    it('should create DAL instance', () => {
      expect(dataManager.dal).toBeDefined();
    });
  });

  describe('setExchangeInfo', () => {
    it('should set exchange info and filters', () => {
      const exchangeInfo = createMockExchangeInfoForSim();
      
      dataManager.setExchangeInfo(exchangeInfo);

      expect(dataManager.exchangeInfo).toBe(exchangeInfo);
      expect(dataManager.filters).toBeDefined();
      expect(dataManager.filters.PRICE_FILTER).toBeDefined();
      expect(dataManager.filters.LOT_SIZE).toBeDefined();
      expect(dataManager.filters.MIN_NOTIONAL).toBeDefined();
    });
  });

  describe('CandleStick class', () => {
    it('should create candlestick with correct properties', () => {
      const time = Date.now();
      const high = 51000;
      const low = 49000;
      const close = 50000;

      const candle = new CandleStick(time, high, low, close);

      expect(candle.time).toBe(time);
      expect(candle.high).toBe(high);
      expect(candle.low).toBe(low);
      expect(candle.close).toBe(close);
      expect(candle.next).toBeUndefined();
      expect(candle.parent).toBeUndefined();
      expect(candle.children).toEqual([]);
      expect(candle.lastChild).toBe(false);
    });

    it('should create candlestick without parameters', () => {
      const candle = new CandleStick();

      expect(candle.time).toBeUndefined();
      expect(candle.high).toBeUndefined();
      expect(candle.low).toBeUndefined();
      expect(candle.close).toBeUndefined();
    });
  });

  describe('chart management', () => {
    beforeEach(() => {
      const exchangeInfo = createMockExchangeInfoForSim();
      dataManager.setExchangeInfo(exchangeInfo);
    });

    it('should manage chart data correctly', () => {
      const chart = createMockChart(10);
      dataManager.chart = chart;

      expect(dataManager.chart.length).toBe(10);
      expect(dataManager.chart[0].time).toBeDefined();
      expect(dataManager.chart[0].high).toBeDefined();
      expect(dataManager.chart[0].low).toBeDefined();
      expect(dataManager.chart[0].close).toBeDefined();
    });

    it('should maintain parent-child relationships in chart', () => {
      const chart = createMockChart(5);
      dataManager.chart = chart;

      for (let i = 1; i < chart.length; i++) {
        expect(chart[i].parent).toBe(chart[i - 1]);
        expect(chart[i - 1].next).toBe(chart[i]);
      }
    });

    it('should handle different chart intervals', () => {
      const chart1h = createMockChart(24); // 24 hours
      const chart1m = createMockChart(1440); // 1440 minutes (24 hours)

      dataManager.charts['1h'] = chart1h;
      dataManager.charts['1m'] = chart1m;

      expect(dataManager.charts['1h'].length).toBe(24);
      expect(dataManager.charts['1m'].length).toBe(1440);
    });
  });

  describe('averagePrice', () => {
    beforeEach(() => {
      const chart = createMockChart(50);
      dataManager.chart = chart;
      dataManager.currentCandle = 30;
    });

    it('should calculate simple moving average correctly', () => {
      const period = 10;
      const average = dataManager.averagePrice('BTCUSDT', period);

      expect(typeof average).toBe('number');
      expect(average).toBeGreaterThan(0);
    });

    it('should handle period larger than available data', () => {
      dataManager.currentCandle = 5;
      const period = 20;
      const average = dataManager.averagePrice('BTCUSDT', period);

      expect(typeof average).toBe('number');
      expect(average).toBeGreaterThan(0);
    });

    it('should handle zero period', () => {
      const average = dataManager.averagePrice('BTCUSDT', 0);
      expect(average).toBe(dataManager.chart[dataManager.currentCandle].close);
    });

    it('should return current price when no historical data', () => {
      dataManager.currentCandle = 0;
      const average = dataManager.averagePrice('BTCUSDT', 10);

      expect(average).toBe(dataManager.chart[0].close);
    });
  });

  describe('averagePriceQuarter', () => {
    beforeEach(() => {
      const chart = createMockChart(100);
      dataManager.chart = chart;
      dataManager.currentCandle = 50;
    });

    it('should calculate quarter period average correctly', () => {
      const period = 20;
      const quarterAverage = dataManager.averagePriceQuarter('BTCUSDT', period);

      expect(typeof quarterAverage).toBe('number');
      expect(quarterAverage).toBeGreaterThan(0);
    });

    it('should use quarter of the specified period', () => {
      const period = 20;
      const quarterPeriod = Math.floor(period / 4);
      
      const quarterAverage = dataManager.averagePriceQuarter('BTCUSDT', period);
      const directAverage = dataManager.averagePrice('BTCUSDT', quarterPeriod);

      expect(quarterAverage).toBe(directAverage);
    });
  });

  describe('order management', () => {
    let mockBot: any;

    beforeEach(() => {
      mockBot = createMockSimulationBot();
      const exchangeInfo = createMockExchangeInfoForSim();
      dataManager.setExchangeInfo(exchangeInfo);
      dataManager.chart = createMockChart(10);
      dataManager.currentCandle = 5;
    });

    it('should create buy order function correctly', () => {
      const buyOrderFn = dataManager.openOrder(mockBot)(true);
      
      expect(typeof buyOrderFn).toBe('function');
    });

    it('should create sell order function correctly', () => {
      const sellOrderFn = dataManager.openOrder(mockBot)(false);
      
      expect(typeof sellOrderFn).toBe('function');
    });

    it('should generate unique order IDs', () => {
      const id1 = dataManager.makeid(10);
      const id2 = dataManager.makeid(10);

      expect(id1).toHaveLength(10);
      expect(id2).toHaveLength(10);
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs of specified length', () => {
      const id5 = dataManager.makeid(5);
      const id15 = dataManager.makeid(15);

      expect(id5).toHaveLength(5);
      expect(id15).toHaveLength(15);
    });
  });

  describe('time and candle management', () => {
    beforeEach(() => {
      const chart = createMockChart(100);
      dataManager.chart = chart;
    });

    it('should track current candle index', () => {
      expect(dataManager.currentCandle).toBe(0);
      
      dataManager.currentCandle = 50;
      expect(dataManager.currentCandle).toBe(50);
    });

    it('should maintain history candles', () => {
      const historyCandles = createMockChart(20);
      dataManager.historyCandles = historyCandles;

      expect(dataManager.historyCandles.length).toBe(20);
    });

    it('should handle minimum history candles requirement', () => {
      dataManager.minHistoryCandles = 50;
      expect(dataManager.minHistoryCandles).toBe(50);
    });

    it('should manage future history flag', () => {
      expect(dataManager.futureHistory).toBe(false);
      
      dataManager.futureHistory = true;
      expect(dataManager.futureHistory).toBe(true);
    });
  });

  describe('constants and configuration', () => {
    it('should define SECONDS_IN_DAY correctly', () => {
      expect(SECONDS_IN_DAY).toBe(24 * 60 * 60);
    });

    it('should define MIN_CHART_SIZE correctly', () => {
      expect(MIN_CHART_SIZE).toBe(5 * SECONDS_IN_DAY);
    });
  });

  describe('bot integration', () => {
    it('should work with multiple bots', () => {
      const multipleBots = [
        createMockSimulationBot({ _id: 'bot-1', coin1: 'BTC', coin2: 'USDT' }),
        createMockSimulationBot({ _id: 'bot-2', coin1: 'ETH', coin2: 'USDT' }),
        createMockSimulationBot({ _id: 'bot-3', coin1: 'BTC', coin2: 'BUSD' })
      ];

      const multiDataManager = new DataManager(multipleBots);

      expect(multiDataManager.bots.length).toBe(3);
      expect(multiDataManager.PAIR).toBe('BTCUSDT'); // Uses first bot's pair
    });

    it('should handle bot status changes', () => {
      mockBots[0].botStatus = BotStatus.WORK;
      mockBots[1].botStatus = BotStatus.PAUSE;

      expect(mockBots[0].botStatus).toBe(BotStatus.WORK);
      expect(mockBots[1].botStatus).toBe(BotStatus.PAUSE);
    });
  });

  describe('error handling', () => {
    it('should handle empty chart gracefully', () => {
      dataManager.chart = [];
      dataManager.currentCandle = 0;

      expect(() => {
        dataManager.averagePrice('BTCUSDT', 10);
      }).not.toThrow();
    });

    it('should handle invalid candle index', () => {
      const chart = createMockChart(10);
      dataManager.chart = chart;
      dataManager.currentCandle = 15; // Beyond chart length

      expect(() => {
        dataManager.averagePrice('BTCUSDT', 5);
      }).not.toThrow();
    });

    it('should handle missing exchange info', () => {
      dataManager.exchangeInfo = undefined;
      dataManager.filters = undefined;

      expect(() => {
        const buyOrderFn = dataManager.openOrder(mockBots[0])(true);
      }).not.toThrow();
    });
  });

  describe('chart data structures', () => {
    it('should support multiple chart timeframes', () => {
      const charts = {
        '1m': createMockChart(1440),  // 1 day in 1-minute candles
        '5m': createMockChart(288),   // 1 day in 5-minute candles
        '1h': createMockChart(24),    // 1 day in 1-hour candles
        '1d': createMockChart(1)      // 1 day candle
      };

      dataManager.charts = charts;

      expect(Object.keys(dataManager.charts)).toEqual(['1m', '5m', '1h', '1d']);
      expect(dataManager.charts['1m'].length).toBe(1440);
      expect(dataManager.charts['5m'].length).toBe(288);
      expect(dataManager.charts['1h'].length).toBe(24);
      expect(dataManager.charts['1d'].length).toBe(1);
    });

    it('should handle candlestick relationships', () => {
      const parentCandle = createMockCandleStick({ time: 1000 });
      const childCandle1 = createMockCandleStick({ time: 2000 });
      const childCandle2 = createMockCandleStick({ time: 3000 });

      parentCandle.children.push(childCandle1, childCandle2);
      childCandle1.parent = parentCandle;
      childCandle2.parent = parentCandle;

      expect(parentCandle.children.length).toBe(2);
      expect(childCandle1.parent).toBe(parentCandle);
      expect(childCandle2.parent).toBe(parentCandle);
    });
  });

  describe('performance considerations', () => {
    it('should handle large datasets efficiently', () => {
      const largeChart = createMockChart(10000); // 10k candles
      dataManager.chart = largeChart;
      dataManager.currentCandle = 5000;

      const startTime = Date.now();
      const average = dataManager.averagePrice('BTCUSDT', 100);
      const endTime = Date.now();

      expect(average).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it('should manage memory efficiently with history candles', () => {
      const historyLength = 1000;
      dataManager.historyCandles = createMockChart(historyLength);
      dataManager.minHistoryCandles = historyLength;

      expect(dataManager.historyCandles.length).toBe(historyLength);
      expect(dataManager.minHistoryCandles).toBe(historyLength);
    });
  });
});