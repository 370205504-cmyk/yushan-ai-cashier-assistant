class ReservationService {
  constructor() {
    this.reservations = new Map();
    this.reservationCounter = 1000;
    this.maxPersonsPerTable = 8; // 每桌最大人数
    this.operatingHours = {
      start: '09:00',
      end: '21:00'
    };
  }

  /**
   * 创建预约
   * @param {Object} reservationData - 预约数据
   * @param {string} reservationData.date - 日期
   * @param {string} reservationData.time - 时间
   * @param {number} reservationData.personCount - 用餐人数
   * @param {string} reservationData.storeId - 门店ID
   * @param {string} reservationData.customerPhone - 客户电话
   * @returns {Object} 预约结果
   */
  createReservation(reservationData) {
    const { date, time, personCount, storeId, customerPhone } = reservationData;

    // 验证时间是否在营业时间内
    const timeValidation = this.validateTime(time);
    if (!timeValidation.valid) {
      return {
        success: false,
        message: timeValidation.message
      };
    }

    // 验证人数
    if (personCount > 20) {
      return {
        success: false,
        message: '单次预约最多支持20人，大型聚餐请联系门店电话预约'
      };
    }

    // 检查是否还有空位
    const availability = this.checkAvailability(storeId, date, time, personCount);
    if (!availability.available) {
      return {
        success: false,
        message: `抱歉，${date} ${time}已满座。请选择其他时间。`
      };
    }

    const reservationId = this.generateReservationId();
    const reservation = {
      reservationId: reservationId,
      date: date,
      time: time,
      endTime: this.calculateEndTime(time),
      personCount: personCount,
      tableCount: Math.ceil(personCount / this.maxPersonsPerTable),
      storeId: storeId,
      storeName: this.getStoreName(storeId),
      customerPhone: customerPhone,
      status: 'confirmed', // confirmed, checked_in, completed, cancelled, no_show
      createdAt: new Date().toISOString(),
      specialRequests: []
    };

    this.reservations.set(reservationId, reservation);
    this.saveReservationToDatabase(reservation);

    return {
      success: true,
      reservationId: reservation.reservationId,
      storeName: reservation.storeName,
      message: `预约成功！预约号：${reservation.reservationId}`
    };
  }

  /**
   * 验证时间
   * @param {string} time - 时间字符串
   * @returns {Object} 验证结果
   */
  validateTime(time) {
    const timeNum = parseInt(time.replace(':', ''));
    const startNum = parseInt(this.operatingHours.start.replace(':', ''));
    const endNum = parseInt(this.operatingHours.end.replace(':', ''));

    if (timeNum < startNum || timeNum > endNum) {
      return {
        valid: false,
        message: `营业时间为 ${this.operatingHours.start} 至 ${this.operatingHours.end}`
      };
    }

    return { valid: true };
  }

  /**
   * 检查预约时段是否有空位
   * @param {string} storeId - 门店ID
   * @param {string} date - 日期
   * @param {string} time - 时间
   * @param {number} personCount - 人数
   * @returns {Object} 可用性结果
   */
  checkAvailability(storeId, date, time, personCount) {
    // 简化逻辑：假设每个时段有足够的座位
    // 实际应用中需要查询数据库中的预约情况
    const requiredTables = Math.ceil(personCount / this.maxPersonsPerTable);
    const totalTables = 20; // 假设每店有20桌

    let bookedTables = 0;
    this.reservations.forEach(res => {
      if (res.storeId === storeId && res.date === date && res.time === time) {
        bookedTables += res.tableCount;
      }
    });

    const availableTables = totalTables - bookedTables;

    return {
      available: availableTables >= requiredTables,
      availableTables: availableTables,
      requiredTables: requiredTables
    };
  }

  /**
   * 生成预约ID
   * @returns {string} 预约ID
   */
  generateReservationId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = String(this.reservationCounter++).padStart(4, '0');
    return `YY${dateStr}${counter}`;
  }

  /**
   * 计算用餐结束时间
   * @param {string} startTime - 开始时间
   * @returns {string} 结束时间
   */
  calculateEndTime(startTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + 2; // 默认用餐时长2小时
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * 获取门店名称
   * @param {string} storeId - 门店ID
   * @returns {string} 门店名称
   */
  getStoreName(storeId) {
    const storeNames = {
      'store_001': '雨姗AI收银助手创味菜 - 县城中心店',
      'store_002': '雨姗AI收银助手创味菜 - 城东店',
      'store_003': '雨姗AI收银助手创味菜 - 城西店',
      'store_004': '雨姗AI收银助手创味菜 - 城郊店',
      'store_005': '雨姗AI收银助手创味菜 - 旗舰店'
    };
    return storeNames[storeId] || '雨姗AI收银助手创味菜';
  }

  /**
   * 获取预约详情
   * @param {string} reservationId - 预约ID
   * @returns {Object|null} 预约对象
   */
  getReservation(reservationId) {
    return this.reservations.get(reservationId) || null;
  }

  /**
   * 更新预约
   * @param {string} reservationId - 预约ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的预约
   */
  updateReservation(reservationId, updates) {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return null;
    }

    Object.assign(reservation, updates, {
      updatedAt: new Date().toISOString()
    });

    this.saveReservationToDatabase(reservation);
    return reservation;
  }

  /**
   * 取消预约
   * @param {string} reservationId - 预约ID
   * @returns {boolean} 是否成功
   */
  cancelReservation(reservationId) {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      return false;
    }

    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date().toISOString();

    this.saveReservationToDatabase(reservation);
    return true;
  }

  /**
   * 获取用户的预约列表
   * @param {string} customerPhone - 客户电话
   * @returns {Array} 预约列表
   */
  getReservationsByCustomer(customerPhone) {
    const customerReservations = [];
    this.reservations.forEach(res => {
      if (res.customerPhone === customerPhone) {
        customerReservations.push(res);
      }
    });
    return customerReservations.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  /**
   * 模拟保存到数据库
   * @param {Object} reservation - 预约对象
   */
  saveReservationToDatabase(reservation) {
    // 实际应用中这里会调用 DynamoDB 或其他数据库
    console.log(`[ReservationService] 保存预约 ${reservation.reservationId} 到数据库`);
  }
}

module.exports = ReservationService;
