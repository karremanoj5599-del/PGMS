const db = require('./db');

async function deduplicate() {
  try {
    const duplicates = await db('devices').select('sn').groupBy('sn').count('sn').having(db.raw('count(sn) > 1'));
    console.log("Duplicate SNs found:", duplicates);

    for (const dup of duplicates) {
      if (!dup.sn) continue;
      const records = await db('devices').where('sn', dup.sn).orderBy('last_seen', 'desc');
      
      // Keep the one with most recent activity or with tenants
      // For now, let's just keep the first one and delete others
      const toKeep = records[0];
      const toDelete = records.slice(1);
      
      for (const d of toDelete) {
        await db('devices').where('device_id', d.device_id).del();
        console.log(`Deleted duplicate device: ${d.sn} (id: ${d.device_id})`);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

deduplicate();
