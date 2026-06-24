import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "./MessManagement.css";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MessManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  
  // Date selection for headcounts
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  
  const [optOuts, setOptOuts] = useState([]);
  const [loadingOptOuts, setLoadingOptOuts] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    fetchOptOuts(selectedDate);
  }, [selectedDate]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/mess/menu");
      if (res.data && res.data.length > 0) {
        setMenu(res.data);
      } else {
        // Initialize with empty template
        setMenu(
          DAYS_OF_WEEK.map((day, index) => ({
            day_index: index === 6 ? 0 : index + 1, // mapping to JS getDay() style
            day_of_week: day,
            breakfast: "",
            lunch: "",
            dinner: "",
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching menu:", err);
      setError("Failed to load mess menu");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptOuts = async (date) => {
    try {
      setLoadingOptOuts(true);
      const res = await api.get(`/api/mess/opt-outs?date=${date}`);
      setOptOuts(res.data || []);
    } catch (err) {
      console.error("Error fetching opt-outs:", err);
    } finally {
      setLoadingOptOuts(false);
    }
  };

  const handleMenuChange = (index, field, value) => {
    const newMenu = [...menu];
    newMenu[index][field] = value;
    setMenu(newMenu);
  };

  const saveMenu = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg("");
      await api.put("/api/mess/menu", { menu });
      setSuccessMsg("Weekly menu saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error saving menu:", err);
      setError("Failed to save menu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="mess-management animate-fade-in" style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Food & Mess Management</h2>

      {error && <div className="alert alert-danger" style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>{error}</div>}
      {successMsg && <div className="alert alert-success" style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>{successMsg}</div>}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Left Column: Weekly Menu Editor */}
        <div style={{ flex: '2', minWidth: '300px' }}>
          <div className="card" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h4 style={{ marginBottom: '15px' }}>Weekly Menu Template</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Day</th>
                    <th style={{ padding: '10px' }}>Breakfast</th>
                    <th style={{ padding: '10px' }}>Lunch</th>
                    <th style={{ padding: '10px' }}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {menu.map((dayPlan, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{dayPlan.day_of_week}</td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          value={dayPlan.breakfast || ''}
                          onChange={(e) => handleMenuChange(index, "breakfast", e.target.value)}
                          placeholder="e.g. Poha & Tea"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          value={dayPlan.lunch || ''}
                          onChange={(e) => handleMenuChange(index, "lunch", e.target.value)}
                          placeholder="e.g. Dal, Roti, Rice"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </td>
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          value={dayPlan.dinner || ''}
                          onChange={(e) => handleMenuChange(index, "dinner", e.target.value)}
                          placeholder="e.g. Paneer, Roti"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={saveMenu}
                disabled={saving}
                style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                {saving ? "Saving..." : "Save Weekly Menu"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Headcount & Opt-Outs */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div className="card" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
            <h4 style={{ marginBottom: '15px' }}>Daily Headcount Report</h4>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ margin: 0, color: 'var(--danger)' }}>{optOuts.length}</h1>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Tenants Opted Out</p>
            </div>

            <h5 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '10px' }}>Opt-Out List</h5>
            {loadingOptOuts ? (
              <div>Loading...</div>
            ) : optOuts.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Tenant</th>
                      <th style={{ padding: '8px' }}>Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optOuts.map((opt) => (
                      <tr key={opt.tenant_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 'bold' }}>{opt.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.mobile}</div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                            {opt.room_number ? `${opt.room_number} (${opt.bed_number})` : "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No opt-outs recorded for this date.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessManagement;
