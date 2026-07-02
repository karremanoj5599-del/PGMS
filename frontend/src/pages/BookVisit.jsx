import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Calendar, User, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

const BookVisit = () => {
  const { userId } = useParams();
  const [formData, setFormData] = useState({
    user_id: userId || '',
    name: '',
    phone: '',
    email: '',
    visit_date: '',
    purpose: 'Want to check available rooms'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/api/public/leads/book-visit', formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book visit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '1rem', textAlign: 'center', maxWidth: '400px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
          <h2 style={{ marginBottom: '1rem' }}>Visit Booked!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Thank you for booking a visit. We look forward to showing you around.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '1rem', width: '100%', maxWidth: '500px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Calendar size={24} color="var(--accent)" />
          Book a PG Visit
        </h2>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <User size={16} /> Full Name *
            </label>
            <input 
              required type="text" value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} 
              placeholder="E.g. John Doe" 
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <Phone size={16} /> Phone Number *
            </label>
            <input 
              required type="tel" value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} 
              placeholder="10-digit number" 
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <Mail size={16} /> Email Address (Optional)
            </label>
            <input 
              type="email" value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} 
              placeholder="E.g. john@example.com" 
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <Calendar size={16} /> Preferred Visit Date *
            </label>
            <input 
              required type="date" value={formData.visit_date} 
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFormData({...formData, visit_date: e.target.value})} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', colorScheme: 'dark' }} 
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              <MapPin size={16} /> Looking For *
            </label>
            <select 
              required value={formData.purpose} 
              onChange={e => setFormData({...formData, purpose: e.target.value})} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              <option value="Single Room">Single Room</option>
              <option value="Double Sharing">Double Sharing</option>
              <option value="Triple Sharing">Triple Sharing</option>
              <option value="Just checking out">Just checking out</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', width: '100%', borderRadius: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Book Visit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookVisit;
