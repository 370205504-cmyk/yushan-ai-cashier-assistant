const { Queue, Worker } = require('bullmq');
const logger = require('./logger');
const printerUtils = require('./printerUtils');

const printQueue = new Queue('print-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 1000
    },
    removeOnFail: {
      count: 100
    }
  }
});

async function addPrintTask(order) {
  const job = await printQueue.add('print', order);
  logger.info(`打印任务已添加: ${job.id}, 订单号: ${order.orderNo}`);
  return job;
}

async function processPrintJob(job) {
  const { orderNo, items, tableNo, totalAmount, createdAt } = job.data;

  try {
    const printContent = generatePrintContent(orderNo, items, tableNo, totalAmount, createdAt);
    const printBuffer = printerUtils.toGBK(printContent);

    await simulatePrint(printBuffer);

    logger.info(`打印任务完成: ${orderNo}`);
    return { success: true, orderNo };
  } catch (error) {
    logger.error(`打印任务失败: ${orderNo}, 错误: ${error.message}`);
    throw error;
  }
}

function generatePrintContent(orderNo, items, tableNo, totalAmount, createdAt) {
  let content = '\n\n========== 订单小票 ==========\n';
  content += `订单号: ${orderNo}\n`;
  content += `桌号: ${tableNo || '外卖'}\n`;
  content += `时间: ${new Date(createdAt).toLocaleString('zh-CN')}\n`;
  content += '------------------------------\n';

  items.forEach(item => {
    content += `${item.dishName} x${item.quantity}  ${item.subtotal.toFixed(2)}\n`;
    if (item.remarks) {
      content += `  (${item.remarks})\n`;
    }
  });

  content += '------------------------------\n';
  content += `合计: ${totalAmount.toFixed(2)}\n`;
  content += '========== 谢谢光临 ==========\n\n';

  return content;
}

async function simulatePrint(buffer) {
  await new Promise(resolve => setTimeout(resolve, 500));
}

const worker = new Worker('print-queue', processPrintJob, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  concurrency: 2
});

worker.on('completed', (job) => {
  logger.info(`Worker完成任务: ${job.id}`);
});

worker.on('failed', (job, err) => {
  logger.error(`Worker任务失败: ${job.id}, 错误: ${err.message}`);
});

worker.on('error', (err) => {
  logger.error(`Worker错误: ${err.message}`);
});

module.exports = {
  addPrintTask,
  printQueue
};
