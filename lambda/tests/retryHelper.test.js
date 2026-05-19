const { retryWithBackoff, retryWithExponentialBackoff } = require('../utils/retryHelper');

jest.setTimeout(30000);

describe('Retry Helper', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(mockFn, { retries: 2, initialDelay: 100 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, { retries: 3, initialDelay: 100 });
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(retryWithBackoff(mockFn, { retries: 2, initialDelay: 100 }))
        .rejects
        .toThrow('fail');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const start = Date.now();

      try {
        await retryWithBackoff(mockFn, { retries: 3, initialDelay: 100, factor: 2, jitter: false });
      } catch (e) {
        // expected
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100 + 200);
    });
  });

  describe('retryWithExponentialBackoff', () => {
    it('should use default exponential backoff settings', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retryWithExponentialBackoff(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after 3 retries by default', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(retryWithExponentialBackoff(mockFn))
        .rejects
        .toThrow('fail');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });
});
