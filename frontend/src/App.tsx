import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LoginPage from './pages/LoginPage';
import GeneratorPage from './pages/GeneratorPage';
import ProfilePage from './pages/ProfilePage';

// Admin Layout & Pages
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import AdminsPage from './pages/admin/AdminsPage';
import LoginHistoryPage from './pages/admin/LoginHistoryPage';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import StatementLogsPage from './pages/admin/StatementLogsPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Main Application Routes */}
      <Route
        path="/generator"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
            <GeneratorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'USER']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Console Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route
          path="admins"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="login-history"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <LoginHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="activity"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <ActivityLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="statements"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <StatementLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/generator" replace />} />
    </Routes>
  );
}
