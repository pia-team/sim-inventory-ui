import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useKeycloak } from '../contexts/KeycloakContext';
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../pages/dashboard/Dashboard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SimResourceList from '../pages/sim-resources/SimResourceList';
import SimResourceDetail from '../pages/sim-resources/SimResourceDetail';
import CreateSimResource from '../pages/sim-resources/CreateSimResource';
import BatchImport from '../pages/sim-resources/BatchImport';
import BulkTemplateCreate from '../pages/sim-resources/BulkTemplateCreate';
import SimOrderList from '../pages/sim-orders/SimOrderList';
import SimOrderDetail from '../pages/sim-orders/SimOrderDetail';
import CreateSimOrder from '../pages/sim-orders/CreateSimOrder';
import Reports from '../pages/reports/Reports';
import UserProfile from '../pages/user/UserProfile';

const AppRoutes: React.FC = () => {
  const { authenticated, loading, token } = useKeycloak();

  // Show loading spinner during initialization
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If not authenticated or token not ready, keep spinner (KeycloakProvider handles redirects)
  if (!authenticated || !token) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* SIM Resources */}
        <Route path="/sim-resources" element={<SimResourceList />} />
        <Route path="/sim-resources/create" element={<CreateSimResource />} />
        <Route path="/sim-resources/batch-import" element={<BatchImport />} />
        <Route path="/sim-resources/bulk-template" element={<BulkTemplateCreate />} />
        <Route path="/sim-resources/:id" element={<SimResourceDetail />} />

        {/* SIM Orders */}
        <Route path="/sim-orders" element={<SimOrderList />} />
        <Route path="/sim-orders/create" element={<CreateSimOrder />} />
        <Route path="/sim-orders/:id" element={<SimOrderDetail />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />

        {/* User Profile */}
        <Route path="/profile" element={<UserProfile />} />
      </Route>

      {/* Login */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
