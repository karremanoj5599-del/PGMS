import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Key, ShieldAlert, AlertCircle, CheckCircle, ExternalLink, LogOut } from 'lucide-react';

const ActivationPage = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('pgms_user');
    if (!userData) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fingerprint = btoa(navigator.userAgent + navigator.language + window.screen.width).slice(0, 32);
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/activate', {
        email: user.email,
        license_key: licenseKey,
        hardware_fingerprint: fingerprint
      });
      
      setSuccess(true);
      // Update local storage user data
      const updatedUser = { ...user, is_activated: true, status: 'active' };
      localStorage.setItem('pgms_user', JSON.stringify(updatedUser));
      
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Activation failed. Please check your license key.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pgms_user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="login-container">
      <div className="login-card">
        {success ? (
          <div className="success-view">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h1>Activated!</h1>
            <p>Your license has been successfully applied.</p>
            <p className="redirect-text">Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <div className="login-header">
              <div className="logo-icon warning">
                <ShieldAlert size={32} />
              </div>
              <h1>Software Activation</h1>
              <p>Your trial has ended or license expired</p>
            </div>

            <div className="activation-info">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Activation Code:</strong> <code className="code-snippet">{user.activation_code}</code></p>
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="login-form">
              <div className="form-group">
                <label>License Key</label>
                <div className="input-wrapper">
                  <Key className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="ENTER-YOUR-LICENSE-KEY"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    required
                  />
                </div>
                <p className="input-hint">Enter the key provided by the company.</p>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Activating...' : 'Activate Software'}
              </button>
            </form>

            <div className="activation-footer">
              <button onClick={() => window.open('#', '_blank')} className="link-button">
                Get License Key <ExternalLink size={14} />
              </button>
              <button onClick={handleLogout} className="logout-button">
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .login-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .logo-icon.warning {
          background: #f59e0b;
        }

        .logo-icon {
          background: #4f46e5;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: white;
        }

        .login-header h1 {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 14px;
        }

        .activation-info {
          background: rgba(15, 23, 42, 0.5);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .activation-info p {
          margin: 4px 0;
        }

        .code-snippet {
          color: #4f46e5;
          font-family: monospace;
          background: rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 500;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: #64748b;
        }

        .input-wrapper input {
          width: 100%;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 12px 12px 40px;
          color: white;
          font-size: 16px;
          font-family: monospace;
          letter-spacing: 1px;
        }

        .input-hint {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .login-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .login-button:hover {
          background: #4338ca;
        }

        .success-view {
          text-align: center;
          padding: 20px 0;
        }

        .success-icon {
          color: #10b981;
          margin-bottom: 24px;
        }

        .redirect-text {
          margin-top: 16px;
          font-size: 12px;
          color: #64748b;
        }

        .activation-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
        }

        .link-button {
          background: transparent;
          border: none;
          color: #4f46e5;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .logout-button {
          background: transparent;
          border: none;
          color: #ef4444;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      ` }} />
    </div>
  );
};

export default ActivationPage;
