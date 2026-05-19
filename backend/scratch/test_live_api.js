const db = require('../src/config/database');
const floorsService = require('../src/modules/floors/floors.service');
const roomsService = require('../src/modules/rooms/rooms.service');
const bedsService = require('../src/modules/beds/beds.service');

async function check() {
  try {
    const userId = 15;
    console.log(`Checking data for userId: ${userId}`);

    const floors = await floorsService.getAll(userId);
    console.log('Floors:', floors);

    const rooms = await roomsService.getAll(userId);
    console.log('Rooms:', rooms);

    const beds = await bedsService.getAll(userId);
    console.log('Beds:', beds);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
