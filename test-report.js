const db = require('./backend/src/config/database');
const service = require('./backend/src/modules/payments/payments.service');

async function test() {
  const userId = 1; // Assuming user id 1
  const month = 'February';
  const year = 2025;
  
  const report = await service.getMonthlyReport(userId, month, year);
  console.log("Report for Raju:", report.find(r => r.tenant_name === 'raju'));
  process.exit(0);
}
test();
