require('dotenv').config({path: '../.env'});
const db = require('../src/config/database');

async function fix() {
  try {
    console.log('Connecting to database...');
    // We want to update all floors, rooms, and beds with user_id = null to user_id = 15
    const targetUserId = 15;

    console.log('Updating floors...');
    const floorsUpdated = await db('floors')
      .whereNull('user_id')
      .update({ user_id: targetUserId });
    console.log(`Updated ${floorsUpdated} floors.`);

    console.log('Updating rooms...');
    const roomsUpdated = await db('rooms')
      .whereNull('user_id')
      .update({ user_id: targetUserId });
    console.log(`Updated ${roomsUpdated} rooms.`);

    console.log('Updating beds...');
    const bedsUpdated = await db('beds')
      .whereNull('user_id')
      .update({ user_id: targetUserId });
    console.log(`Updated ${bedsUpdated} beds.`);

    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
