const db = require('../../config/database');
const activityService = require('../system/activity.service');

exports.getDocuments = (tenantId, userId) => {
  return db('tenant_documents')
    .where({ tenant_id: tenantId, user_id: userId })
    .orderBy('created_at', 'desc');
};

exports.addDocument = async (tenantId, userId, data) => {
  const { doc_type, file_name, file_data, expiry_date } = data;
  
  const [docId] = await db('tenant_documents').insert({
    tenant_id: tenantId,
    user_id: userId,
    doc_type,
    file_name,
    file_data,
    expiry_date: expiry_date || null
  }).returning('document_id');

  const id = typeof docId === 'object' ? docId.document_id : docId;

  const tenant = await db('tenants').where({ tenant_id: tenantId }).first();

  await activityService.logActivity(userId, {
    event_type: 'tenant',
    action: 'created',
    title: 'Document Uploaded',
    description: `A new ${doc_type} document was uploaded for ${tenant ? tenant.name : 'a tenant'}.`,
    metadata: { tenant_id: tenantId, document_id: id }
  });

  return id;
};

exports.deleteDocument = async (docId, userId) => {
  const doc = await db('tenant_documents').where({ document_id: docId, user_id: userId }).first();
  if (!doc) throw new Error('Document not found');

  await db('tenant_documents').where({ document_id: docId }).del();

  await activityService.logActivity(userId, {
    event_type: 'tenant',
    action: 'deleted',
    title: 'Document Deleted',
    description: `A ${doc.doc_type} document was deleted.`,
    metadata: { tenant_id: doc.tenant_id, document_id: docId }
  });
};
