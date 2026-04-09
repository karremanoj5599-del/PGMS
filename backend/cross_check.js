const db = require('./db.js');

async function check() {
  try {
    const tenantId = 101;
    console.log('--- Checking for Tenant 101 ---');
    const tenant = await db('tenants').where('tenant_id', tenantId).first();
    console.log('Tenant Found:', tenant ? 'YES' : 'NO');
    if (tenant) {
        console.log('Tenant ID Type:', typeof tenant.tenant_id);
        console.log('Bed ID:', tenant.bed_id);
    }

    const payments = await db('payments').where('tenant_id', tenantId);
    console.log('Payments Found:', payments.length);
    if (payments.length > 0) {
        console.log('First Payment Tenant ID Type:', typeof payments[0].tenant_id);
    }

    const billing = await db('billing').where('tenant_id', tenantId);
    console.log('Billing Found:', billing.length);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

check();
