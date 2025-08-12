import { jest } from '@jest/globals';
import { CandleStick } from '../../Simulator/DataManager.js';

// Mock for simulation-specific dependencies
export const mockSimulationDAL: any = {
  updateBot: jest.fn().mockResolvedValue({}),
  getBot: jest.fn().mockResolvedValue({}),
  saveOrder: jest.fn().mockResolvedValue({}),
  getOrders: jest.fn().mockResolvedValue([]),
  deleteOrder: jest.fn().mockResolvedValue({}),
  logStep: jest.fn(),
  updateBalance: jest.fn(),
  logProfit: jest.fn()
};

// Mock for Firebase/Firestore
export const mockFirestore: any = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      name: 'Test Simulation',
      coin1: 'BTC',
      coin2: 'USDT',
      startTime: '2023-01-01',
      endTime: '2023-01-02'
    }),
    id: 'test-simulation-id'
  }),
  set: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({})
};

// Mock for file system operations
export const mockFS: any = {
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({ size: 1000 })
};

// Mock for node-fetch
export const mockFetch: any = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
});

// Factory function to create mock candlestick data
export const createMockCandleStick = (overrides: any = {}): CandleStick => {
  const baseTime = 1640995200000; // Jan 1, 2022 00:00:00 UTC
  return new CandleStick(
    overrides.time || baseTime,
    overrides.high || 50000,
    overrides.low || 49000,
    overrides.close || 49500,
    ...Object.values(overrides).slice(4)
  );
};

// Factory function to create mock chart data
export const createMockChart = (length: number = 100): CandleStick[] => {
  const chart: CandleStick[] = [];
  const baseTime = 1640995200000; // Jan 1, 2022 00:00:00 UTC
  const intervalMs = 60000; // 1 minute intervals
  
  for (let i = 0; i < length; i++) {
    const time = baseTime + (i * intervalMs);
    const basePrice = 50000 + (Math.sin(i / 10) * 1000); // Simulate price movement
    const volatility = 100;
    
    const candle = createMockCandleStick({
      time,
      high: basePrice + (Math.random() * volatility),
      low: basePrice - (Math.random() * volatility),
      close: basePrice + ((Math.random() - 0.5) * volatility)
    });
    
    if (i > 0) {
      candle.parent = chart[i - 1];
      chart[i - 1].next = candle;
    }
    
    chart.push(candle);
  }
  
  return chart;
};

// Mock exchange info for simulations
export const createMockExchangeInfoForSim = (): any => ({
  symbols: [{
    symbol: 'BTCUSDT',
    status: 'TRADING',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    filters: [
      {
        filterType: 'PRICE_FILTER',
        minPrice: '0.01000000',
        maxPrice: '1000000.00000000',
        tickSize: '0.01000000'
      },
      {
        filterType: 'LOT_SIZE',
        minQty: '0.00001000',
        maxQty: '9000.00000000',
        stepSize: '0.00001000'
      },
      {
        filterType: 'MIN_NOTIONAL',
        minNotional: '10.00000000'
      }
    ]
  }]
});

// Mock bot for simulation
export const createMockSimulationBot = (overrides: any = {}): any => ({
  _id: 'sim-bot-id',
  coin1: 'BTC',
  coin2: 'USDT',
  binance: {
    balance: { BTC: 1.0, USDT: 10000.0 },
    orders: { BTCUSDT: [] },
    positions: {
      'BTCUSDTLONG': { positionAmount: 0, positionEntry: 0 },
      'BTCUSDTSHORT': { positionAmount: 0, positionEntry: 0 }
    }
  },
  buy_percent: 0.01,
  sell_percent: 0.01,
  amount_percent: 0.1,
  leverage: 10,
  take_profit: 0.02,
  stop_loose: 0.01,
  direction: true,
  isFuture: false,
  botStatus: 0,
  positionSide: jest.fn().mockReturnValue('LONG'),
  pause: 60,
  SMA: 20,
  ...overrides
});

// Mock order for simulation
export const createMockSimulationOrder = (overrides: any = {}): any => ({
  orderId: 'sim-order-' + Math.random().toString(36).substr(2, 9),
  symbol: 'BTCUSDT',
  side: 'BUY',
  status: 'NEW',
  price: 50000,
  origQty: 0.1,
  executedQty: 0.1,
  time: Date.now(),
  type: 'LIMIT',
  clientOrderId: 'client-order-id',
  positionSide: 'LONG',
  closePosition: false,
  bot: undefined,
  pnl: 0,
  amount: 0.1,
  stopPrice: undefined,
  activationPrice: undefined,
  ...overrides
});

// Mock simulation configuration
export const createMockSimulation = (overrides: any = {}): any => ({
  _id: 'test-simulation-id',
  name: 'Test Simulation',
  coin1: 'BTC',
  coin2: 'USDT',
  startTime: '2022-01-01T00:00:00.000Z',
  endTime: '2022-01-02T00:00:00.000Z',
  interval: '1m',
  initial_balance: 10000,
  strategy: 'OneStep',
  parameters: {
    buy_percent: 0.01,
    sell_percent: 0.01,
    amount_percent: 0.1,
    take_profit: 0.02,
    stop_loose: 0.01
  },
  ...overrides
});

// Mock variation for simulation
export const createMockVariation = (overrides: any = {}): any => ({
  id: 'variation-1',
  parameters: {
    buy_percent: 0.015,
    sell_percent: 0.015,
    amount_percent: 0.15
  },
  results: {
    profit: 0,
    trades: 0,
    winRate: 0,
    maxDrawdown: 0
  },
  status: 'pending',
  ...overrides
});

// Mock sockets for simulation
export const mockSimulationSockets: any = {
  getInstance: jest.fn(() => ({
    prices: { 'BTCUSDT': 50000 },
    orderBooks: {
      'BTCUSDT': {
        bids: { '49000': 2.5, '48000': 1.0 },
        asks: { '51000': 1.5, '52000': 2.0 }
      }
    },
    averagePrice: jest.fn().mockReturnValue(49800),
    averagePriceQuarter: jest.fn().mockReturnValue(49850),
    markPrices: { 'BTCUSDT': 49950 }
  }))
};

export const mockFuturesSockets: any = {
  getFInstance: jest.fn(() => ({
    prices: { 'BTCUSDT': 50000 },
    markPrices: { 'BTCUSDT': 49950 },
    averagePrice: jest.fn().mockReturnValue(49800),
    averagePriceQuarter: jest.fn().mockReturnValue(49850),
    addRealtimePrices: jest.fn(),
    getRealtimePrices: jest.fn().mockReturnValue({ 'BTCUSDT': 50000 })
  }))
};

// Mock for ZIP file handling
export const mockAdmZip: any = jest.fn().mockImplementation(() => ({
  extractAllTo: jest.fn(),
  getEntries: jest.fn().mockReturnValue([
    { entryName: 'BTCUSDT-1m-2022-01.csv', getData: jest.fn().mockReturnValue(Buffer.from('mock csv data')) }
  ])
}));

// Helper function to create time series data
export const createMockTimeSeriesData = (startTime: number, endTime: number, interval: number): any[] => {
  const data: any[] = [];
  for (let time = startTime; time <= endTime; time += interval) {
    data.push([
      time,
      '50000', // open
      '51000', // high  
      '49000', // low
      '50500', // close
      '100',   // volume
      time + interval - 1, // close time
      '5050000', // quote volume
      '1000',    // trades
      '50',      // taker buy base
      '2525000', // taker buy quote
      '0'        // ignore
    ]);
  }
  return data;
};

// Mock for child process operations
export const mockChildProcess: any = {
  exec: jest.fn((command, callback) => {
    callback(null, 'mock stdout', '');
  }),
  spawn: jest.fn().mockReturnValue({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 100);
      }
    })
  })
};