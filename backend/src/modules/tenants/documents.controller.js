const service = require('./documents.service');

exports.getDocuments = async (req, res, next) => {
  try {
    const docs = await service.getDocuments(req.params.id, req.userId);
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

exports.addDocument = async (req, res, next) => {
  try {
    const docId = await service.addDocument(req.params.id, req.userId, req.body);
    res.status(201).json({ success: true, document_id: docId });
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    await service.deleteDocument(req.params.docId, req.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
