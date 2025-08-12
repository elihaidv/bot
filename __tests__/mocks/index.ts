import { jest } from '@jest/globals';

// Mock implementations for external dependencies

export const mockBinance: any = {
  futuresBuy: jest.fn().mockResolvedValue({}),
  futuresSell: jest.fn().mockResolvedValue({}),
  futuresLeverage: jest.fn().mockResolvedValue({}),
  futuresMarginType: jest.fn().mockResolvedValue({}),
  futuresOrder: jest.fn().mockResolvedValue({}),
  futuresCancel: jest.fn().mockResolvedValue({}),
  balance: jest.fn().mockResolvedValue({}),
  exchangeInfo: jest.fn().mockResolvedValue({}),
  prices: jest.fn().mockResolvedValue({}),
  depth: jest.fn().mockResolvedValue({}),
  marketBuy: jest.fn().mockResolvedValue({})
};

export const mockDAL: any = {
  updateBot: jest.fn().mockResolvedValue({}),
  getBot: jest.fn().mockResolvedValue({}),
  saveOrder: jest.fn().mockResolvedValue({}),
  getOrders: jest.fn().mockResolvedValue([]),
  deleteOrder: jest.fn().mockResolvedValue({})
};

export const mockSockets: any = {
  getInstance: jest.fn(() => ({
    prices: {},
    orderBooks: {},
    averagePrice: jest.fn().mockReturnValue(100),
    markPrices: {},
    compare: jest.fn(),
    balance_update: jest.fn(),
    execution_update: jest.fn(),
    updateDepthSockets: jest.fn()
  }))
};

export const mockSocketsFutures: any = {
  getFInstance: jest.fn(() => ({
    prices: {},
    orderBooks: {},
    averagePrice: jest.fn().mockReturnValue(100),
    markPrices: {}
  }))
};

export const mockBotLogger: any = {
  instance: {
    log: jest.fn()
  }
};

export const createMockBot = (overrides: any = {}): any => ({
  _id: 'test-bot-id',
  coin1: 'BTC',
  coin2: 'USDT',
  binance: {
    binance: mockBinance,
    balance: new Map([
      ['BTC', { available: '1.0', locked: '0.0' }],
      ['USDT', { available: '1000.0', locked: '0.0' }]
    ]),
    orders: {
      'BTCUSDT': []
    }
  },
  buy_percent: 0.01,
  sell_percent: 0.01,
  amount_percent: 0.1,
  amount_percent_sell: 0.1,
  SMA: 20,
  leverage: 10,
  take_profit: 0.02,
  stop_loose: 0.01,
  direction: true,
  isFuture: false,
  botStatus: 0,
  positionSide: jest.fn().mockReturnValue('LONG'),
  ...overrides
});

export const createMockExchangeInfo = (): any => ({
  symbols: [{
    symbol: 'BTCUSDT',
    filters: [
      { filterType: 'PRICE_FILTER', minPrice: '0.01', maxPrice: '1000000.00', tickSize: '0.01' },
      { filterType: 'LOT_SIZE', minQty: '0.00001', maxQty: '9000.00000', stepSize: '0.00001' },
      { filterType: 'MIN_NOTIONAL', minNotional: '10.00000000' }
    ]
  }]
});

export const createMockOrder = (overrides: any = {}): any => ({
  orderId: 123456,
  symbol: 'BTCUSDT',
  status: 'FILLED',
  type: 'MARKET',
  side: 'BUY',
  amount: '0.1',
  price: '50000',
  timestamp: Date.now(),
  origQty: '0.1',
  executedQty: '0.1',
  time: Date.now(),
  pnl: '0',
  positionSide: 'LONG',
  clientOrderId: 'test-order',
  orderPrice: jest.fn().mockReturnValue(50000),
  ...overrides
});