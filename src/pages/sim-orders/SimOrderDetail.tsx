import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Table,
  Timeline,
  Dropdown,
  Modal,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  StopOutlined,
  EyeOutlined,
  MoreOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../../services/api.service';
import { SimOrder, OrderStatus, LifecycleAction } from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const SimOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useKeycloak();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch order details
  const { data: response, isLoading } = useQuery(
    ['simOrder', id],
    () => apiService.getSimOrderById(id!),
    {
      enabled: !!id,
      refetchInterval: 15000,
    }
  );

  // Cancel order mutation
  const cancelMutation = useMutation(
    () => apiService.cancelSimOrder(id!),
    {
      onSuccess: () => {
        message.success(t('messages.orderCancelled'));
        queryClient.invalidateQueries(['simOrder', id]);
        queryClient.invalidateQueries('simOrders');
      },
      onError: (error: any) => {
        message.error(`${t('app.error')}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!response?.success || !response.data) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Title level={4}>{t('messages.orderNotFound')}</Title>
          <Button type="primary" onClick={() => navigate('/sim-orders')}>
            {t('buttons.viewAllOrders')}
          </Button>
        </div>
      </Card>
    );
  }

  const order = response.data;

  const getStatusColor = (status: string | OrderStatus) => {
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

  const getDisplayState = (order: SimOrder) => (order.status as any) || (order as any).state || 'Pending';
  const isPending = (order: SimOrder) => {
    const s = String(getDisplayState(order)).toLowerCase();
    return s === 'pending' || s === 'acknowledged';
  };

  const getPriorityColor = (priority?: string) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'blue',
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  const getSimStatusColor = (status?: string) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'available': return 'green';
      case 'allocated': return 'blue';
      case 'active': return 'cyan';
      case 'suspended': return 'orange';
      case 'terminated': return 'red';
      case 'retired': return 'default';
      default: return 'default';
    }
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: t('titles.cancelOrder'),
      content: t('messages.confirmCancelOrder', { id: order.id.substring(0, 8) }),
      onOk: () => cancelMutation.mutate(),
    });
  };

  const orderActions = [];
  if (isPending(order) && hasRole('sim_admin')) {
    orderActions.push({
      key: 'cancel',
      label: 'Cancel Order',
      icon: <StopOutlined />,
      danger: true,
      onClick: handleCancelOrder,
    });
  }

  const orderItemColumns = [
    {
      title: 'Resource',
      key: 'resource',
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontFamily: 'monospace' }}>
            {record.resource?.iccid || 'N/A'}
          </div>
          {record.resource?.type && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.resource.type}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: LifecycleAction) => (
        <Tag color="blue">{action}</Tag>
      ),
    },
    {
      title: 'Resource Status',
      key: 'resourceStatus',
      render: (_: any, record: any) => {
        const status = record.resource?.status || record.resource?.resourceStatus;
        return status ? (
          <Tag color={getSimStatusColor(status)}>{status}</Tag>
        ) : '-';
      },
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => state || 'Pending',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_: any, record: any) => (
        record.resource ? (
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/sim-resources/${record.resource.id}`)}
          />
        ) : null
      ),
    },
  ];

  const timelineItems = [
    {
      color: 'blue',
      children: (
        <>
          <div><strong>Order Created</strong></div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {new Date(order.orderDate).toLocaleString()}
          </div>
        </>
      ),
    },
    ...(order.completionDate ? [{
      color: String(getDisplayState(order)).toLowerCase() === 'completed' ? 'green' : 'red',
      children: (
        <>
          <div><strong>{getDisplayState(order) as string}</strong></div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {new Date(order.completionDate).toLocaleString()}
          </div>
        </>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/sim-orders')}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {t('titles.orderDetails')}
          </Title>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={t('titles.orderInformation')}
            extra={
              orderActions.length > 0 && (
                <Dropdown
                  menu={{ items: orderActions }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button icon={<MoreOutlined />}>
                    {t('common.actions')}
                  </Button>
                </Dropdown>
              )
            }
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label={t('order.orderId')}>
                <Text copyable code>
                  {order.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('order.status')}>
                <Tag color={getStatusColor(getDisplayState(order))}>
                  {getDisplayState(order) as string}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('order.priority')}>
                {order.priority ? (
                  <Tag color={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.totalItems')}>
                {order.orderItem?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.orderDate')}>
                {new Date(order.orderDate).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.expectedCompletion')}>
                {order.expectedCompletionDate 
                  ? new Date(order.expectedCompletionDate).toLocaleString() 
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('order.requestedStart')}>
                {order.requestedStartDate 
                  ? new Date(order.requestedStartDate).toLocaleString() 
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('order.completionDate')}>
                {order.completionDate 
                  ? new Date(order.completionDate).toLocaleString() 
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('common.description')} span={2}>
                {order.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.externalId')} span={2}>
                {order.externalId || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={t('titles.orderItems')} style={{ marginTop: 16 }}>
            <Table
              columns={orderItemColumns}
              dataSource={order.orderItem || []}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {order.note && order.note.length > 0 && (
            <Card title={t('titles.notes')} style={{ marginTop: 16 }}>
              {order.note.map((note, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>{note.author || 'System'}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {note.date ? new Date(note.date).toLocaleString() : ''}
                    </Text>
                  </div>
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 4,
                    borderLeft: '3px solid #1890ff'
                  }}>
                    {note.text}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><HistoryOutlined /> {t('titles.orderTimeline')}</>}>
            <Timeline items={timelineItems} />
          </Card>

          {order.relatedParty && order.relatedParty.length > 0 && (
            <Card title={t('titles.relatedParties')} style={{ marginTop: 16 }}>
              {order.relatedParty.map((party, index) => (
                <div key={index} style={{ marginBottom: 8 }}>
                  <div>
                    <Text strong>{party.name || party.id}</Text>
                  </div>
                  <div>
                    <Tag>{party.role}</Tag>
                  </div>
                </div>
              ))}
            </Card>
          )}

          <Card 
            title={t('titles.quickActions')} 
            style={{ marginTop: 16 }}
            size="small"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                block 
                onClick={() => navigate(`/sim-orders/create`)}
              >
                {t('buttons.createSimilarOrder')}
              </Button>
              <Button 
                block 
                onClick={() => navigate('/sim-orders')}
              >
                {t('buttons.viewAllOrders')}
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
;

export default SimOrderDetail;
