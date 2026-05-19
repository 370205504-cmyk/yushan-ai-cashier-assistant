const mysql = require('mysql2/promise');

class ReadWriteSplitter {
  constructor() {
    this.masterPool = null;
    this.slavePools = [];
    this.currentSlaveIndex = 0;
  }

  async initialize() {
    const baseConfig = {
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };

    this.masterPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'yushan_restaurant',
      ...baseConfig
    });

    const slaveHosts = process.env.DB_SLAVE_HOSTS?.split(',') || [];

    for (const slaveHost of slaveHosts) {
      const [host, port] = slaveHost.split(':');
      const slavePool = mysql.createPool({
        host: host || 'localhost',
        port: parseInt(port) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'yushan_restaurant',
        ...baseConfig
      });
      this.slavePools.push(slavePool);
    }

    if (this.slavePools.length === 0) {
      console.warn('No slave databases configured, using master for all queries');
      this.slavePools.push(this.masterPool);
    }
  }

  getNextSlavePool() {
    if (this.slavePools.length === 1) {
      return this.slavePools[0];
    }
    const pool = this.slavePools[this.currentSlaveIndex];
    this.currentSlaveIndex = (this.currentSlaveIndex + 1) % this.slavePools.length;
    return pool;
  }

  async query(sql, params = [], options = {}) {
    const pool = options.write ? this.masterPool : this.getNextSlavePool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async write(sql, params = []) {
    return this.query(sql, params, { write: true });
  }

  async read(sql, params = []) {
    return this.query(sql, params, { write: false });
  }

  async transaction(callback) {
    const connection = await this.masterPool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getPoolStatus() {
    return {
      master: {
        allConnections: this.masterPool.pool?._allConnections?.length || 0,
        freeConnections: this.masterPool.pool?._freeConnections?.length || 0,
        connectionQueue: this.masterPool.pool?._connectionQueue?.length || 0
      },
      slaves: this.slavePools.map((pool, index) => ({
        index,
        allConnections: pool.pool?._allConnections?.length || 0,
        freeConnections: pool.pool?._freeConnections?.length || 0
      }))
    };
  }

  async close() {
    await this.masterPool.end();
    for (const pool of this.slavePools) {
      await pool.end();
    }
  }
}

const readWriteSplitter = new ReadWriteSplitter();

module.exports = {
  readWriteSplitter,
  ReadWriteSplitter
};
