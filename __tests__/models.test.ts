import { jest } from '@jest/globals';

// Simple data structures for testing
interface TradingBot {
  id: string;
  name: string;
  symbol: string;
  isActive: boolean;
  balance: number;
  settings: {
    buyPercent: number;
    sellPercent: number;
    stopLoss: number;
    takeProfit: number;
  };
}

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS';
  quantity: number;
  price?: number;
  status: 'NEW' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: number;
}

interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
}

// Factory functions for creating test data
function createTestBot(overrides: Partial<TradingBot> = {}): TradingBot {
  return {
    id: 'bot-123',
    name: 'Test Bot',
    symbol: 'BTCUSDT',
    isActive: true,
    balance: 1000,
    settings: {
      buyPercent: 0.01,
      sellPercent: 0.01,
      stopLoss: 0.02,
      takeProfit: 0.03
    },
    ...overrides
  };
}

function createTestOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-456',
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 0.1,
    price: 50000,
    status: 'NEW',
    timestamp: Date.now(),
    ...overrides
  };
}

function createTestPriceData(overrides: Partial<PriceData> = {}): PriceData {
  return {
    symbol: 'BTCUSDT',
    price: 50000,
    timestamp: Date.now(),
    volume: 1000,
    ...overrides
  };
}

// Business logic functions
function validateBot(bot: TradingBot): string[] {
  const errors: string[] = [];
  
  if (!bot.id) errors.push('Bot ID is required');
  if (!bot.name) errors.push('Bot name is required');
  if (!bot.symbol) errors.push('Bot symbol is required');
  if (bot.balance < 0) errors.push('Bot balance cannot be negative');
  if (bot.settings.buyPercent <= 0) errors.push('Buy percent must be positive');
  if (bot.settings.sellPercent <= 0) errors.push('Sell percent must be positive');
  if (bot.settings.stopLoss <= 0) errors.push('Stop loss must be positive');
  if (bot.settings.takeProfit <= 0) errors.push('Take profit must be positive');
  
  return errors;
}

function validateOrder(order: Order): string[] {
  const errors: string[] = [];
  
  if (!order.id) errors.push('Order ID is required');
  if (!order.symbol) errors.push('Order symbol is required');
  if (!['BUY', 'SELL'].includes(order.side)) errors.push('Invalid order side');
  if (!['MARKET', 'LIMIT', 'STOP_LOSS'].includes(order.type)) errors.push('Invalid order type');
  if (order.quantity <= 0) errors.push('Order quantity must be positive');
  if (order.type === 'LIMIT' && (!order.price || order.price <= 0)) {
    errors.push('Limit orders must have a positive price');
  }
  
  return errors;
}

function calculateOrderValue(order: Order, currentPrice?: number): number {
  const price = order.price || currentPrice || 0;
  return order.quantity * price;
}

function updateOrderStatus(order: Order, newStatus: Order['status']): Order {
  return {
    ...order,
    status: newStatus,
    timestamp: Date.now()
  };
}

describe('Trading Data Models', () => {
  describe('TradingBot', () => {
    it('should create a valid bot with default values', () => {
      const bot = createTestBot();
      
      expect(bot.id).toBe('bot-123');
      expect(bot.name).toBe('Test Bot');
      expect(bot.symbol).toBe('BTCUSDT');
      expect(bot.isActive).toBe(true);
      expect(bot.balance).toBe(1000);
      expect(bot.settings.buyPercent).toBe(0.01);
    });

    it('should allow overriding default values', () => {
      const bot = createTestBot({
        id: 'custom-bot',
        name: 'Custom Bot',
        balance: 5000,
        isActive: false
      });
      
      expect(bot.id).toBe('custom-bot');
      expect(bot.name).toBe('Custom Bot');
      expect(bot.balance).toBe(5000);
      expect(bot.isActive).toBe(false);
      expect(bot.symbol).toBe('BTCUSDT'); // Should keep default
    });

    it('should validate bot data correctly', () => {
      const validBot = createTestBot();
      expect(validateBot(validBot)).toEqual([]);
    });

    it('should detect invalid bot data', () => {
      const invalidBot = createTestBot({
        id: '',
        name: '',
        balance: -100,
        settings: {
          buyPercent: -0.01,
          sellPercent: 0,
          stopLoss: -0.02,
          takeProfit: 0
        }
      });
      
      const errors = validateBot(invalidBot);
      expect(errors).toContain('Bot ID is required');
      expect(errors).toContain('Bot name is required');
      expect(errors).toContain('Bot balance cannot be negative');
      expect(errors).toContain('Buy percent must be positive');
      expect(errors).toContain('Sell percent must be positive');
      expect(errors).toContain('Stop loss must be positive');
      expect(errors).toContain('Take profit must be positive');
    });
  });

  describe('Order', () => {
    it('should create a valid order with default values', () => {
      const order = createTestOrder();
      
      expect(order.id).toBe('order-456');
      expect(order.symbol).toBe('BTCUSDT');
      expect(order.side).toBe('BUY');
      expect(order.type).toBe('LIMIT');
      expect(order.quantity).toBe(0.1);
      expect(order.price).toBe(50000);
      expect(order.status).toBe('NEW');
      expect(order.timestamp).toBeGreaterThan(0);
    });

    it('should allow creating market orders without price', () => {
      const order = createTestOrder({
        type: 'MARKET',
        price: undefined
      });
      
      expect(order.type).toBe('MARKET');
      expect(order.price).toBeUndefined();
    });

    it('should validate order data correctly', () => {
      const validOrder = createTestOrder();
      expect(validateOrder(validOrder)).toEqual([]);
    });

    it('should detect invalid order data', () => {
      const invalidOrder = createTestOrder({
        id: '',
        symbol: '',
        side: 'INVALID' as any,
        type: 'INVALID' as any,
        quantity: -1,
        price: -100
      });
      
      const errors = validateOrder(invalidOrder);
      expect(errors).toContain('Order ID is required');
      expect(errors).toContain('Order symbol is required');
      expect(errors).toContain('Invalid order side');
      expect(errors).toContain('Invalid order type');
      expect(errors).toContain('Order quantity must be positive');
    });

    it('should require price for limit orders', () => {
      const limitOrderWithoutPrice = createTestOrder({
        type: 'LIMIT',
        price: undefined
      });
      
      const errors = validateOrder(limitOrderWithoutPrice);
      expect(errors).toContain('Limit orders must have a positive price');
    });

    it('should calculate order value correctly', () => {
      const order = createTestOrder({
        quantity: 0.1,
        price: 50000
      });
      
      expect(calculateOrderValue(order)).toBe(5000);
    });

    it('should calculate market order value with current price', () => {
      const marketOrder = createTestOrder({
        type: 'MARKET',
        quantity: 0.1,
        price: undefined
      });
      
      expect(calculateOrderValue(marketOrder, 51000)).toBe(5100);
    });

    it('should update order status correctly', () => {
      const order = createTestOrder();
      const originalTimestamp = order.timestamp;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        const updatedOrder = updateOrderStatus(order, 'FILLED');
        
        expect(updatedOrder.status).toBe('FILLED');
        expect(updatedOrder.timestamp).toBeGreaterThan(originalTimestamp);
        expect(updatedOrder.id).toBe(order.id); // Other properties preserved
      }, 1);
    });
  });

  describe('PriceData', () => {
    it('should create valid price data', () => {
      const priceData = createTestPriceData();
      
      expect(priceData.symbol).toBe('BTCUSDT');
      expect(priceData.price).toBe(50000);
      expect(priceData.timestamp).toBeGreaterThan(0);
      expect(priceData.volume).toBe(1000);
    });

    it('should allow custom price data', () => {
      const customPriceData = createTestPriceData({
        symbol: 'ETHUSDT',
        price: 3000,
        volume: 500
      });
      
      expect(customPriceData.symbol).toBe('ETHUSDT');
      expect(customPriceData.price).toBe(3000);
      expect(customPriceData.volume).toBe(500);
    });
  });

  describe('Integration Tests', () => {
    it('should handle a complete trading workflow', () => {
      // Create a bot
      const bot = createTestBot({
        balance: 10000,
        settings: {
          buyPercent: 0.01,
          sellPercent: 0.01,
          stopLoss: 0.02,
          takeProfit: 0.03
        }
      });
      
      expect(validateBot(bot)).toEqual([]);
      
      // Create a buy order
      const buyOrder = createTestOrder({
        side: 'BUY',
        quantity: 0.1,
        price: 50000
      });
      
      expect(validateOrder(buyOrder)).toEqual([]);
      
      const orderValue = calculateOrderValue(buyOrder);
      expect(orderValue).toBe(5000);
      expect(orderValue).toBeLessThan(bot.balance); // Can afford the order
      
      // Execute the order
      const executedOrder = updateOrderStatus(buyOrder, 'FILLED');
      expect(executedOrder.status).toBe('FILLED');
      
      // Create a sell order with take profit
      const sellPrice = buyOrder.price! * (1 + bot.settings.takeProfit);
      const sellOrder = createTestOrder({
        side: 'SELL',
        quantity: buyOrder.quantity,
        price: sellPrice
      });
      
      expect(sellOrder.price).toBe(51500); // 50000 * 1.03
      expect(validateOrder(sellOrder)).toEqual([]);
    });

    it('should work with mock data sources', () => {
      const mockPriceSource = jest.fn();
      mockPriceSource.mockReturnValue(createTestPriceData({ price: 52000 }));
      
      const priceData = mockPriceSource();
      expect(priceData.price).toBe(52000);
      
      const marketOrder = createTestOrder({
        type: 'MARKET',
        price: undefined
      });
      
      const orderValue = calculateOrderValue(marketOrder, priceData.price);
      expect(orderValue).toBe(5200); // 0.1 * 52000
    });

    it('should handle multiple orders for a bot', () => {
      const bot = createTestBot();
      const orders: Order[] = [];
      
      // Create multiple orders
      for (let i = 0; i < 3; i++) {
        const order = createTestOrder({
          id: `order-${i}`,
          price: 50000 + (i * 100),
          quantity: 0.1
        });
        orders.push(order);
      }
      
      expect(orders).toHaveLength(3);
      expect(orders[0].price).toBe(50000);
      expect(orders[1].price).toBe(50100);
      expect(orders[2].price).toBe(50200);
      
      // Validate all orders
      orders.forEach(order => {
        expect(validateOrder(order)).toEqual([]);
      });
      
      // Calculate total value
      const totalValue = orders.reduce((sum, order) => sum + calculateOrderValue(order), 0);
      expect(totalValue).toBe(15030); // (50000 + 50100 + 50200) * 0.1
    });
  });
});