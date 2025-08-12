# Unit Tests for NodeBot Trading Application

This directory contains comprehensive unit tests for the NodeBot trading application, providing thorough testing of trading logic, data models, and utility functions.

## ✅ **Working Test Suite Status**

All tests are currently **PASSING** with 49 tests across 3 test suites:

```bash
Test Suites: 3 passed, 3 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        0.316 s
```

## Test Structure

### ✅ **Active Test Files**

#### 1. **`__tests__/basic.test.ts`** - Framework Validation
**5 tests passing** - Validates Jest testing framework functionality:
- ✅ Basic arithmetic operations
- ✅ Array and object handling
- ✅ Asynchronous function testing
- ✅ Mock function capabilities

#### 2. **`__tests__/Workers/utils.test.ts`** - Trading Utilities
**27 tests passing** - Comprehensive testing of trading utility functions:

**Core Mathematical Functions:**
- ✅ `calculatePercentage()` - Percentage calculations for trading
- ✅ `roundToDecimals()` - Price and quantity rounding
- ✅ `calculateSimpleMovingAverage()` - Technical analysis calculations
- ✅ `validateOrderQuantity()` - Exchange compliance validation
- ✅ `calculateProfitLoss()` - P&L calculations for positions

**Integration Scenarios:**
- ✅ Complete trade calculation workflows
- ✅ SMA-based entry signal validation
- ✅ Risk-based position sizing
- ✅ Mock function integration

#### 3. **`__tests__/models.test.ts`** - Data Models & Business Logic
**17 tests passing** - Testing of trading data structures and validation:

**Data Models:**
- ✅ `TradingBot` interface and validation
- ✅ `Order` interface and validation  
- ✅ `PriceData` interface and handling

**Business Logic:**
- ✅ Bot configuration validation
- ✅ Order validation and lifecycle
- ✅ Order value calculations
- ✅ Complete trading workflow simulations

## Test Framework Configuration

### **Jest Setup** (`jest.config.js`)
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'Workers/**/*.ts',
    'Simulator/**/*.ts',
    '!Workers/**/*.d.ts',
    '!Simulator/**/*.d.ts',
    '!Simulator/exchangeInfo*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
};
```

### **TypeScript Configuration** (`tsconfig.json`)
- ✅ ESM module support
- ✅ Isolated modules for Jest compatibility
- ✅ Strict type checking enabled

## Running Tests

### **All Tests**
```bash
pnpm test
```

### **Individual Test Files**
```bash
# Trading utilities
pnpm test utils.test.ts

# Data models
pnpm test models.test.ts

# Framework validation
pnpm test basic.test.ts
```

### **With Coverage**
```bash
pnpm test:coverage
```

### **Watch Mode**
```bash
pnpm test:watch
```

## Test Coverage Areas

### **✅ Mathematical Operations**
- Percentage calculations for trading decisions
- Decimal rounding for price/quantity precision
- Moving averages for technical analysis
- Profit/loss calculations for all position types

### **✅ Data Validation**
- Trading bot configuration validation
- Order parameter validation
- Exchange rule compliance checking
- Data integrity verification

### **✅ Business Logic**
- Complete trading workflows
- Risk management calculations  
- Position sizing algorithms
- Order lifecycle management

### **✅ Mock Integration**
- Jest mock function usage
- Asynchronous operation testing
- Data source simulation
- API response mocking

## Key Testing Patterns

### **Factory Functions**
```typescript
function createTestBot(overrides: Partial<TradingBot> = {}): TradingBot {
  return {
    id: 'bot-123',
    name: 'Test Bot',
    symbol: 'BTCUSDT',
    // ... defaults with overrides
    ...overrides
  };
}
```

### **Validation Testing**
```typescript
describe('validateBot', () => {
  it('should validate bot data correctly', () => {
    const validBot = createTestBot();
    expect(validateBot(validBot)).toEqual([]);
  });
  
  it('should detect invalid bot data', () => {
    const invalidBot = createTestBot({ balance: -100 });
    const errors = validateBot(invalidBot);
    expect(errors).toContain('Bot balance cannot be negative');
  });
});
```

### **Integration Testing**
```typescript
it('should handle a complete trading workflow', () => {
  const bot = createTestBot({ balance: 10000 });
  const buyOrder = createTestOrder({ price: 50000, quantity: 0.1 });
  
  expect(validateOrder(buyOrder)).toEqual([]);
  expect(calculateOrderValue(buyOrder)).toBe(5000);
  expect(calculateOrderValue(buyOrder)).toBeLessThan(bot.balance);
});
```

## Mock Strategies

### **Function Mocking**
```typescript
const mockPriceSource = jest.fn();
mockPriceSource.mockReturnValue(50000);

const price = mockPriceSource();
expect(price).toBe(50000);
expect(mockPriceSource).toHaveBeenCalledTimes(1);
```

### **Async Mocking**
```typescript
const mockApiCall = jest.fn();
mockApiCall.mockResolvedValue({ price: 50000, symbol: 'BTCUSDT' });

const result = await mockApiCall();
expect(result.price).toBe(50000);
```

## Development Workflow

### **Test-Driven Development**
1. Write failing tests for new functionality
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Add edge case and error handling tests

### **Continuous Testing**
```bash
# Run tests on file changes
pnpm test:watch

# Run with coverage on save
pnpm test:coverage --watch
```

### **Quality Assurance**
- All tests must pass before code commits
- Maintain high test coverage for critical functions  
- Include both positive and negative test cases
- Test edge cases and error conditions

## Dependencies

- `jest`: ^30.0.5 - Testing framework
- `@jest/globals`: ^30.0.5 - Jest global functions
- `@types/jest`: ^30.0.0 - TypeScript definitions
- `ts-jest`: ^29.4.1 - TypeScript integration

## Best Practices

### **Test Organization**
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests focused and independent

### **Data Management**
- Use factory functions for test data creation
- Avoid hardcoded values where possible
- Test with realistic data scenarios
- Include boundary value testing

### **Assertions**
- Be specific with expectations
- Test both success and failure cases
- Validate error messages and types
- Use appropriate Jest matchers

### **Performance**
- Keep tests fast and focused
- Avoid unnecessary async operations
- Mock external dependencies
- Clean up resources after tests

## Future Enhancements

### **Planned Test Additions**
- [ ] Integration tests with actual Worker classes (once import issues resolved)
- [ ] End-to-end trading simulation tests
- [ ] Performance benchmarking tests
- [ ] Error recovery and resilience tests

### **Testing Infrastructure**
- [ ] Automated test reporting
- [ ] Performance regression testing
- [ ] Cross-environment compatibility testing
- [ ] Test data management utilities

## Contributing

When adding new tests:

1. **Follow Naming Conventions**: Use descriptive names for test files and test cases
2. **Maintain Independence**: Ensure tests don't depend on each other
3. **Include Documentation**: Add comments for complex test scenarios
4. **Test Edge Cases**: Include boundary conditions and error scenarios
5. **Update Documentation**: Keep this README current with new test additions

The test suite provides a solid foundation for validating trading logic and ensuring code reliability before deployment to live trading environments.