import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, DashboardLayout } from './components/layouts/DashboardLayout';

import Dashboard from './pages/Dashboard';
import Tenants from './features/tenants/Tenants';
import Staff from './features/staff/Staff';
import Rooms from './features/rooms/Rooms';
import Devices from './features/devices/Devices';
import Payments from './features/payments/Payments';
import Reports from './features/reports/Reports';
import TenantAttendance from './features/reports/TenantAttendance';
import SupportTickets from './features/tickets/SupportTickets';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ActivationPage from './features/auth/ActivationPage';
import ReportIssuePage from './features/tickets/ReportIssuePage';
import AccessSchedules from './features/schedules/AccessSchedules';
import Notifications from './pages/Notifications';
import Expenses from './features/expenses/Expenses';
import CommunicationSettings from './features/communication/CommunicationSettings';
import Backups from './features/backups/Backups';

// Note: The global axios interceptor has been moved to src/services/api.js.
// When features are fully refactored, they should import api from services instead of raw axios.
import './services/api';

import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/activate" element={<ActivationPage />} />
          <Route path="/report-issue" element={<ReportIssuePage />} />
          
          {/* Protected Dashboard Routes */}
          <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/tenants" element={<ProtectedRoute><DashboardLayout><Tenants /></DashboardLayout></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><DashboardLayout><Staff /></DashboardLayout></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute><DashboardLayout><Rooms /></DashboardLayout></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute><DashboardLayout><Devices /></DashboardLayout></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><DashboardLayout><Payments /></DashboardLayout></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><DashboardLayout><Expenses /></DashboardLayout></ProtectedRoute>} />
          <Route path="/communication" element={<ProtectedRoute><DashboardLayout><CommunicationSettings /></DashboardLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><DashboardLayout><SupportTickets /></DashboardLayout></ProtectedRoute>} />
          <Route path="/schedules" element={<ProtectedRoute><DashboardLayout><AccessSchedules /></DashboardLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
          <Route path="/backups" element={<ProtectedRoute><DashboardLayout><Backups /></DashboardLayout></ProtectedRoute>} />
          <Route path="/tenants/:id/attendance" element={<ProtectedRoute><DashboardLayout><TenantAttendance /></DashboardLayout></ProtectedRoute>} />
          
          {/* Redirects and 404 */}
          <Route path="/beds" element={<Navigate to="/rooms" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
