import React, { createContext, useContext, useEffect, useState } from 'react';
import { ShieldAlert, CreditCard, Bell, Terminal, Clock } from 'lucide-react';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userString = localStorage.getItem('pgms_user');
    if (!userString) return;
    const user = JSON.parse(userString);
    if (!user.user_id) return;
    
    // Connect to SSE endpoint
    const evtSource = new EventSource(`/api/system/sse?userId=${user.user_id}`);
    
    evtSource.addEventListener('activity', (e) => {
      try {
        const log = JSON.parse(e.data);
        addToast(log.title, log.description, log.event_type);
        setUnreadCount(prev => prev + 1);
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    });

    return () => {
      evtSource.close();
    };
  }, []);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearUnread = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ toasts, addToast, removeToast, unreadCount, clearUnread }}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            minWidth: '300px',
            maxWidth: '400px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slideIn 0.3s ease-out forwards'
          }}>
            <div style={{
              background: toast.type === 'access' ? 'rgba(239, 68, 68, 0.1)' : toast.type === 'payment' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: toast.type === 'access' ? '#ef4444' : toast.type === 'payment' ? '#10b981' : '#3b82f6',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {toast.type === 'access' ? <ShieldAlert size={20} /> : toast.type === 'payment' ? <CreditCard size={20} /> : <Bell size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{toast.title}</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </NotificationContext.Provider>
  );
};
