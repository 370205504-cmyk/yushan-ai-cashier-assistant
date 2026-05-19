const v4Options = {
  random: () => crypto.randomBytes(16),
  timestamp: () => Date.now()
};

function uuidv4() {
  const random = v4Options.random();
  random[6] = (random[6] & 0x0f) | 0x40;
  random[8] = (random[8] & 0x3f) | 0x80;

  const hex = [];
  for (let i = 0; i < 16; i++) {
    hex.push(random[i].toString(16).padStart(2, '0'));
  }

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 8).join(''),
    hex.slice(8, 12).join(''),
    hex.slice(12, 16).join(''),
    hex.slice(16, 20).join(''),
    hex.slice(20, 32).join('')
  ].join('-');
}

const snowflakeState = {
  instanceId: 1,
  customEpoch: 1704067200000,
  sequence: 0,
  lastTimestamp: -1
};

function Snowflake() {
  this.instanceId = snowflakeState.instanceId;
  this.customEpoch = snowflakeState.customEpoch;
}

Snowflake.prototype.getUniqueID = function () {
  let timestamp = Date.now();

  if (timestamp === this.lastTimestamp) {
    snowflakeState.sequence = (snowflakeState.sequence + 1) & 0xfff;
    if (snowflakeState.sequence === 0) {
      timestamp = this.waitForNextMillis(this.lastTimestamp);
    }
  } else {
    snowflakeState.sequence = 0;
  }

  this.lastTimestamp = timestamp;

  const id = (
    (BigInt(timestamp - this.customEpoch) << 22n) |
    (BigInt(this.instanceId) << 12n) |
    BigInt(snowflakeState.sequence)
  );

  return id.toString();
};

Snowflake.prototype.waitForNextMillis = function (lastTimestamp) {
  let timestamp = Date.now();
  while (timestamp <= lastTimestamp) {
    timestamp = Date.now();
  }
  return timestamp;
};

function createOrderId() {
  const uid = new Snowflake();
  return `ORD${uid.getUniqueID()}`;
}

function createPaymentId() {
  const uid = new Snowflake();
  return `PAY${uid.getUniqueID()}`;
}

function createRefundId() {
  const uid = new Snowflake();
  return `REF${uid.getUniqueID()}`;
}

function createUserId() {
  return uuidv4();
}

module.exports = {
  uuidv4,
  Snowflake,
  createOrderId,
  createPaymentId,
  createRefundId,
  createUserId
};
