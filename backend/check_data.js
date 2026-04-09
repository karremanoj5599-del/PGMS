const db = require('./db.js');

async function check() {
  try {
    const tenantId = 101;
    const tenant = await db('tenants').where('tenant_id', tenantId).first();
    const payments = await db('payments').where('tenant_id', tenantId);
    const billing = await db('billing').where('tenant_id', tenantId);

    console.log('--- DATA DUMP FOR TENANT 101 ---');
    console.log('TENANT:', JSON.stringify(tenant, null, 2));
    console.log('PAYMENTS:', JSON.stringify(payments, null, 2));
    console.log('BILLING:', JSON.stringify(billing, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error fetching data:', e);
    process.exit(1);
  }
}

check();
