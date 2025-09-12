import React from 'react';
import { Card, Button, Typography, Space } from 'antd';
import { IdcardOutlined, LoginOutlined } from '@ant-design/icons';
import { useKeycloak } from '../../contexts/KeycloakContext';

const { Title, Paragraph } = Typography;

const LoginPage: React.FC = () => {
  const { login } = useKeycloak();

  const handleLogin = () => {
    login();
  };

  // Don't clear URL hash - let Keycloak handle it

  return (
    <div className="login-page">
      <div className="login-container">
        <Card
          style={{
            width: 400,
            textAlign: 'center',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--text-color) 12%, transparent)',
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <IdcardOutlined style={{ fontSize: 48, color: 'var(--primary-color)' }} />
              <Title level={2} style={{ margin: '16px 0 8px 0' }}>
                SIM Inventory Management
              </Title>
              <Paragraph type="secondary">
                Professional SIM card inventory and lifecycle management system
              </Paragraph>
            </div>
            
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={handleLogin}
              style={{ width: '100%', height: 48 }}
            >
              Sign in with Keycloak
            </Button>
            
            <div style={{ fontSize: 12, marginTop: 16 }}>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                Secure authentication powered by Keycloak
              </Paragraph>
            </div>
          </Space>
        </Card>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--primary-color) 35%, var(--page-bg)) 0%,
            color-mix(in srgb, var(--primary-color) 60%, var(--page-bg)) 100%
          );
          padding: 20px;
        }
        
        .login-container {
          width: 100%;
          max-width: 400px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
