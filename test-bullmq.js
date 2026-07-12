const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');
const connection = new IORedis();
const worker = new Worker('test-q', async job => {}, { connection });
worker.run().catch(console.error);
setTimeout(() => { worker.close(); connection.quit(); }, 1000);
