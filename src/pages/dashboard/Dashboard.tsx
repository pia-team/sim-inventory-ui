import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Space, Button } from 'antd';
import {
  PlusOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api.service';
import { SimOrder } from '../../types/sim.types';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useKeycloak } from '../../contexts/KeycloakContext';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useKeycloak();
  const { t } = useTranslation();

  // Fetch statistics
  const { data: statsResponse, isLoading: statsLoading } = useQuery(
    'simStatistics',
    () => apiService.getSimStatistics(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch recent SIM resources
  const { data: recentSimsResponse, isLoading: recentSimsLoading } = useQuery(
    'recentSims',
    () => apiService.getSimResources({ limit: 10, sort: 'createdDate'}),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch recent orders
  const { data: recentOrdersResponse, isLoading: recentOrdersLoading } = useQuery(
    'recentOrders',
    () => apiService.getSimOrders({ limit: 10, sort: 'orderDate'}),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const stats = statsResponse?.data;
  const recentSims = recentSimsResponse?.data?.data || [];
  const recentOrders = recentOrdersResponse?.data?.data || [];

  

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
          {iccid || record?.name || record?.id}
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
          <Tag color={isEsim ? 'purple' : 'blue'}>
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
        const s = record?.status || record?.resourceStatus || '-';
        const colorMap: Record<string, string> = {
          available: 'green',
          allocated: 'blue',
          active: 'cyan',
          suspended: 'orange',
          terminated: 'red',
          retired: 'default',
        };
        const color = colorMap[String(s).toLowerCase()] || 'default';
        return (
          <Tag color={color}>
            {s}
          </Tag>
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
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.available')}
              value={stats?.available || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.active')}
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('dashboard.issues')}
              value={(stats?.suspended || 0) + (stats?.terminated || 0)}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
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
