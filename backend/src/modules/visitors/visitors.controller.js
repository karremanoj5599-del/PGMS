const db = require('../../config/database');

// GET /api/visitors
exports.getVisitors = async (req, res) => {
  try {
    const userId = req.userId;
    const visitors = await db('visitors')
      .where({ user_id: userId })
      .orderBy('visit_date', 'desc');
    
    res.json(visitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/visitors (For admin to manually add a visitor or from tenant app synced via some webhook)
exports.addVisitor = async (req, res) => {
  try {
    const userId = req.userId;
    const { tenant_id, name, phone, visit_date, purpose, pass_code, visitor_type } = req.body;

    const [newVisitor] = await db('visitors').insert({
      user_id: userId,
      tenant_id: tenant_id || null,
      name,
      phone,
      visit_date,
      purpose,
      visitor_type: visitor_type || 'Guest',
      pass_code: pass_code || Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'Pending'
    }).returning('*');

    res.json({ message: 'Visitor added successfully', visitor: newVisitor });
  } catch (error) {
    console.error('Error adding visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/visitors/:id
exports.updateVisitorStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { status } = req.body;

    await db('visitors')
      .where({ id, user_id: userId })
      .update({ status, updated_at: db.fn.now() });

    res.json({ message: 'Visitor status updated successfully' });
  } catch (error) {
    console.error('Error updating visitor status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
