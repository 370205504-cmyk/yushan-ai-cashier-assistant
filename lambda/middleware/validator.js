const { validateInput, ApiResponse, ERROR_CODES } = require('../utils/response');

const validationRules = {
  createOrder: {
    type: { type: 'string', required: true },
    items: { type: 'string', required: true },
    tableNo: { type: 'string', maxLength: 20 },
    guestCount: { type: 'number', min: 1, max: 50 },
    remarks: { type: 'string', maxLength: 200 },
    addressId: { type: 'number' }
  },
  updateDish: {
    name: { type: 'string', required: true, maxLength: 50 },
    price: { type: 'number', required: true, min: 0 },
    category: { type: 'string', maxLength: 30 },
    description: { type: 'string', maxLength: 200 },
    image: { type: 'string', maxLength: 500 },
    stock: { type: 'number', min: 0 },
    unit: { type: 'string', maxLength: 10 }
  },
  login: {
    phone: { type: 'string', required: true, pattern: /^1[3-9]\d{9}$/, patternMessage: '手机号格式不正确' },
    password: { type: 'string', required: true, minLength: 6, maxLength: 20 }
  },
  register: {
    phone: { type: 'string', required: true, pattern: /^1[3-9]\d{9}$/, patternMessage: '手机号格式不正确' },
    password: { type: 'string', required: true, minLength: 6, maxLength: 20 },
    nickname: { type: 'string', maxLength: 30 }
  },
  adminLogin: {
    username: { type: 'string', required: true, maxLength: 50 },
    password: { type: 'string', required: true, minLength: 6 }
  },
  updateStock: {
    dishId: { type: 'number', required: true },
    quantity: { type: 'number', required: true },
    reason: { type: 'string', maxLength: 100 }
  },
  addToCart: {
    dishId: { type: 'number', required: true },
    quantity: { type: 'number', required: true, min: 1, max: 99 }
  },
  updateProfile: {
    nickname: { type: 'string', maxLength: 30 },
    realName: { type: 'string', maxLength: 30 },
    avatar: { type: 'string', maxLength: 500 }
  },
  address: {
    receiverName: { type: 'string', required: true, maxLength: 30 },
    phone: { type: 'string', required: true, pattern: /^1[3-9]\d{9}$/, patternMessage: '手机号格式不正确' },
    province: { type: 'string', required: true, maxLength: 20 },
    city: { type: 'string', required: true, maxLength: 20 },
    district: { type: 'string', required: true, maxLength: 20 },
    detail: { type: 'string', required: true, maxLength: 100 }
  },
  refund: {
    orderId: { type: 'number', required: true },
    reason: { type: 'string', maxLength: 200 }
  }
};

function validateRequest(rulesName) {
  const rules = validationRules[rulesName];

  if (!rules) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const errors = validateInput(rules, req.body);

    if (errors.length > 0) {
      return res.status(400).json(
        ApiResponse.error(ERROR_CODES.VALIDATION_ERROR, { errors })
      );
    }

    next();
  };
}

function validateQuery(rules) {
  return (req, res, next) => {
    const errors = validateInput(rules, req.query);

    if (errors.length > 0) {
      return res.status(400).json(
        ApiResponse.error(ERROR_CODES.VALIDATION_ERROR, { errors })
      );
    }

    next();
  };
}

module.exports = {
  validationRules,
  validateRequest,
  validateQuery
};
