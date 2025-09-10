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
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <IdcardOutlined style={{ fontSize: 48, color: '#1890ff' }} />
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
            
            <div style={{ fontSize: 12, color: '#666', marginTop: 16 }}>
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
