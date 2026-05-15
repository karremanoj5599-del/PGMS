import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, DashboardLayout } from './components/layouts/DashboardLayout';

import Dashboard from './pages/Dashboard';
import Tenants from './features/tenants/Tenants';
import Rooms from './features/rooms/Rooms';
import Devices from './features/devices/Devices';
import Payments from './features/payments/Payments';
import Reports from './features/reports/Reports';
import SupportTickets from './features/tickets/SupportTickets';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ActivationPage from './features/auth/ActivationPage';
import AccessSchedules from './features/schedules/AccessSchedules';

// Note: The global axios interceptor has been moved to src/services/api.js.
// When features are fully refactored, they should import api from services instead of raw axios.
import './services/api';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/activate" element={<ActivationPage />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><DashboardLayout><Tenants /></DashboardLayout></ProtectedRoute>} />
        <Route path="/rooms" element={<ProtectedRoute><DashboardLayout><Rooms /></DashboardLayout></ProtectedRoute>} />
        <Route path="/devices" element={<ProtectedRoute><DashboardLayout><Devices /></DashboardLayout></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><DashboardLayout><Payments /></DashboardLayout></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><DashboardLayout><SupportTickets /></DashboardLayout></ProtectedRoute>} />
        <Route path="/schedules" element={<ProtectedRoute><DashboardLayout><AccessSchedules /></DashboardLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
