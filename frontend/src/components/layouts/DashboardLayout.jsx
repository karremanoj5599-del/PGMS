import React, { useState } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Bed, Tablet, FileText, CreditCard, LogOut, User, Settings, ShieldCheck, Key, Copy, X, MessageSquare, Calendar, Briefcase, Bell, Palette, Lock } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
export const ProtectedRoute = ({ children }) => {
  const userString = localStorage.getItem('pgms_user');
  if (!userString) return <Navigate to="/login" />;
  
  const user = JSON.parse(userString);
  if (user.status === 'expired') return <Navigate to="/activate" />;
  
  return children;
};

const Sidebar = ({ onProfileClick }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('pgms_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('pgms_user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
          <Bed size={24} color="white" />
        </div>
        PGMS Admin
      </div>
      <nav className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={20} /> Notifications
        </NavLink>
        <NavLink to="/tenants" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Users size={20} /> Tenants
        </NavLink>
        <NavLink to="/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Briefcase size={20} /> Staff
        </NavLink>
        <NavLink to="/rooms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bed size={20} /> Rooms & Beds
        </NavLink>
        <NavLink to="/devices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Tablet size={20} /> Devices
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={20} /> Payments
        </NavLink>
        <NavLink to="/tickets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} /> Support Tickets
        </NavLink>
        <NavLink to="/schedules" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} /> Access Schedules
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={20} /> Reports
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={onProfileClick} className="admin-profile-btn">
          <div className="admin-avatar">
            <User size={20} />
          </div>
          <div className="admin-info">
            <span className="admin-email">{user.email?.split('@')[0] || 'Admin'}</span>
            <span className="admin-status">{user.is_activated ? 'Licensed' : 'Trial'}</span>
          </div>
          <Settings size={16} className="settings-icon" />
        </button>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-footer {
          margin-top: auto;
          padding: 16px;
          border-top: 1px solid rgba(128,128,128,0.1);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-profile-btn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(128,128,128,0.1);
          border: 1px solid rgba(128,128,128,0.1);
          padding: 8px 12px;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          overflow: hidden;
        }

        .admin-profile-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--border);
        }

        .admin-avatar {
          background: #4f46e5;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex: 1;
        }

        .admin-email {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-status {
          font-size: 11px;
          color: #94a3b8;
        }

        .settings-icon {
          color: #64748b;
          margin-left: auto;
          flex-shrink: 0;
        }

        .logout-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .admin-modal {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 24px;
          width: 100%;
          max-width: 400px;
          padding: 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .modal-header button {
          background: rgba(128,128,128,0.1);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .modal-header button:hover {
          background: var(--border);
          color: white;
        }

        .modal-section {
          margin-bottom: 24px;
        }

        .modal-section label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #64748b;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .modal-item {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e2e8f0;
          font-size: 14px;
          border: 1px solid rgba(128,128,128,0.1);
        }

        .code-item code {
          color: #818cf8;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: 16px;
          flex: 1;
          letter-spacing: 1px;
        }

        .code-item button {
          background: rgba(128,128,128,0.1);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .code-item button:hover {
          background: var(--border);
          color: #818cf8;
        }

        .section-hint {
          font-size: 11px;
          color: #64748b;
          margin-top: 8px;
        }

        .status-active {
          color: #34d399;
          background: rgba(52, 211, 153, 0.05);
          border-color: rgba(52, 211, 153, 0.1);
        }

        .status-trial {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.05);
          border-color: rgba(251, 191, 36, 0.1);
        }

        .update-license-btn {
          margin-top: 16px;
          width: 100%;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .update-license-btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        .modal-footer {
          margin-top: 36px;
          padding-top: 20px;
          border-top: 1px solid rgba(128,128,128,0.1);
        }

        .modal-logout-btn {
          width: 100%;
          background: rgba(239, 68, 68, 0.05);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.1);
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .modal-logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
        }
      ` }} />
    </aside>
  );
};

export const DashboardLayout = ({ children }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('pgms_user') || '{}'));
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogout = () => {
    localStorage.removeItem('pgms_user');
    window.location.href = '/login';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/api/auth/profile', { email: user.email, display_name: displayName });
      const updatedUser = { ...user, display_name: res.data.display_name };
      localStorage.setItem('pgms_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setMessage({ type: 'error', text: 'New passwords do not match' });
    }
    setLoading(true);
    try {
      await api.put('/api/auth/password', { email: user.email, current_password: currentPassword, new_password: newPassword });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update password' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div className="app-container">
      <Sidebar onProfileClick={() => setShowProfileModal(true)} />
      <main className="main-content">
        {children}
      </main>

      {showProfileModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
              <h2>Admin Settings</h2>
              <button onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-tabs">
              <button className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
                <User size={16} /> Account
              </button>
              <button className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
                <Palette size={16} /> Theme
              </button>
              <button className={`tab-btn ${activeTab === 'license' ? 'active' : ''}`} onClick={() => setActiveTab('license')}>
                <ShieldCheck size={16} /> License
              </button>
            </div>

            {message.text && (
              <div className={`settings-alert ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="tab-content">
              {activeTab === 'account' && (
                <div className="settings-section">
                  <form onSubmit={handleUpdateProfile} className="settings-form">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="text" value={user.email} disabled className="disabled-input" />
                    </div>
                    <div className="form-group">
                      <label>Display Name</label>
                      <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="E.g. John Doe" />
                    </div>
                    <button type="submit" disabled={loading} className="save-btn">Update Profile</button>
                  </form>

                  <hr className="settings-divider" />
                  
                  <form onSubmit={handleUpdatePassword} className="settings-form">
                    <div className="form-group">
                      <label>Current Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading} className="save-btn">Change Password</button>
                  </form>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="settings-section">
                  <div className="form-group">
                    <label>Theme Mode</label>
                    <div className="theme-options">
                      <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark Mode</button>
                      <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light Mode</button>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label>Primary Color</label>
                    <div className="color-options">
                      {['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map(color => (
                        <button 
                          key={color} 
                          className={`color-btn ${primaryColor === color ? 'active' : ''}`} 
                          style={{ backgroundColor: color }}
                          onClick={() => setPrimaryColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'license' && (
                <div className="settings-section">
                  <div className="modal-section">
                    <label>Activation Code</label>
                    <div className="modal-item code-item">
                      <ShieldCheck size={18} />
                      <code>{user.activation_code}</code>
                      <button type="button" onClick={() => copyToClipboard(user.activation_code)}><Copy size={14} /></button>
                    </div>
                    <p className="section-hint">Share this code with the company for license generation.</p>
                  </div>

                  <div className="modal-section" style={{ marginTop: '20px' }}>
                    <label>License Status</label>
                    <div className={`modal-item ${user.is_activated ? 'status-active' : 'status-trial'}`}>
                      {user.is_activated ? <ShieldCheck size={18} /> : <Key size={18} />}
                      <span>{user.is_activated ? 'Software Activated' : 'Software in Trial'}</span>
                    </div>
                    {!user.is_activated && (
                      <button type="button" onClick={() => { setShowProfileModal(false); window.location.href = '/activate'; }} className="update-license-btn">
                        Update License Key
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={handleLogout} className="modal-logout-btn">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-modal {
          max-width: 480px;
          width: 100%;
          background: var(--modal-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .tab-content {
          height: 360px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .tab-content::-webkit-scrollbar {
          width: 6px;
        }
        .tab-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .tab-content::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }
        .modal-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .tab-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: rgba(129, 140, 248, 0.1);
          color: var(--primary);
        }
        .tab-btn.active {
          background: var(--primary);
          color: white;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-group label {
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 4px;
          display: block;
        }
        .form-group input {
          width: 100%;
          background: rgba(15, 23, 42, 0.05);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          color: var(--text-main);
          font-size: 13px;
        }
        .disabled-input {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .save-btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          margin-top: 4px;
        }
        .settings-divider {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 16px 0;
        }
        .theme-options {
          display: flex;
          gap: 12px;
        }
        .theme-btn {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-main);
          cursor: pointer;
          font-size: 13px;
        }
        .theme-btn.active {
          border-color: var(--primary);
          background: rgba(129, 140, 248, 0.1);
          color: var(--primary);
        }
        .color-options {
          display: flex;
          gap: 12px;
        }
        .color-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .color-btn:hover {
          transform: scale(1.1);
        }
        .color-btn.active {
          border-color: white;
          box-shadow: 0 0 0 2px var(--border);
        }
        .settings-alert {
          padding: 8px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
        }
        .settings-alert.success {
          background: rgba(52, 211, 153, 0.1);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.2);
        }
        .settings-alert.error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
      ` }} />
    </div>
  );
};

