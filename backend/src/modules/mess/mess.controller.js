const db = require('../../config/database');

// GET /api/mess/menu
exports.getMenu = async (req, res) => {
  try {
    const userId = req.userId;
    const menu = await db('mess_menu')
      .where({ user_id: userId })
      .orderBy('day_index', 'asc');
    
    res.json(menu);
  } catch (error) {
    console.error('Error fetching mess menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/mess/menu
// Expects an array of 7 menu objects
exports.updateMenu = async (req, res) => {
  try {
    const userId = req.userId;
    const { menu } = req.body;

    if (!menu || !Array.isArray(menu) || menu.length !== 7) {
      return res.status(400).json({ error: 'Menu must be an array of 7 items.' });
    }

    // Run in transaction to update all days
    await db.transaction(async (trx) => {
      for (const item of menu) {
        await trx('mess_menu')
          .where({ user_id: userId, day_index: item.day_index })
          .update({
            breakfast: item.breakfast,
            lunch: item.lunch,
            dinner: item.dinner
          });
      }
    });

    res.json({ message: 'Menu updated successfully' });
  } catch (error) {
    console.error('Error updating mess menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/mess/opt-outs?date=YYYY-MM-DD
exports.getOptOuts = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    // Get all opt-outs for this date where the tenant belongs to the logged-in admin's PG
    const optOuts = await db('meal_opt_outs')
      .join('tenants', 'meal_opt_outs.tenant_id', 'tenants.tenant_id')
      .leftJoin('beds', 'tenants.bed_id', 'beds.bed_id')
      .leftJoin('rooms', 'beds.room_id', 'rooms.room_id')
      .where('tenants.user_id', req.userId)
      .where('meal_opt_outs.opt_out_date', date)
      .select(
        'meal_opt_outs.id as opt_out_id',
        'tenants.tenant_id',
        'tenants.name',
        'tenants.mobile',
        'rooms.room_number',
        'beds.bed_number'
      );

    res.json(optOuts);
  } catch (error) {
    console.error('Error fetching opt-outs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
