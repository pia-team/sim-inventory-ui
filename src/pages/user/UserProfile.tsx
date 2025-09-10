import React from 'react';
import {
  Card,
  Descriptions,
  Avatar,
  Typography,
  Space,
  Tag,
  Button,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useKeycloak } from '../../contexts/KeycloakContext';

const { Title, Text } = Typography;

const UserProfile: React.FC = () => {
  const { userInfo, keycloak, hasRole, hasRealmRole } = useKeycloak();

  const getUserRoles = () => {
    const clientRoles = keycloak?.resourceAccess?.['orbitant-ui-client']?.roles || [];
    const realmRoles = keycloak?.realmAccess?.roles || [];
    
    return {
      clientRoles,
      realmRoles: realmRoles.filter(role => !['default-roles-orbitant-realm', 'offline_access', 'uma_authorization'].includes(role)),
    };
  };

  const { clientRoles, realmRoles } = getUserRoles();

  const getPermissions = () => {
    const permissions = [];
    
    if (hasRole('sim_admin')) {
      permissions.push('Full SIM management', 'Batch operations', 'User management', 'Reports access');
    }
    if (hasRole('sim_user')) {
      permissions.push('Create orders', 'View SIM resources');
    }
    if (hasRealmRole('admin')) {
      permissions.push('System administration');
    }

    return permissions;
  };

  return (
    <div>
      <Title level={2}>User Profile</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar
                size={100}
                icon={<UserOutlined />}
                src={userInfo?.picture}
                style={{ marginBottom: 16 }}
              />
              <Title level={3} style={{ margin: '8px 0' }}>
                {userInfo?.name || userInfo?.preferred_username || 'User'}
              </Title>
              <Text type="secondary">
                {userInfo?.email}
              </Text>
            </div>
          </Card>

          <Card title="Account Status" style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Email Verified</Text>
                <Tag color={userInfo?.email_verified ? 'green' : 'red'}>
                  {userInfo?.email_verified ? 'Verified' : 'Not Verified'}
                </Tag>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Account Status</Text>
                <Tag color="green">Active</Tag>
              </div>

              {userInfo?.locale && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Locale</Text>
                  <Text>{userInfo.locale}</Text>
                </div>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Profile Information">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item 
                label={<><UserOutlined /> Username</>}
              >
                {userInfo?.preferred_username || '-'}
              </Descriptions.Item>
              
              <Descriptions.Item 
                label={<><MailOutlined /> Email</>}
              >
                {userInfo?.email || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="First Name">
                {userInfo?.given_name || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Last Name">
                {userInfo?.family_name || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Full Name">
                {userInfo?.name || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Subject ID">
                <Text code copyable>
                  {userInfo?.sub || '-'}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Session State">
                <Text code>
                  {keycloak?.sessionId?.substring(0, 16) || '-'}...
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Auth Time">
                {keycloak?.authServerUrl ? (
                  <Text>
                    <ClockCircleOutlined /> {new Date(keycloak.timeSkew || 0).toLocaleString()}
                  </Text>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Roles & Permissions" style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Client Roles</Text>
                  <div style={{ marginTop: 8 }}>
                    {clientRoles.length > 0 ? (
                      <Space wrap>
                        {clientRoles.map(role => (
                          <Tag key={role} color="blue" icon={<SafetyCertificateOutlined />}>
                            {role}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Text type="secondary">No client roles assigned</Text>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Realm Roles</Text>
                  <div style={{ marginTop: 8 }}>
                    {realmRoles.length > 0 ? (
                      <Space wrap>
                        {realmRoles.map(role => (
                          <Tag key={role} color="purple">
                            {role}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Text type="secondary">No realm roles assigned</Text>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <Text strong>Permissions</Text>
              <div style={{ marginTop: 8 }}>
                {getPermissions().length > 0 ? (
                  <ul style={{ marginBottom: 0 }}>
                    {getPermissions().map((permission, index) => (
                      <li key={index}>
                        <Text>{permission}</Text>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary">No specific permissions granted</Text>
                )}
              </div>
            </div>
          </Card>

          <Card title="Session Information" style={{ marginTop: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Authentication Server">
                <Text code>{keycloak?.authServerUrl || '-'}</Text>
              </Descriptions.Item>
              
              <Descriptions.Item label="Realm">
                <Text code>{keycloak?.realm || '-'}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Client ID">
                <Text code>{keycloak?.clientId || '-'}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Token Parsed">
                <Tag color={keycloak?.tokenParsed ? 'green' : 'red'}>
                  {keycloak?.tokenParsed ? 'Valid' : 'Invalid'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Authenticated">
                <Tag color={keycloak?.authenticated ? 'green' : 'red'}>
                  {keycloak?.authenticated ? 'Yes' : 'No'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Security Settings" style={{ marginTop: 16 }}>
            <Space>
              <Button type="primary" disabled>
                Change Password
              </Button>
              <Button disabled>
                Manage Sessions
              </Button>
              <Button disabled>
                Security Logs
              </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                These features are managed through the Keycloak account console.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserProfile;
