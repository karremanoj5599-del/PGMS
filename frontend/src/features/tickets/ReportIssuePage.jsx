import React, { useState } from 'react';
import axios from '../../services/api';
import { MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

const ReportIssuePage = () => {
  const [mobile, setMobile] = useState('+91 ');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !floor || !room || !category || !description) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    
    setStatus('loading');
    try {
      await axios.post('/api/public/tickets', {
        mobile,
        floorName: floor,
        roomNumber: room,
        category,
        description
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.error || 'Failed to submit ticket. Please check your mobile number.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '24px', border: '1px solid rgba(52, 211, 153, 0.2)', maxWidth: '400px' }}>
          <CheckCircle size={64} color="#34d399" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Ticket Submitted</h2>
          <p style={{ color: '#94a3b8' }}>Thank you! Your issue has been reported to the administration and will be resolved shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', background: 'var(--bg-dark)' }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2), rgba(124, 58, 237, 0.2))', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <MessageSquare size={36} color="#818cf8" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e2e8f0' }}>Report an Issue</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
            Please provide details about the issue
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(10px)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(128,128,128,0.1)' }}>
          {status === 'error' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', color: '#f87171', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Registered Mobile Number</label>
            <input 
              type="tel" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter your 10-digit number"
              style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', color: '#e2e8f0', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Floor</label>
              <input 
                type="text" 
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 1st Floor"
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', color: '#e2e8f0', fontSize: '1rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Room Number</label>
              <input 
                type="text" 
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 101"
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', color: '#e2e8f0', fontSize: '1rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Issue Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', color: '#e2e8f0', fontSize: '1rem', cursor: 'pointer' }}
            >
              <option value="">Select a category</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Internet/WiFi">Internet / WiFi</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem in detail..."
              style={{ width: '100%', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '12px', color: '#e2e8f0', fontSize: '1rem', height: '120px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={status === 'loading'}
            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s' }}
          >
            {status === 'loading' ? 'Submitting...' : 'Submit Issue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportIssuePage;
