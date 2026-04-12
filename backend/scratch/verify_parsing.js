const axios = require('axios');

async function verifyOperlogFix() {
  const sn = 'NYU7255201868';
  // Standard OPERLOG packet containing embedded FP data for Pin 2
  const rawData = 'USER PIN=2\tName=Test\nFP PIN=2\tFID=6\tSize=1568\tValid=1\tTMP=TdtTUzIxAAAEmJ8ECAUHCc7QAAD0mHkBAABkhEUup5jTAKBkaAACABf8UgDkAAZkTQA1ma9kywDGAOlkfJiiABJkfQD5AYr8zwAoAaZkHQA1maNkbACGALtk1phBAYtklwCjAYf8SgBgARJkqgBRmAFANgBqADM4bZgpAIAYegDLATb8tAAUAalkWwCrmJdkcAAnAWFkwZgZAa1kbAD0AYL85wDeAC5kIQAKmSxkpABSAVVkT5hAARVkwACUAYr8DgDnAEhEDAB3mJlZSQBgALc8s5g9AAgnZQDMATv8lwAmARhknAAWmcVkdgAtAWFkY5ivAHlkYgD1AQL8swCdACNkCAA0mZNkNwAmAehk4JgxAa1kpQCzABL8dQBwAYtZJwBdmX9EewBPALhBupg4AIUlng0Td6vmLJ7KDUICk/WuUrZENSC5mZgNdpnLj/8I2ZnnlMaa1OCh7Ik';

  try {
    console.log('1. Simulating OPERLOG with embedded FP data...');
    const url = `http://localhost:5000/iclock/cdata.aspx?SN=${sn}&table=OPERLOG`;
    await axios.post(url, rawData, { headers: { 'Content-Type': 'text/plain' } });

    console.log('2. Verifying Stored Template for Pin 2...');
    const db = require('../db');
    const template = await db('biometric_templates').where({ tenant_id: 2, type: 'fingerprint' }).first();
    
    if (template) {
        console.log('✅ Fingerprint correctly captured from OPERLOG!');
        console.log('Stored Template ID:', template.id);
    } else {
        console.log('❌ Fingerprint capture failed!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

verifyOperlogFix();
