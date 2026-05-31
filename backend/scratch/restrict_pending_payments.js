require('dotenv').config();
const knex = require('knex');
const config = require('../knexfile');
const accessService = require('../src/modules/access-control/access.service');

const db = knex(config.supabase);

async function run() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('[RESTRICT] Identifying tenants who have expired access or pending balances...');

    // Get all 'Staying' tenants
    const tenants = await db('tenants')
      .where('status', 'Staying')
      .select('tenant_id', 'name', 'expiry_date');
      
    // Get the latest payment for each tenant to check balances
    const payments = await db('payments')
      .orderBy('payment_date', 'desc')
      .orderBy('payment_id', 'desc');

    const latestPaymentsMap = {};
    for (const pay of payments) {
      if (!latestPaymentsMap[pay.tenant_id]) {
        latestPaymentsMap[pay.tenant_id] = pay;
      }
    }

    let successCount = 0;
    
    for (const tenant of tenants) {
      const lastPay = latestPaymentsMap[tenant.tenant_id];
      const hasPendingBalance = lastPay && lastPay.balance > 0;
      
      let isExpired = false;
      if (tenant.expiry_date) {
        const expDate = new Date(tenant.expiry_date).toISOString().split('T')[0];
        if (expDate < today) {
          isExpired = true;
        }
      }
      
      // If they owe a balance OR their rent has expired
      if (hasPendingBalance || isExpired) {
        console.log(`Restricting ${tenant.name} (ID: ${tenant.tenant_id}) -> Pending Balance: ${hasPendingBalance ? lastPay.balance : 0}, Expired: ${isExpired}`);
        try {
          await accessService.toggleAccess(tenant.tenant_id, false);
          successCount++;
        } catch (err) {
          console.error(`Failed to restrict tenant ${tenant.tenant_id}: ${err.message}`);
        }
      }
    }

    console.log(`\n[RESTRICT] ✅ Done! Restricted access for ${successCount} tenants with pending payments/expired access.`);

  } catch (err) {
    console.error('[RESTRICT] Fatal error:', err.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

run();
