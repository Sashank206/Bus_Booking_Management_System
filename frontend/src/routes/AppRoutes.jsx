import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import OperatorLayout from '../layouts/OperatorLayout';
import AdminLayout from '../layouts/AdminLayout';

// Route Guard
import ProtectedRoute from './ProtectedRoute';

// Public Pages
import HomePage from '../pages/public/HomePage';
import SearchPage from '../pages/public/SearchPage';
import AboutPage from '../pages/public/AboutPage';
import ContactPage from '../pages/public/ContactPage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import OperatorRegisterPage from '../pages/public/OperatorRegisterPage';
import UnauthorizedPage from '../pages/public/UnauthorizedPage';
import NotFoundPage from '../pages/public/NotFoundPage';

// Customer Pages
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';

// Operator Pages
import OperatorDashboardPage from '../pages/operator/OperatorDashboardPage';
import OperatorBusesPage from '../pages/operator/OperatorBusesPage';
import OperatorTripsPage from '../pages/operator/OperatorTripsPage';
import OperatorProfilePage from '../pages/operator/OperatorProfilePage';

// Admin Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminOperatorsPage from '../pages/admin/AdminOperatorsPage';
import AdminStopsRoutesPage from '../pages/admin/AdminStopsRoutesPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/operator-register" element={<OperatorRegisterPage />} />
      </Route>

      {/* 2. Customer Protected Routes */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer', 'admin']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboardPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route>

      {/* 3. Operator Protected Routes */}
      <Route
        path="/operator"
        element={
          <ProtectedRoute allowedRoles={['operator', 'admin']}>
            <OperatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/operator/dashboard" replace />} />
        <Route path="dashboard" element={<OperatorDashboardPage />} />
        <Route path="buses" element={<OperatorBusesPage />} />
        <Route path="trips" element={<OperatorTripsPage />} />
        <Route path="manifests" element={<OperatorTripsPage />} />
        <Route path="reports" element={<OperatorDashboardPage />} />
        <Route path="profile" element={<OperatorProfilePage />} />
      </Route>

      {/* 4. Administrator Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="operators" element={<AdminOperatorsPage />} />
        <Route path="stops-routes" element={<AdminStopsRoutesPage />} />
        <Route path="trips" element={<AdminStopsRoutesPage />} />
        <Route path="bookings" element={<AdminDashboardPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* 5. Utility & Error Routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

