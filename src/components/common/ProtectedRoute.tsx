import React from 'react';
import { Result, Button } from 'antd';
import { useKeycloak } from '../../contexts/KeycloakContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRealmRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requiredRealmRole 
}) => {
  const { authenticated, hasRole, hasRealmRole } = useKeycloak();

  if (!authenticated) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You need to be authenticated to access this page."
        extra={
          <Button type="primary" href="/login">
            Go to Login
          </Button>
        }
      />
    );
  }

  // Check for required client role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Result
        status="403"
        title="Insufficient Permissions"
        subTitle={`You need the '${requiredRole}' role to access this page.`}
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
      />
    );
  }

  // Check for required realm role
  if (requiredRealmRole && !hasRealmRole(requiredRealmRole)) {
    return (
      <Result
        status="403"
        title="Insufficient Permissions"
        subTitle={`You need the '${requiredRealmRole}' realm role to access this page.`}
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
