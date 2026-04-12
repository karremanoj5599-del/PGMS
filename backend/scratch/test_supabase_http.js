const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase HTTP API connectivity...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
    
    if (error) {
       if (error.message.includes('FetchError') || error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
          console.error('❌ HTTP Connection Failed! Likely a network/DNS issue.');
       } else {
          console.log('✅ HTTP Connection Successful (API responded)');
          console.log('API Error (likely table missing or permissions):', error.message);
       }
    } else {
      console.log('✅ HTTP Connection Successful! Found tables.');
    }
  } catch (err) {
    console.error('❌ Unexpected Error during HTTP test:', err.message);
  }
}

test();
