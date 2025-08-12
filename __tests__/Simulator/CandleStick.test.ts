import { jest } from '@jest/globals';
import { CandleStick } from '../../Simulator/DataManager.js';

describe('CandleStick', () => {
  describe('constructor', () => {
    it('should create candlestick with all parameters', () => {
      const time = 1640995200000; // Jan 1, 2022 00:00:00 UTC
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

    it('should create candlestick with no parameters', () => {
      const candle = new CandleStick();

      expect(candle.time).toBeUndefined();
      expect(candle.high).toBeUndefined();
      expect(candle.low).toBeUndefined();
      expect(candle.close).toBeUndefined();
      expect(candle.next).toBeUndefined();
      expect(candle.parent).toBeUndefined();
      expect(candle.children).toEqual([]);
      expect(candle.lastChild).toBe(false);
    });

    it('should create candlestick with partial parameters', () => {
      const time = 1640995200000;
      const high = 51000;

      const candle = new CandleStick(time, high);

      expect(candle.time).toBe(time);
      expect(candle.high).toBe(high);
      expect(candle.low).toBeUndefined();
      expect(candle.close).toBeUndefined();
    });
  });

  describe('relationships', () => {
    it('should support parent-child relationships', () => {
      const parent = new CandleStick(1000, 100, 90, 95);
      const child = new CandleStick(2000, 110, 95, 105);

      parent.children.push(child);
      child.parent = parent;

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
      expect(child.parent).toBe(parent);
    });

    it('should support next/previous relationships', () => {
      const first = new CandleStick(1000, 100, 90, 95);
      const second = new CandleStick(2000, 110, 95, 105);

      first.next = second;
      second.parent = first;

      expect(first.next).toBe(second);
      expect(second.parent).toBe(first);
    });

    it('should support multiple children', () => {
      const parent = new CandleStick(1000, 100, 90, 95);
      const child1 = new CandleStick(1100, 102, 91, 98);
      const child2 = new CandleStick(1200, 105, 93, 100);
      const child3 = new CandleStick(1300, 108, 96, 103);

      parent.children.push(child1, child2, child3);
      child1.parent = parent;
      child2.parent = parent;
      child3.parent = parent;

      expect(parent.children.length).toBe(3);
      expect(child1.parent).toBe(parent);
      expect(child2.parent).toBe(parent);
      expect(child3.parent).toBe(parent);
    });
  });

  describe('properties', () => {
    it('should support SMA property', () => {
      const candle = new CandleStick(1000, 100, 90, 95);
      candle.sma = 92.5;

      expect(candle.sma).toBe(92.5);
    });

    it('should support longSMA property', () => {
      const candle = new CandleStick(1000, 100, 90, 95);
      candle.longSMA = 88.3;

      expect(candle.longSMA).toBe(88.3);
    });

    it('should support lastChild flag', () => {
      const candle = new CandleStick(1000, 100, 90, 95);
      
      expect(candle.lastChild).toBe(false);
      
      candle.lastChild = true;
      expect(candle.lastChild).toBe(true);
    });

    it('should support endTime property', () => {
      const candle = new CandleStick(1000, 100, 90, 95);
      candle.endTime = 1060; // 1 minute later

      expect(candle.endTime).toBe(1060);
    });
  });

  describe('realistic scenarios', () => {
    it('should handle realistic OHLC data', () => {
      const candle = new CandleStick(
        1640995200000, // 2022-01-01 00:00:00 UTC
        46934.56,      // High
        46706.23,      // Low
        46850.78       // Close
      );

      expect(candle.time).toBe(1640995200000);
      expect(candle.high).toBeCloseTo(46934.56, 2);
      expect(candle.low).toBeCloseTo(46706.23, 2);
      expect(candle.close).toBeCloseTo(46850.78, 2);
    });

    it('should validate OHLC relationships in real data', () => {
      const high = 51000;
      const low = 49000;
      const close = 50500;
      
      const candle = new CandleStick(1640995200000, high, low, close);

      // In a valid candle: low <= close <= high
      expect(candle.low).toBeLessThanOrEqual(candle.close);
      expect(candle.close).toBeLessThanOrEqual(candle.high);
    });

    it('should support building a candlestick chain', () => {
      const candles: CandleStick[] = [];
      const baseTime = 1640995200000;
      const interval = 60000; // 1 minute

      for (let i = 0; i < 5; i++) {
        const candle = new CandleStick(
          baseTime + (i * interval),
          50000 + (i * 10),  // Gradually increasing high
          49000 + (i * 5),   // Gradually increasing low
          49500 + (i * 7)    // Gradually increasing close
        );

        if (i > 0) {
          candle.parent = candles[i - 1];
          candles[i - 1].next = candle;
        }

        candles.push(candle);
      }

      // Verify chain structure
      expect(candles.length).toBe(5);
      expect(candles[0].parent).toBeUndefined();
      expect(candles[0].next).toBe(candles[1]);
      expect(candles[2].parent).toBe(candles[1]);
      expect(candles[2].next).toBe(candles[3]);
      expect(candles[4].next).toBeUndefined();
    });
  });
});