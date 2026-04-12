const axios = require('axios');

async function verifyParsing() {
  const sn = 'NYU7255201868';
  // Use the exact tab-separated string from the log
  const rawData = 'BIODATA Pin=69\tNo=0\tIndex=0\tValid=1\tDuress=0\tType=9\tMajorVer=40\tMinorVer=1\tFormat=0\tTmp=apUBFjYCAADfRBk3CQAoAQG72/X6AGJobX4kJSYnGSkqKxwtLi8wMTIzNDc2Nzg5Ojs8PX9fIRHi0dgWxe3sN2nZnfzjkJnwKtf2yNnWffgo2CItNAvLHOhNLzvR/1EFVAnvv9PtMuMivbc4z/ka/EYZ8wMICQ75EQQS4NzZx+gaD5TixksfK0rpVWM24eIG+d/j6AoMfs4pbsouyvXsAD+GPgwOd+fdd8HMxy7qwtsY9M83xoKtbr//rkIEk5FirVeNkElvUrSZdO3IeexFxq9eFaeyp0K/gkics3WUnX5nd4Gmf2aat1KOv0V6bnlUG2F+dZFwfW3MYnaCbthtRlOXZa9Nk9PTSol/lFYCSJCCo7Z8sa51TFN1yQW2gVy6qqulu7SlcFRga6iurUeZSURrQoxU';

  try {
    console.log('Sending mock ADMS BIODATA push...');
    const url = `http://localhost:5000/iclock/cdata.aspx?SN=${sn}&table=BIODATA`;
    const res = await axios.post(url, rawData, {
      headers: { 'Content-Type': 'text/plain' }
    });
    console.log('Server response:', res.data);

    // Now query the DB to see if it landed
    // (Wait a bit for the async processing if any)
    setTimeout(async () => {
        const db = require('../../backend/db');
        const templates = await db('biometric_templates').where('tenant_id', 69);
        console.log('Stored Templates for Pin=69:', JSON.stringify(templates, null, 2));
        process.exit(0);
    }, 1000);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

verifyParsing();
