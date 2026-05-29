const db = require('../src/config/database');
const service = require('../src/modules/tenants/tenants.service');

async function test() {
  try {
    const userId = 15; // Let's check with an existing user ID
    console.log('Testing create tenant on live DB connection...');
    const payload = {
      name: 'Test Tenant From Script',
      mobile: '9999999999',
      gender: 'Male',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'Staying',
      tenant_type: 'Permanent'
    };
    const newId = await service.create(payload, userId);
    console.log('Success! Created tenant with ID:', newId);
    
    // Now delete it to clean up
    await db('tenants').where('tenant_id', newId).del();
    console.log('Cleaned up test tenant.');
  } catch (err) {
    console.error('Error during tenant creation test:', err);
  } finally {
    process.exit(0);
  }
}
test();
