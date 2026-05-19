const service = require('./system.service');

exports.getOptions = async (req, res, next) => {
  try {
    const options = await service.getOptions(req.userId);
    res.json(options);
  } catch (err) {
    next(err);
  }
};

exports.updateOptions = async (req, res, next) => {
  try {
    const updated = await service.updateOptions(req.body, req.userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};
