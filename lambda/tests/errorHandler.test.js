const {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError
} = require('../middleware/errorHandler');

describe('Error Handler', () => {
  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const err = new AppError('Test error', 400, 1001);
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe(1001);
      expect(err.isOperational).toBe(true);
    });

    it('should create ValidationError with correct properties', () => {
      const err = new ValidationError('Validation failed');
      expect(err.message).toBe('Validation failed');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe(1001);
      expect(err.name).toBe('ValidationError');
    });

    it('should create UnauthorizedError with correct properties', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe(2000);
      expect(err.name).toBe('UnauthorizedError');
    });

    it('should create NotFoundError with correct properties', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe(1004);
      expect(err.name).toBe('NotFoundError');
    });

    it('should create ConflictError with correct properties', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe(1005);
      expect(err.name).toBe('ConflictError');
    });
  });

  describe('errorHandler middleware', () => {
    it('should be a function', () => {
      expect(typeof errorHandler).toBe('function');
    });

    it('should accept 4 parameters (err, req, res, next)', () => {
      expect(errorHandler.length).toBe(4);
    });
  });
});
