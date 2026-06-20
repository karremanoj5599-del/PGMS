import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, Plus, Trash2, Edit2, Download, Filter, Search, TrendingDown, PieChart } from 'lucide-react';

const EXPENSE_CATEGORIES = ['Electricity', 'Water', 'Maintenance', 'Salary', 'Supplies', 'Other'];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Electricity', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], payment_via: 'Cash', reference_number: ''
  });
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    category: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(filters).toString();
      const [expRes, sumRes] = await Promise.all([
        api.get(`/api/expenses?${q}`),
        api.get(`/api/expenses/summary?startDate=${filters.startDate}&endDate=${filters.endDate}`)
      ]);
      setExpenses(expRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/expenses/${editingId}`, formData);
      } else {
        await api.post('/api/expenses', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to save expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const openEdit = (exp) => {
    setFormData({
      category: exp.category,
      amount: exp.amount,
      description: exp.description || '',
      expense_date: new Date(exp.expense_date).toISOString().split('T')[0],
      payment_via: exp.payment_via || 'Cash',
      reference_number: exp.reference_number || ''
    });
    setEditingId(exp.expense_id);
    setShowModal(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Expense Tracker</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Track and manage your PG expenses
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => {
          setEditingId(null);
          setFormData({ category: 'Electricity', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0], payment_via: 'Cash', reference_number: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Record Expense
        </button>
      </div>

      {/* P/L Summary Row */}
      <div className="stats-grid">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: '#10b981' }}>₹{summary.revenue.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>For selected period</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>₹{summary.expenses.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>For selected period</div>
        </div>
        <div className="stat-card" style={{ background: `linear-gradient(135deg, rgba(${summary.profit >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.1) 0%, rgba(${summary.profit >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.02) 100%)`, border: `1px solid rgba(${summary.profit >= 0 ? '16, 185, 129' : '239, 68, 68'}, 0.2)` }}>
          <div className="stat-label">Net Profit / Loss</div>
          <div className="stat-value" style={{ color: summary.profit >= 0 ? '#10b981' : '#ef4444' }}>
            {summary.profit >= 0 ? '+' : ''}₹{summary.profit.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>For selected period</div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Start Date</label>
          <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>End Date</label>
          <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
          <label>Category</label>
          <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Payment Via</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading expenses...</td></tr>
            ) : expenses.length > 0 ? (
              expenses.map(e => (
                <tr key={e.expense_id}>
                  <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                  <td>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                      {e.category}
                    </span>
                  </td>
                  <td>{e.description || '-'}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>{e.payment_via}</div>
                    {e.reference_number && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.reference_number}</div>}
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{e.amount.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-icon-only" onClick={() => openEdit(e)}><Edit2 size={16} /></button>
                      <button className="btn-icon-only" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(e.expense_id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No expenses recorded for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-content">
            <h2 style={{ margin: '0 0 1.5rem' }}>{editingId ? 'Edit Expense' : 'Record Expense'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Category *</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" required value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Payment Via *</label>
                  <select required value={formData.payment_via} onChange={e => setFormData({...formData, payment_via: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="e.g. Paid plumber for pipe fix" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              {formData.payment_via !== 'Cash' && (
                <div className="form-group">
                  <label>Reference / UTR Number</label>
                  <input type="text" value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? 'Save Changes' : 'Record Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
