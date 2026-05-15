const service = require('./auth.service');

exports.register = async (req, res, next) => {
  try {
    const user = await service.register(req.body.email, req.body.password);
    res.json({
      user_id: user.user_id,
      email: user.email,
      activation_code: user.activation_code,
      trial_expiry: user.trial_expiry,
      message: 'Account created successfully. 3-day trial started.'
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'System Error: Failed to save user to database.' });
  }
};

exports.login = async (req, res, next) => {
  try {
    const userData = await service.login(req.body.email, req.body.password);
    res.json({ user: userData });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    console.error('[LOGIN DEBUG] Error in login:', err);
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
};

exports.activate = async (req, res, next) => {
  try {
    const result = await service.activate(req.body.email, req.body.license_key, req.body.hardware_fingerprint, req.ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.validate = async (req, res, next) => {
  try {
    const result = await service.validate(req.body.email, req.body.license_key, req.body.hardware_fingerprint);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.claimLicense = async (req, res, next) => {
  try {
    const { email, activation_code } = req.body;
    if (!email || !activation_code) {
      return res.status(400).json({ error: 'Email and activation code are required' });
    }
    const result = await service.claimLicense(email, activation_code);
    res.json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    console.error('Claim License Error:', err);
    res.status(500).json({ error: 'Failed to claim license: ' + err.message });
  }
};
