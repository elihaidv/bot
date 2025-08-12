import { jest } from '@jest/globals';
import { BasePlacer } from '../../Workers/BasePlacer.js';
import { BotStatus } from '../../Models.js';
import { 
  createMockBot, 
  createMockExchangeInfo, 
  createMockOrder,
  mockBotLogger,
  mockSockets 
} from '../mocks/index.js';

// Mock external dependencies
jest.mock('../../Logger.js', () => ({
  BotLogger: mockBotLogger
}));

jest.mock('../../Sockets/Sockets.js', () => ({
  Sockets: mockSockets
}));

// Create a concrete implementation of BasePlacer for testing
class TestPlacer extends BasePlacer {
  async place() {
    // Implementation for testing
  }

  getAction(type: boolean): Function {
    return type ? jest.fn() : jest.fn();
  }
}

describe('BasePlacer', () => {
  let placer: TestPlacer;
  let mockBot: any;
  let mockExchangeInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = createMockBot();
    mockExchangeInfo = createMockExchangeInfo();
    placer = new TestPlacer(mockBot, mockExchangeInfo);
  });

  describe('constructor', () => {
    it('should initialize with correct bot and exchange info', () => {
      expect(placer.FIRST).toBe('BTC');
      expect(placer.SECOND).toBe('USDT');
      expect(placer.PAIR).toBe('BTCUSDT');
      expect(placer.bot.botStatus).toBe(BotStatus.WORK);
    });

    it('should set up filters correctly', () => {
      expect(placer.filters).toBeDefined();
      expect(placer.filters.PRICE_FILTER).toEqual({
        filterType: 'PRICE_FILTER',
        minPrice: '0.01',
        maxPrice: '1000000.00',
        tickSize: '0.01'
      });
    });
  });

  describe('buySide', () => {
    it('should return SELL when direction is true', () => {
      placer.bot.direction = true;
      expect(placer.buySide()).toBe('SELL');
    });

    it('should return BUY when direction is false', () => {
      placer.bot.direction = false;
      expect(placer.buySide()).toBe('BUY');
    });
  });

  describe('sellSide', () => {
    it('should return BUY when direction is true', () => {
      placer.bot.direction = true;
      expect(placer.sellSide()).toBe('BUY');
    });

    it('should return SELL when direction is false', () => {
      placer.bot.direction = false;
      expect(placer.sellSide()).toBe('SELL');
    });
  });

  describe('roundQu', () => {
    it('should round quantity correctly', () => {
      const quantity = 1.123456789;
      const rounded = placer.roundQu(quantity);
      expect(typeof rounded).toBe('number');
      expect(rounded).toBeCloseTo(1.12346, 5);
    });
  });

  describe('roundPrice', () => {
    it('should round price correctly', () => {
      const price = 50000.123;
      const rounded = placer.roundPrice(price);
      expect(typeof rounded).toBe('number');
      expect(rounded).toBeCloseTo(50000.12, 2);
    });
  });

  describe('weightAverage', () => {
    it('should calculate weighted average correctly', () => {
      const orders = [
        { price: '100', executedQty: '1.0' },
        { price: '200', executedQty: '2.0' },
        { price: '150', executedQty: '1.0' }
      ];
      
      const average = placer.weightAverage(orders);
      // Expected: (100*1 + 200*2 + 150*1) / (1+2+1) = 650/4 = 162.5
      expect(average).toBeCloseTo(162.5, 1);
    });

    it('should handle empty array', () => {
      const orders: any[] = [];
      const average = placer.weightAverage(orders);
      expect(average).toBe(0);
    });
  });

  describe('buyBNB', () => {
    beforeEach(() => {
      placer.bot.minbnb = 1;
      placer.bot.bnbamount = 10;
      placer.PAIR = 'BTCUSDT';
      placer.balance = new Map([
        ['BNB', { available: 0.5 }]
      ]);
      placer.binance.marketBuy = jest.fn();
    });

    it('should buy BNB when balance is below minimum', async () => {
      await placer.buyBNB();
      expect(placer.binance.marketBuy).toHaveBeenCalledWith('BNBUSDT', 10);
    });

    it('should not buy BNB when balance is sufficient', async () => {
      placer.balance.set('BNB', { available: 2 });
      await placer.buyBNB();
      expect(placer.binance.marketBuy).not.toHaveBeenCalled();
    });

    it('should not buy BNB when pair includes BNB', async () => {
      placer.PAIR = 'BNBUSDT';
      await placer.buyBNB();
      expect(placer.binance.marketBuy).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      placer.binance.marketBuy = jest.fn().mockRejectedValue(new Error('API Error'));
      await expect(placer.buyBNB()).resolves.not.toThrow();
    });
  });

  describe('buildHistory', () => {
    beforeEach(() => {
      placer.orders = [
        createMockOrder({ 
          orderId: '1', 
          side: 'BUY', 
          status: 'FILLED',
          positionSide: 'LONG',
          clientOrderId: 'buy1'
        }),
        createMockOrder({ 
          orderId: '2', 
          side: 'SELL', 
          status: 'FILLED',
          positionSide: 'LONG',
          clientOrderId: 'sell1'
        }),
        createMockOrder({ 
          orderId: '3', 
          side: 'BUY', 
          status: 'FILLED',
          positionSide: 'LONG',
          clientOrderId: 'buy2'
        })
      ];
      placer.bot.positionSide = jest.fn().mockReturnValue('LONG');
      placer.bot.direction = false; // BUY side
    });

    it('should build order history correctly', () => {
      placer.buildHistory();
      
      expect(placer.myLastOrder).toBeDefined();
      expect(placer.lastBuy).toBeDefined();
      expect(placer.lastSell).toBeDefined();
      expect(placer.standingBuy).toBeDefined();
    });

    it('should handle empty orders array', () => {
      placer.orders = [];
      placer.buildHistory();
      
      expect(placer.myLastOrder).toBeUndefined();
      expect(placer.lastBuy).toBeUndefined();
      expect(placer.lastSell).toBeUndefined();
      expect(placer.standingBuy).toBeUndefined();
    });
  });

  describe('align', () => {
    beforeEach(() => {
      // Mock order book data
      mockSockets.getInstance.mockReturnValue({
        orderBooks: {
          'BTCUSDT': {
            bids: { '49000': 1.5, '48000': 2.0 },
            asks: { '51000': 1.5, '52000': 2.0 }
          }
        }
      });
      placer.sockets = mockSockets.getInstance();
    });

    it('should align buy order price correctly', () => {
      const price = 49500;
      const direction = true; // buy
      const quantity = 1.0;
      
      const alignedPrice = placer.align(price, direction, quantity);
      expect(alignedPrice).toBe(49000.01); // tick above best bid
    });

    it('should align sell order price correctly', () => {
      const price = 50500;
      const direction = false; // sell
      const quantity = 1.0;
      
      const alignedPrice = placer.align(price, direction, quantity);
      expect(alignedPrice).toBe(50999.99); // tick below best ask
    });

    it('should return original price when no alignment needed', () => {
      const price = 55000;
      const direction = false;
      const quantity = 1.0;
      
      const alignedPrice = placer.align(price, direction, quantity);
      expect(alignedPrice).toBe(price);
    });
  });

  describe('place_order', () => {
    beforeEach(() => {
      placer.getAction = jest.fn().mockReturnValue(jest.fn().mockResolvedValue({}));
      placer.bot.positionSide = jest.fn().mockReturnValue('LONG');
    });

    it('should place order with correct parameters', async () => {
      const mockAction = jest.fn().mockResolvedValue({});
      placer.getAction = jest.fn().mockReturnValue(mockAction);
      
      await placer.place_order('USDT', 0.1, 50000, true);
      
      expect(mockAction).toHaveBeenCalledWith(
        'BTCUSDT',
        expect.any(Number),
        50000,
        expect.objectContaining({
          timeInForce: 'GTC',
          positionSide: 'LONG'
        })
      );
    });

    it('should handle minimum notional requirement', async () => {
      const mockAction = jest.fn().mockResolvedValue({});
      placer.getAction = jest.fn().mockReturnValue(mockAction);
      
      // Small quantity that doesn't meet minimum notional
      await placer.place_order('USDT', 0.0001, 50000, true);
      
      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QuantitiyTooLow'
        })
      );
    });

    it('should increase quantity to minimum when specified', async () => {
      const mockAction = jest.fn().mockResolvedValue({});
      placer.getAction = jest.fn().mockReturnValue(mockAction);
      
      await placer.place_order('USDT', 0.0001, 50000, true, {}, true);
      
      expect(mockAction).toHaveBeenCalledWith(
        'BTCUSDT',
        expect.any(Number), // Should be increased quantity
        50000,
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const mockAction = jest.fn().mockResolvedValue({ msg: 'API Error' });
      placer.getAction = jest.fn().mockReturnValue(mockAction);
      
      await placer.place_order('USDT', 0.1, 50000, true);
      
      expect(mockBotLogger.instance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PlaceOrderError'
        })
      );
    });
  });

  describe('utility methods', () => {
    it('should count decimals correctly', () => {
      expect(placer.countDecimals(0.01)).toBe(2);
      expect(placer.countDecimals(0.00001)).toBe(5);
      expect(placer.countDecimals(1)).toBe(0);
    });

    it('should truncate digits correctly', () => {
      expect(placer.truncDigits(1.23456, 2)).toBeCloseTo(1.23, 2);
      expect(placer.truncDigits(1.99999, 3)).toBeCloseTo(1.999, 3);
    });

    it('should calculate add function correctly', () => {
      expect(placer.add(1, 0.1)).toBeCloseTo(1.1, 10);
      expect(placer.add(0.1, 0.2)).toBeCloseTo(0.3, 10);
    });

    it('should calculate sub function correctly', () => {
      expect(placer.sub(1, 0.1)).toBeCloseTo(0.9, 10);
      expect(placer.sub(0.3, 0.1)).toBeCloseTo(0.2, 10);
    });

    it('should calculate maxFunc correctly', () => {
      expect(placer.maxFunc(5, 10)).toBe(10);
      expect(placer.maxFunc(15, 10)).toBe(15);
    });

    it('should calculate minFunc correctly', () => {
      expect(placer.minFunc(5, 10)).toBe(5);
      expect(placer.minFunc(15, 10)).toBe(10);
    });
  });
});