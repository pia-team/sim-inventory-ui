import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Space, Button, message } from 'antd';
import {
  PlusOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import { SimOrder } from '../../types/sim.types';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useKeycloak } from '../../contexts/KeycloakContext';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, authenticated, token } = useKeycloak();
  const { t } = useTranslation();

  // Fetch statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery(
    ['simStatistics', token],
    () => apiService.getSimStatistics(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      enabled: authenticated && !!token,
    }
  );

  // Ensure queries refetch after token becomes available
  React.useEffect(() => {
    if (authenticated && token) {
      queryClient.invalidateQueries(['recentSims']);
      queryClient.invalidateQueries(['recentOrders']);
      queryClient.invalidateQueries(['simStatistics']);
    }
  }, [authenticated, token, queryClient]);

  // Fetch recent SIM resources
  const { data: recentSimsResponse, isLoading: recentSimsLoading } = useQuery(
    ['recentSims', token],
    () => apiService.getSimResources({ limit: 10, offset: 0, sort: '-createdDate'}),
    {
      refetchInterval: 60000, // Refresh every minute
      enabled: authenticated && !!token,
      onError: (error: any) => {
        message.error(`Failed to load recent SIMs: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
        // Also log details for debugging
        // eslint-disable-next-line no-console
        console.error('recentSims error', error);
      },
    }
  );

  // Fetch recent orders
  const { data: recentOrdersResponse, isLoading: recentOrdersLoading } = useQuery(
    ['recentOrders', token],
    () => apiService.getSimOrders({ limit: 10, offset: 0, sort: '-orderDate'}),
    {
      refetchInterval: 60000, // Refresh every minute
      enabled: authenticated && !!token,
      onError: (error: any) => {
        message.error(`Failed to load recent orders: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
        // eslint-disable-next-line no-console
        console.error('recentOrders error', error);
      },
    }
  );

  const stats = statsResponse?.data;
  const toArray = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };
  const recentSims = toArray(recentSimsResponse?.data);
  const recentOrders = toArray(recentOrdersResponse?.data);

  

  // Helper to read a characteristic value
  const getChar = (sim: any, key: string) =>
    sim?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

  const simColumns = [
    {
      title: t('sim.iccid'),
      dataIndex: 'iccid',
      key: 'iccid',
      render: (iccid: string, record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/sim-resources/${record.id}`)}
          style={{ padding: 0 }}
        >
          {getChar(record, 'ICCID') || iccid || record?.name || record?.id}
        </Button>
      ),
    },
    {
      title: t('sim.type'),
      dataIndex: 'type',
      key: 'type',
      render: (_: any, record: any) => {
        const displayType = record?.type || record?.['@type'] || record?.resourceSpecification?.name || '-';
        const isEsim = String(displayType).toLowerCase().includes('esim');
        return (
          <Tag color={isEsim ? 'cyan' : 'blue'}>
            {displayType}
          </Tag>
        );
      },
    },
    {
      title: t('sim.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: any) => {
        const s = String(record?.resourceStatus || record?.status || '').toLowerCase();
        const map: Record<string, string> = {
          available: 'green',
          reserved: 'gold',
          standby: 'cyan',
          suspended: 'orange',
          alarm: 'red',
          completed: 'green',
          cancelled: 'default',
          unknown: 'default',
          allocated: 'blue',
          active: 'cyan',
          terminated: 'red',
          retired: 'default',
        };
        const color = map[s] || 'default';
        return (
          <Tag color={color}>
            {s}
          </Tag>
        );
      },
    },
    {
      title: t('sim.state'),
      dataIndex: 'state',
      key: 'state',
      render: (_: any, record: any) => {
        const state = String(getChar(record, 'RESOURCE_STATE') || '').toLowerCase();
        const map: Record<string, string> = {
          available: 'green',
          reserved: 'gold',
          standby: 'cyan',
          suspended: 'orange',
          alarm: 'red',
          completed: 'green',
          cancelled: 'default',
          unknown: 'default',
          active: 'cyan',
          terminated: 'red',
          retired: 'default',
        };
        const color = map[state] || 'default';
        return (
          <Tag color={color}>{state || '-'}</Tag>
        );
      },
    },
    {
      title: t('sim.created'),
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (_: any, record: any) => record?.createdDate ? new Date(record.createdDate).toLocaleString() : '-',
    },
  ];

  const getOrderDisplayState = (order: SimOrder) => (order.status as any) || (order as any).state || 'Pending';
  const getOrderStatusColor = (status: string) => {
    const s = String(status || '').toLowerCase();
    const map: Record<string, string> = {
      pending: 'blue',
      inprogress: 'orange',
      'in progress': 'orange',
      acknowledged: 'gold',
      completed: 'green',
      failed: 'red',
      cancelled: 'default',
      partial: 'purple',
      rejected: 'red',
      held: 'volcano',
    };
    return map[s] || 'default';
  };

  const orderColumns = [
    {
      title: t('order.orderId'),
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <Button
          type="link"
          onClick={() => navigate(`/sim-orders/${id}`)}
          style={{ padding: 0 }}
        >
          {id.substring(0, 8)}...
        </Button>
      ),
    },
    {
      title: t('order.status'),
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: SimOrder) => {
        const st = getOrderDisplayState(record) as string;
        return (
          <Tag color={getOrderStatusColor(st)}>
            {st}
          </Tag>
        );
      },
    },
    {
      title: t('order.items'),
      dataIndex: 'orderItem',
      key: 'orderItem',
      render: (items: any[]) => items?.length || 0,
    },
    {
      title: t('order.orderDate'),
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  if (statsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{t('nav.dashboard')}</Title>
        <Space>
          {hasRole('sim_admin') && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/sim-resources/create')}
              >
                {t('buttons.addSim')}
              </Button>
              <Button
                icon={<IdcardOutlined />}
                onClick={() => navigate('/sim-resources/batch-import')}
              >
                {t('buttons.batchImport')}
              </Button>
            </>
          )}
          {(hasRole('sim_user') || hasRole('sim_admin')) && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => navigate('/sim-orders/create')}
            >
              {t('buttons.createOrder')}
            </Button>
          )}
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.totalSims')}
              value={stats?.total || 0}
              prefix={<IdcardOutlined />}
              valueStyle={{ color: 'var(--primary-color)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.available')}
              value={stats?.available || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: 'var(--success-color)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.active')}
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: 'var(--info-color)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.issues')}
              value={(stats?.suspended || 0) + (stats?.terminated || 0)}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: 'var(--error-color)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Status Breakdown */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.statusDistribution')}>
            <Row gutter={[8, 8]}>
              {Object.entries(stats?.byType || {}).map(([type, count]) => (
                <Col span={12} key={type}>
                  <Statistic
                    title={type}
                    value={count as number}
                    suffix="SIMs"
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.recentBatches')}>
            <Row gutter={[8, 8]}>
              {Object.entries(stats?.byBatch || {})
                .slice(0, 4)
                .map(([batch, count]) => (
                <Col span={12} key={batch}>
                  <Statistic
                    title={batch || t('dashboard.noBatch')}
                    value={count as number}
                    suffix="SIMs"
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card
            title={t('dashboard.recentSimActivity')}
            extra={
              <Button type="link" onClick={() => navigate('/sim-resources')}>
                {t('buttons.viewSimResources')}
              </Button>
            }
          >
            <Table
              dataSource={recentSims}
              columns={simColumns}
              pagination={false}
              size="small"
              loading={recentSimsLoading}
              rowKey="id"
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card
            title={t('dashboard.recentOrders')}
            extra={
              <Button type="link" onClick={() => navigate('/sim-orders')}>
                {t('buttons.viewAllOrders')}
              </Button>
            }
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              pagination={false}
              size="small"
              loading={recentOrdersLoading}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
