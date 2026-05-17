const service = require('../src/modules/tenants/tenants.service');
const db = require('../src/config/database');

async function testUpdate() {
  try {
    // Check if we have any tenants
    let tenant = await db('tenants').first();
    let tenantId;
    let userId = 1; // Assuming user_id 1 exists or doesn't matter for the fake user we might insert

    if (!tenant) {
      console.log('No tenant found. Creating a fake tenant for testing...');
      tenantId = await service.create({
        name: 'Test Tenant',
        mobile: '1234567890',
        joining_date: '2026-05-17',
        gender: 'Female',
        occupation: 'Engineer',
        expiry_date: '2026-06-17',
        tenant_type: 'Permanent'
      }, userId);
    } else {
      tenantId = tenant.tenant_id;
      userId = tenant.user_id || 1;
    }

    console.log(`Updating tenant ${tenantId}...`);
    const result = await service.update(tenantId, {
      name: 'Updated Tenant',
      id_proof: 'https://example.com/new_proof.jpg',
      gender: 'Other',
      occupation: 'Developer',
      expiry_date: '2026-07-17',
      tenant_type: 'Guest'
    }, userId);

    console.log('Update successful! Result:', result);
  } catch (err) {
    console.error('Update failed!', err);
  } finally {
    await db.destroy();
  }
}

testUpdate();
