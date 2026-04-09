import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UserPlus, Mail, Lock, AlertCircle, CheckCircle, Copy, ArrowRight } from 'lucide-react';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [trialExpiry, setTrialExpiry] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', { email: email.trim(), password });
      setActivationCode(response.data.activation_code);
      setTrialExpiry(response.data.trial_expiry);
    } catch (err) {
      console.error('Registration Error:', err);
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activationCode);
    alert('Activation code copied to clipboard!');
  };

  if (activationCode) {
    return (
      <div className="login-container">
        <div className="login-card success-card">
          <div className="login-header">
            <div className="success-icon">
              <CheckCircle size={40} />
            </div>
            <h1>Account Created!</h1>
            <p>Welcome to PGMS Admin</p>
          </div>

          <div className="info-box">
            <p className="info-label">Your Unique Activation Code</p>
            <div className="code-display">
              <span className="code-text">{activationCode}</span>
              <button onClick={copyToClipboard} className="icon-button" title="Copy code">
                <Copy size={18} />
              </button>
            </div>
            <p className="info-help">
              Please share this code with the company to receive your license key.
            </p>
          </div>

          <div className="trial-banner">
            <p>Your <strong>3-day trial</strong> has started.</p>
            <p className="expiry-text">Expires on: {new Date(trialExpiry).toLocaleDateString()}</p>
          </div>

          <button onClick={() => navigate('/login')} className="login-button">
            Go to Login <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
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
            max-width: 400px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .success-icon {
            color: #10b981;
            margin-bottom: 16px;
            display: flex;
            justify-content: center;
          }
          .info-box {
            background: rgba(15, 23, 42, 0.5);
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .info-label {
            color: #94a3b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
            text-align: center;
          }
          .code-display {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .code-text {
            color: #4f46e5;
            font-family: 'JetBrains Mono', monospace;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 2px;
          }
          .icon-button {
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          }
          .icon-button:hover {
            color: #4f46e5;
            background: rgba(79, 70, 229, 0.1);
          }
          .info-help {
            color: #64748b;
            font-size: 11px;
            text-align: center;
            line-height: 1.4;
          }
          .trial-banner {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            color: #f59e0b;
            padding: 12px;
            border-radius: 12px;
            text-align: center;
            font-size: 14px;
            margin-bottom: 24px;
          }
          .expiry-text {
            font-size: 12px;
            opacity: 0.8;
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
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        ` }} />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <UserPlus size={32} />
          </div>
          <h1>Create Account</h1>
          <p>Start your 3-day trial today</p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
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
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
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
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
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
          font-size: 14px;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #4f46e5;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
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
          margin-top: 10px;
        }

        .login-button:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
        }

        .login-footer p {
          color: #94a3b8;
          font-size: 14px;
        }

        .login-footer a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }
      ` }} />
    </div>
  );
};

export default RegisterPage;
