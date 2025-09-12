import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Space,
  Typography,
  theme,
  Badge,
} from 'antd';
import {
  DashboardOutlined,
  IdcardOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useKeycloak } from '../../contexts/KeycloakContext';
import { useTranslation } from 'react-i18next';
import ThemeSettingsDrawer from '../common/ThemeSettingsDrawer';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userInfo, logout, hasRole } = useKeycloak();
  const { t, i18n } = useTranslation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('nav.dashboard'),
    },
    {
      key: 'sim-resources',
      icon: <IdcardOutlined />,
      label: t('nav.simResources'),
      children: [
        {
          key: '/sim-resources',
          label: t('nav.viewAll'),
        },
        ...(hasRole('sim_admin') ? [
          {
            key: '/sim-resources/create',
            label: t('nav.createNew'),
          },
          {
            key: '/sim-resources/batch-import',
            label: t('nav.batchImport'),
          },
          {
            key: '/sim-resources/bulk-template',
            label: t('nav.bulkTemplate'),
          },
        ] : []),
      ],
    },
    {
      key: 'sim-orders',
      icon: <ShoppingCartOutlined />,
      label: t('nav.orders'),
      children: [
        {
          key: '/sim-orders',
          label: t('nav.viewAll'),
        },
        ...(hasRole('sim_user') || hasRole('sim_admin') ? [
          {
            key: '/sim-orders/create',
            label: t('order.createNew'),
          },
        ] : []),
      ],
    },
    ...(hasRole('sim_admin') ? [
      {
        key: '/reports',
        icon: <BarChartOutlined />,
        label: t('nav.reports'),
      },
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('nav.settings'),
      onClick: () => {
        // Navigate to settings or show settings modal
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: logout,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/sim-resources')) {
      if (path === '/sim-resources/create' || path === '/sim-resources/batch-import') {
        return [path];
      }
      return ['/sim-resources'];
    }
    if (path.startsWith('/sim-orders')) {
      if (path === '/sim-orders/create') {
        return [path];
      }
      return ['/sim-orders'];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/sim-resources')) {
      return ['sim-resources'];
    }
    if (path.startsWith('/sim-orders')) {
      return ['sim-orders'];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        width={250}
        style={{
          boxShadow: '2px 0 6px rgba(0,21,41,.1)',
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)'
        }}
      >
        <div 
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '1px solid var(--header-border-color)',
            color: 'var(--sidebar-text)'
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IdcardOutlined style={{ fontSize: 24, color: 'var(--primary-color)' }} />
              <Text strong style={{ fontSize: 16 }}>
                {t('app.title')}
              </Text>
            </div>
          )}
          {collapsed && (
            <IdcardOutlined style={{ fontSize: 24, color: 'var(--primary-color)' }} />
          )}
        </div>
        
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
        />
      </Sider>
      
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: 'var(--navbar-bg)',
            boxShadow: '0 2px 8px rgba(0,21,41,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--navbar-text)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
              color: 'var(--navbar-text)'
            }}
          />
          
          <Space size="large">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setThemeOpen(true)}
              style={{ fontSize: '16px', color: 'var(--navbar-text)' }}
            >
              {t('theme.button', { defaultValue: 'Tema' })}
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'en', label: t('lang.en') },
                  { key: 'tr', label: t('lang.tr') },
                  { key: 'de', label: t('lang.de') },
                  { key: 'fr', label: t('lang.fr') },
                ],
                onClick: ({ key }) => i18n.changeLanguage(key),
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="text" style={{ fontSize: 14, color: 'var(--navbar-text)' }}>
                {i18n.language?.toUpperCase() || 'EN'}
              </Button>
            </Dropdown>
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }} size={8} align="center">
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  src={userInfo?.picture}
                  style={{ lineHeight: 1 }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>
                    {userInfo?.name || userInfo?.preferred_username || 'User'}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px', margin: 0 }}>
                    {userInfo?.email}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 'var(--border-radius)',
          }}
        >
          <Outlet />
        </Content>

        <ThemeSettingsDrawer open={themeOpen} onClose={() => setThemeOpen(false)} />
      </Layout>
    </Layout>
  );
};

export default MainLayout;
