import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  MessageSquare, PhoneCall, Smartphone, Bell, Save, 
  RefreshCw, Send, CheckCircle, AlertTriangle, Settings2, Clock, Check
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const CommunicationSettings = () => {
  const { addToast } = useNotifications();
  const [settings, setSettings] = useState({
    sms: { rent_reminder: false, rent_overdue: false },
    whatsapp: { rent_reminder: false, rent_overdue: false },
    voicecall: { rent_reminder: false, rent_overdue: false }
  });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [queueFilter, setQueueFilter] = useState('pending'); // pending, sent, all
  const [channelFilter, setChannelFilter] = useState('all');

  useEffect(() => {
    fetchSettings();
    fetchQueue();
  }, [queueFilter, channelFilter]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/communication/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
      addToast('Error', 'Failed to fetch communication settings', 'error');
    }
  };

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (queueFilter !== 'all') params.append('status', queueFilter);
      if (channelFilter !== 'all') params.append('channel', channelFilter);
      
      const res = await api.get(`/api/communication/queue?${params.toString()}`);
      setQueue(res.data);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (channel, trigger) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [trigger]: !prev[channel][trigger]
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/api/communication/settings', settings);
      addToast('Success', 'Settings saved successfully', 'success');
      // Re-fetch queue to see if anything changed (though generation is explicit)
      fetchQueue();
    } catch (err) {
      console.error('Failed to save settings', err);
      addToast('Error', 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQueue = async () => {
    try {
      setGenerating(true);
      const res = await api.post('/api/communication/queue/generate');
      addToast('Generated', res.data.message, 'success');
      fetchQueue();
    } catch (err) {
      console.error('Failed to generate queue', err);
      addToast('Error', err.response?.data?.error || 'Failed to generate queue', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendItem = async (queueId) => {
    try {
      const res = await api.post('/api/communication/queue/send', { queue_ids: [queueId] });
      const result = res.data.results[0];
      
      if (result.action_url) {
        window.open(result.action_url, '_blank');
      }
      
      addToast('Sent', `Message marked as sent for ${result.tenant_name}`, 'success');
      fetchQueue();
    } catch (err) {
      console.error('Failed to send item', err);
      addToast('Error', 'Failed to send message', 'error');
    }
  };

  const handleBulkSend = async () => {
    const pendingIds = queue.filter(q => q.status === 'pending').map(q => q.queue_id);
    if (pendingIds.length === 0) return;

    if (!window.confirm(`Mark ${pendingIds.length} messages as sent? For WhatsApp/Voice, links will open sequentially.`)) {
      return;
    }

    try {
      const res = await api.post('/api/communication/queue/send', { queue_ids: pendingIds });
      
      // Open links sequentially with a small delay to avoid browser popup blockers
      res.data.results.forEach((result, index) => {
        if (result.action_url && result.channel !== 'sms') {
          setTimeout(() => {
            window.open(result.action_url, '_blank');
          }, index * 1000);
        }
      });
      
      addToast('Success', res.data.message, 'success');
      fetchQueue();
    } catch (err) {
      console.error('Failed bulk send', err);
      addToast('Error', 'Failed bulk send', 'error');
    }
  };

  const renderChannelCard = (channel, title, icon, color, description) => {
    const isOn = settings[channel]?.rent_reminder || settings[channel]?.rent_overdue;
    
    return (
      <div style={{ 
        background: 'var(--card-bg)', borderRadius: '1rem', padding: '1.5rem', 
        border: `1px solid ${isOn ? color : 'var(--border)'}`,
        position: 'relative', overflow: 'hidden', transition: 'all 0.3s'
      }}>
        {isOn && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }} />}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: isOn ? `${color}20` : 'var(--bg-color)',
              color: isOn ? color : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOn ? '#10b981' : '#9ca3af' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isOn ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>
          {description}
        </p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Rent Due Reminders</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings[channel]?.rent_reminder || false} 
                onChange={() => handleToggle(channel, 'rent_reminder')}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Rent Overdue Alerts</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings[channel]?.rent_overdue || false} 
                onChange={() => handleToggle(channel, 'rent_overdue')}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  const getChannelIcon = (ch) => {
    if (ch === 'whatsapp') return <MessageSquare size={16} color="#25D366" />;
    if (ch === 'sms') return <Smartphone size={16} color="#3b82f6" />;
    if (ch === 'voicecall') return <PhoneCall size={16} color="#8b5cf6" />;
    return null;
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Settings2 size={28} style={{ color: 'var(--primary)' }} />
            Automated Communication
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>
            Configure automated messages and calls for your tenants.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveSettings} 
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {renderChannelCard(
          'whatsapp', 
          'WhatsApp', 
          <MessageSquare size={24} />, 
          '#25D366', 
          'Opens WhatsApp web/app with pre-filled reminder messages. Free, uses your phone.'
        )}
        {renderChannelCard(
          'sms', 
          'Text Message (SMS)', 
          <Smartphone size={24} />, 
          '#3b82f6', 
          'Logs standard text messages for tenants. (Requires provider setup for actual delivery).'
        )}
        {renderChannelCard(
          'voicecall', 
          'Voice Call', 
          <PhoneCall size={24} />, 
          '#8b5cf6', 
          'Opens your phone dialer to call tenants with overdue rent. Fast and direct.'
        )}
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} /> Communication Queue
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Pending and sent automated messages based on your settings.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="form-control" style={{ width: '130px' }}>
              <option value="all">All Channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="voicecall">Voice Call</option>
            </select>
            
            <select value={queueFilter} onChange={e => setQueueFilter(e.target.value)} className="form-control" style={{ width: '130px' }}>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="all">All Status</option>
            </select>

            <button 
              className="btn btn-secondary" 
              onClick={handleGenerateQueue} 
              disabled={generating}
              title="Manually scan for due/overdue rent and populate queue"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} className={generating ? 'spin' : ''} /> Generate
            </button>
            
            {queue.filter(q => q.status === 'pending').length > 0 && (
              <button 
                className="btn btn-primary" 
                onClick={handleBulkSend}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={16} /> Send All Pending ({queue.filter(q => q.status === 'pending').length})
              </button>
            )}
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading queue...</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(128,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={32} color="#10b981" />
              </div>
              <h3 style={{ margin: 0 }}>Queue is Empty</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>No pending messages based on current filters.</p>
            </div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tenant</th>
                  <th>Channel</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(item => (
                  <tr key={item.queue_id} style={{ opacity: item.status === 'sent' ? 0.7 : 1 }}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {new Date(item.scheduled_date).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.tenant_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.tenant_mobile}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize', fontSize: '0.85rem' }}>
                        {getChannelIcon(item.channel)} {item.channel === 'voicecall' ? 'Voice Call' : item.channel}
                      </div>
                    </td>
                    <td>
                      <div style={{ 
                        maxWidth: '300px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem'
                      }} title={item.message_text}>
                        {item.trigger_type === 'rent_overdue' && <AlertTriangle size={14} color="#ef4444" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />}
                        {item.message_text}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'pending' ? 'badge-occupied' : 'badge-vacant'}`}>
                        {item.status === 'pending' && <Clock size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                        {item.status === 'sent' && <Check size={12} style={{ marginRight: '4px', display: 'inline' }} />}
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'pending' ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 12px', fontSize: '0.8rem', background: item.channel === 'whatsapp' ? '#25D366' : item.channel === 'voicecall' ? '#8b5cf6' : '#3b82f6', color: 'white', border: 'none' }}
                          onClick={() => handleSendItem(item.queue_id)}
                        >
                          Send
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {item.sent_at ? new Date(item.sent_at).toLocaleTimeString() : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--border);
          transition: .4s;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
        }
        input:checked + .slider {
          background-color: var(--primary);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
        .slider.round {
          border-radius: 24px;
        }
        .slider.round:before {
          border-radius: 50%;
        }
      `}} />
    </div>
  );
};

export default CommunicationSettings;
