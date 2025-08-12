# Unit Tests for Workers Directory

This directory contains comprehensive unit tests for all worker classes in the `Workers/` directory of the NodeBot trading application.

## Test Setup

### Framework
- **Jest**: Testing framework with TypeScript support
- **ts-jest**: TypeScript preprocessor for Jest
- **ESM Support**: Configured for ES Module syntax

### Configuration
- `jest.config.js`: Main Jest configuration
- `__tests__/setup.ts`: Test environment setup
- `__tests__/mocks/`: Mock implementations for external dependencies

## Test Structure

### Mock Implementations (`__tests__/mocks/index.ts`)
Comprehensive mocks for:
- **Binance API**: All trading operations (buy, sell, futures, etc.)
- **Socket Connections**: Real-time price feeds and order books
- **Database Layer (DAL)**: Bot data persistence
- **Logger**: Application logging
- **Bot Models**: Trading bot configurations
- **Exchange Info**: Market data and trading rules

### Test Files

#### 1. `BasePlacer.test.ts`
Tests for the abstract base class that provides core trading functionality:
- **Constructor**: Initialization with bot and exchange data
- **Order Placement**: Core order placement logic with validation
- **Price/Quantity Calculations**: Rounding, precision handling
- **Order Book Alignment**: Price alignment with market depth
- **BNB Balance Management**: Automatic BNB purchases for fees
- **Order History Building**: Processing past trades
- **Utility Functions**: Math operations for trading calculations
- **Error Handling**: Graceful handling of API failures

#### 2. `FuturesTrader.test.ts`
Tests for futures trading functionality:
- **Position Management**: Tracking open positions
- **Leverage Calculations**: Leveraged balance computations
- **Futures-Specific Operations**: Mark prices, funding rates
- **Trading Logic Flow**: Complete trading cycle execution
- **Risk Management**: Position sizing and validation
- **Error States**: Handling missing data gracefully

#### 3. `OneStep.test.ts`
Tests for the OneStep trading strategy:
- **Entry Logic**: Single-step position entry
- **Exit Logic**: Take profit and stop loss orders
- **Price Calculations**: Entry and exit price determination
- **Order Types**: Stop market and take profit market orders
- **Position Direction**: Long/short position handling
- **Risk Parameters**: Stop loss and take profit settings

#### 4. `DirectionTrader.test.ts`
Tests for directional trading with advanced order types:
- **Dual Direction Trading**: Both long and short positions
- **Stop Orders**: Stop market order placement
- **Trailing Stops**: Dynamic stop loss adjustment
- **Position Sizing**: Quantity calculations with leverage
- **Error Recovery**: Stop loss orders on errors
- **Direction Management**: Dynamic direction switching

#### 5. `Periodically.test.ts`
Tests for periodic trading strategy:
- **Order Book Analysis**: Best bid/ask price selection
- **Periodic Execution**: Regular trading intervals
- **Side Determination**: Buy/sell decision logic
- **Market Depth**: Order book liquidity analysis
- **BNB Management**: Automatic BNB balance maintenance

## Test Categories

### Unit Tests
- **Method-Level Testing**: Individual function validation
- **State Management**: Property and status tracking
- **Calculation Accuracy**: Mathematical operations
- **Conditional Logic**: Decision tree coverage

### Integration Tests
- **Class Inheritance**: Parent-child class interactions
- **External Dependencies**: Mock service integration
- **Data Flow**: Information passing between components

### Error Handling Tests
- **API Failures**: Network and service errors
- **Invalid Data**: Malformed or missing inputs
- **Edge Cases**: Boundary condition handling
- **Graceful Degradation**: Continuing operation despite errors

## Coverage Areas

### Core Trading Operations
✅ Order placement and validation  
✅ Price and quantity calculations  
✅ Market data processing  
✅ Risk management  
✅ Position tracking  

### Strategy-Specific Logic
✅ OneStep entry/exit logic  
✅ DirectionTrader dual-direction trading  
✅ Periodically market timing  
✅ FuturesTrader leverage handling  

### External Integrations
✅ Binance API interactions  
✅ WebSocket data feeds  
✅ Database operations  
✅ Logging and monitoring  

### Error Scenarios
✅ Network failures  
✅ Invalid market data  
✅ Insufficient balances  
✅ Order rejection handling  

## Running Tests

### All Tests
```bash
pnpm test
```

### Specific Test File
```bash
pnpm test BasePlacer.test.ts
```

### With Coverage
```bash
pnpm test:coverage
```

### Watch Mode
```bash
pnpm test:watch
```

## Test Data

### Mock Bot Configuration
```typescript
{
  _id: 'test-bot-id',
  coin1: 'BTC',
  coin2: 'USDT',
  leverage: 10,
  buy_percent: 0.01,
  sell_percent: 0.01,
  amount_percent: 0.1,
  take_profit: 0.02,
  stop_loose: 0.01,
  direction: true,
  isFuture: false
}
```

### Mock Market Data
```typescript
{
  prices: { 'BTCUSDT': 50000 },
  markPrices: { 'BTCUSDT': 49950 },
  orderBooks: {
    'BTCUSDT': {
      bids: { '49000': 2.5, '48000': 1.0 },
      asks: { '51000': 1.5, '52000': 2.0 }
    }
  }
}
```

## Best Practices Implemented

### Test Isolation
- Each test is independent and can run alone
- Mocks are reset between tests
- No shared state between test cases

### Comprehensive Coverage
- Happy path scenarios
- Edge cases and error conditions
- Boundary value testing
- State transition validation

### Maintainable Structure
- Clear test organization by functionality
- Descriptive test names and documentation
- Reusable mock factories
- Consistent assertion patterns

### Performance Considerations
- Fast test execution with mocked dependencies
- Parallel test execution where possible
- Minimal setup and teardown overhead

## Future Enhancements

### Additional Worker Classes
- `AviAlgo.ts` - Algorithm-based trading
- `DualBot.ts` - Dual bot coordination
- `PlaceOrders.ts` - Order placement utilities
- `SignaligProcessor.ts` - Signal processing
- `WeightAvg.ts` - Weighted average calculations

### Enhanced Test Coverage
- End-to-end integration tests
- Performance benchmarking
- Stress testing with high-frequency scenarios
- Real market data simulation

### Continuous Integration
- Automated test execution on code changes
- Coverage reporting and thresholds
- Test result notifications
- Quality gate enforcement

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Use appropriate mock factories from `__tests__/mocks/`
3. Include both positive and negative test cases
4. Document complex test scenarios
5. Ensure tests are deterministic and fast

## Dependencies

- `jest`: ^30.0.5
- `@jest/globals`: ^30.0.5
- `@types/jest`: ^30.0.0
- `ts-jest`: ^29.4.1

The test suite provides comprehensive coverage of the Workers directory, ensuring reliable and maintainable trading bot functionality.