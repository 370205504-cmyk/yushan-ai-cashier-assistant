const { describe, it, expect } = require('@jest/globals');
const { ApiResponse, ERROR_CODES, ERROR_MESSAGES } = require('../utils/response');

describe('Response 工具函数', () => {
  describe('ApiResponse', () => {
    it('应该生成成功响应', () => {
      const data = { id: 1, name: 'test' };
      const response = ApiResponse.success(data);
      expect(response.success).toBe(true);
      expect(response.code).toBe(ERROR_CODES.SUCCESS);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('');
    });

    it('应该生成带自定义消息的成功响应', () => {
      const data = { id: 1 };
      const response = ApiResponse.success(data, '操作成功');
      expect(response.message).toBe('操作成功');
    });

    it('应该生成错误响应', () => {
      const code = ERROR_CODES.PARAM_ERROR;
      const response = ApiResponse.error(code);
      expect(response.success).toBe(false);
      expect(response.code).toBe(code);
      expect(response.message).toBe(ERROR_MESSAGES.PARAM_ERROR);
      expect(response.data).toBeNull();
    });

    it('应该生成带自定义消息的错误响应', () => {
      const response = ApiResponse.error(ERROR_CODES.PARAM_ERROR, '自定义错误');
      expect(response.message).toBe('自定义错误');
    });
  });

  describe('ERROR_CODES', () => {
    it('应该包含所有标准错误码', () => {
      expect(ERROR_CODES.SUCCESS).toBe(0);
      expect(ERROR_CODES.UNAUTHORIZED).toBe(1001);
      expect(ERROR_CODES.PARAM_ERROR).toBe(1002);
      expect(ERROR_CODES.SYSTEM_ERROR).toBe(1000);
      expect(ERROR_CODES.ORDER_NOT_EXIST).toBe(2001);
      expect(ERROR_CODES.NOT_FOUND).toBe(1004);
      expect(ERROR_CODES.FORBIDDEN).toBe(1003);
    });
  });
});
