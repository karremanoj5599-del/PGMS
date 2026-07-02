const db = require('../../config/database');

exports.bookVisit = async (req, res) => {
  try {
    const { user_id, name, phone, email, visit_date, purpose } = req.body;
    
    // If user_id is not provided, try to fallback to the first user in the DB
    let targetUserId = user_id;
    if (!targetUserId) {
      const firstUser = await db('users').first();
      if (firstUser) {
        targetUserId = firstUser.user_id;
      }
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'No PG associated with this booking' });
    }

    // Insert into leads
    const [newLead] = await db('leads').insert({
      user_id: targetUserId,
      name,
      phone,
      email,
      planned_visit_date: visit_date,
      purpose,
      status: 'New'
    }).returning('*');

    // Also insert into visitors so it appears on the tracking dashboard
    await db('visitors').insert({
      user_id: targetUserId,
      name,
      phone,
      visit_date,
      purpose,
      visitor_type: 'Enquiry',
      pass_code: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'Pending'
    });

    res.status(201).json({ message: 'Visit booked successfully', lead: newLead });
  } catch (error) {
    console.error('Error booking visit:', error);
    res.status(500).json({ error: 'Failed to book visit' });
  }
};

// For Admin to see leads
exports.getLeads = async (req, res) => {
  try {
    const userId = req.userId;
    const leads = await db('leads')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
