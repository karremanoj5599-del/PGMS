import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Download, Trash2, Upload, X } from 'lucide-react';

const DOC_TYPES = {
  id_proof: 'ID Proof (Aadhar/PAN)',
  agreement: 'Rental Agreement',
  police_verification: 'Police Verification',
  photo: 'Photograph',
  other: 'Other Document'
};

const TenantDocuments = ({ tenantId, tenantName, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    doc_type: 'id_proof',
    file_name: '',
    expiry_date: '',
    file_data: ''
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/tenants/${tenantId}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [tenantId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }
      setFormData(prev => ({ ...prev, file_name: file.name }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, file_data: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file_data) {
      alert('Please select a file');
      return;
    }
    setUploading(true);
    try {
      await api.post(`/api/tenants/${tenantId}/documents`, formData);
      setFormData({ doc_type: 'id_proof', file_name: '', expiry_date: '', file_data: '' });
      fetchDocuments();
    } catch (err) {
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await api.delete(`/api/tenants/${tenantId}/documents/${docId}`);
      fetchDocuments();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Documents: {tenantName}</h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage tenant files and agreements</p>
          </div>
          <button onClick={onClose} className="btn-icon-only"><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Upload Form */}
          <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Upload New Document</h3>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Document Type</label>
                <select value={formData.doc_type} onChange={e => setFormData({ ...formData, doc_type: e.target.value })}>
                  {Object.entries(DOC_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Expiry Date (Optional)</label>
                <input type="date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>File (Max 5MB)</label>
                <div style={{ border: '2px dashed var(--border)', padding: '2rem 1rem', textAlign: 'center', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.1)' }}>
                  <input type="file" id="doc-upload" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                  <label htmlFor="doc-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={24} color="var(--primary)" />
                    <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {formData.file_name ? formData.file_name : 'Click to select file'}
                    </span>
                  </label>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={uploading || !formData.file_data}>
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>

          {/* Document List */}
          <div>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Saved Documents</h3>
            {loading ? (
              <p>Loading documents...</p>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>No documents found for this tenant.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {documents.map(doc => (
                  <div key={doc.document_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(128,128,128,0.1)', borderRadius: '0.5rem' }}>
                        <FileText size={24} color="var(--primary)" />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{DOC_TYPES[doc.doc_type] || doc.doc_type}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          {doc.expiry_date && ` • Expires: ${new Date(doc.expiry_date).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a 
                        href={doc.file_data} 
                        download={doc.file_name}
                        className="btn btn-icon-only" 
                        title="Download"
                        style={{ color: 'var(--primary)' }}
                      >
                        <Download size={18} />
                      </a>
                      <button className="btn btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(doc.document_id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDocuments;
