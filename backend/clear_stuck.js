const db = require('./db');

/**
 * Utility to clear stuck pending commands.
 * Usage: 
 *   node clear_stuck.js <SN>           - Clear all pending for specific SN
 *   node clear_stuck.js ALL            - Clear all pending for all devices
 *   node clear_stuck.js <SN> <ID_LIMIT> - Clear pending for SN with ID less than limit
 */

async function clear() {
  const args = process.argv.slice(2);
  const targetSN = args[0] || 'ALL';
  const idLimit = args[1] ? parseInt(args[1]) : null;

  try {
    let query = db('device_commands').where('executed', false);

    if (targetSN !== 'ALL') {
      query = query.whereRaw('LOWER(device_sn) = ?', [targetSN.toLowerCase()]);
    }

    if (idLimit) {
      query = query.where('id', '<', idLimit);
    }

    const count = await query.update({ executed: true });
    
    console.log(`[CLEAR] Marked ${count} commands as 'executed' for ${targetSN}${idLimit ? ' (ID < ' + idLimit + ')' : ''}`);
    
    if (count > 0) {
      console.log(`[TIP] The device should now be able to fetch the next command in the queue.`);
    } else {
      console.log(`[INFO] No pending commands found matching criteria.`);
    }

  } catch (err) {
    console.error('[ERROR] Failed to clear commands:', err.message);
  } finally {
    process.exit();
  }
}

clear();
