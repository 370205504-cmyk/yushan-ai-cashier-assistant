const logger = require('../utils/logger');

describe('Logger Utility', () => {
  describe('Basic Logging', () => {
    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Custom Log Methods', () => {
    it('should have logOrder method', () => {
      expect(typeof logger.logOrder).toBe('function');
    });

    it('should have logPayment method', () => {
      expect(typeof logger.logPayment).toBe('function');
    });

    it('should have logOperation method', () => {
      expect(typeof logger.logOperation).toBe('function');
    });

    it('should have logSecurity method', () => {
      expect(typeof logger.logSecurity).toBe('function');
    });

    it('should have logPerformance method', () => {
      expect(typeof logger.logPerformance).toBe('function');
    });
  });

  describe('Log Execution', () => {
    it('should execute logOrder without errors', () => {
      expect(() => logger.logOrder('ORD123', '创建订单', { amount: 100 })).not.toThrow();
    });

    it('should execute logPayment without errors', () => {
      expect(() => logger.logPayment('ORD123', '支付成功', { paymentNo: 'PAY456' })).not.toThrow();
    });
  });
});
