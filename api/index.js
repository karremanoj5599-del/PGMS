const app = require('../backend/index');
const db = require('../backend/db');

module.exports = async (req, res) => {
  if (req.url === '/api/ping') {
    return res.status(200).json({ message: 'Vercel Serverless Function is awake!' });
  }
  if (req.url === '/api/db-test') {
    try {
      const start = Date.now();
      const result = await db.raw('SELECT 1 as is_alive');
      return res.status(200).json({ 
        message: 'Database connection successful!', 
        time: Date.now() - start,
        result: result.rows 
      });
    } catch (err) {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: err.message,
        code: err.code
      });
    }
  }
  return app(req, res);
};
