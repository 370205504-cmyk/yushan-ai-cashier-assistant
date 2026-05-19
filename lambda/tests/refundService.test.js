const refundService = require('../services/refundService');
const db = require('../database/db');

jest.mock('../database/db');
jest.mock('../utils/logger');

describe('Refund Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefund', () => {
    it('should create a refund record', async () => {
      const mockResult = { insertId: 1 };
      db.query.mockResolvedValue([mockResult]);

      const result = await refundService.createRefund(1, 100.00, '测试退款');

      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO refunds (order_id, refund_no, amount, reason, status) VALUES (?, ?, ?, ?, ?)',
        [1, expect.any(String), 100.00, '测试退款', 'pending']
      );
      expect(result).toEqual({ refundId: 1, refundNo: expect.any(String), status: 'pending' });
    });
  });

  describe('processRefundCallback', () => {
    it('should handle successful refund', async () => {
      const mockConnection = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id: 1, order_id: 1, status: 'pending' }]])
          .mockResolvedValueOnce({ affectedRows: 1 })
          .mockResolvedValueOnce({ affectedRows: 1 })
      };

      db.transaction.mockImplementation(async (fn) => {
        await fn(mockConnection);
      });

      await refundService.processRefundCallback('REF001', 'SUCCESS');

      expect(mockConnection.query).toHaveBeenCalledWith(
        'SELECT * FROM refunds WHERE refund_no = ? FOR UPDATE',
        ['REF001']
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        'UPDATE refunds SET status = "success", refund_time = NOW() WHERE refund_no = ?',
        ['REF001']
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        'UPDATE orders SET payment_status = "refunded" WHERE id = ?',
        [1]
      );
    });

    it('should handle non-existent refund', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce([[]])
      };

      db.transaction.mockImplementation(async (fn) => {
        await fn(mockConnection);
      });

      await refundService.processRefundCallback('REF999', 'SUCCESS');

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
    });

    it('should skip already processed refund', async () => {
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce([[{ id: 1, order_id: 1, status: 'success' }]])
      };

      db.transaction.mockImplementation(async (fn) => {
        await fn(mockConnection);
      });

      await refundService.processRefundCallback('REF001', 'SUCCESS');

      expect(mockConnection.query).toHaveBeenCalledTimes(1);
    });

    it('should handle failed refund', async () => {
      const mockConnection = {
        query: jest.fn()
          .mockResolvedValueOnce([[{ id: 1, order_id: 1, status: 'pending' }]])
          .mockResolvedValueOnce({ affectedRows: 1 })
      };

      db.transaction.mockImplementation(async (fn) => {
        await fn(mockConnection);
      });

      await refundService.processRefundCallback('REF001', 'FAIL', '用户取消');

      expect(mockConnection.query).toHaveBeenCalledWith(
        'UPDATE refunds SET status = "fail", fail_reason = ?, refund_time = NOW() WHERE refund_no = ?',
        ['用户取消', 'REF001']
      );
    });
  });

  describe('getRefundByOrderId', () => {
    it('should return refund for order', async () => {
      const mockRefund = { id: 1, order_id: 1, status: 'success' };
      db.query.mockResolvedValue([[mockRefund]]);

      const result = await refundService.getRefundByOrderId(1);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC',
        [1]
      );
      expect(result).toEqual(mockRefund);
    });

    it('should return null if no refund found', async () => {
      db.query.mockResolvedValue([[]]);

      const result = await refundService.getRefundByOrderId(999);

      expect(result).toBeNull();
    });
  });
});
