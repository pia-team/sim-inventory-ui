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
import { formatDateTime } from '../../utils/format';
import { getOrderStatusColor, getResourceStatusColor } from '../../utils/status';

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

  const getStatusColor = (status: string | OrderStatus) => getOrderStatusColor(String(status));

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

  const getSimStatusColor = (status?: string) => getResourceStatusColor(status);

  const getChar = (obj: any, key: string) =>
    obj?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

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
      label: t('titles.cancelOrder', { defaultValue: 'Cancel Order' }),
      icon: <StopOutlined />,
      danger: true,
      onClick: handleCancelOrder,
    });
  }

  const orderItemColumns = [
    {
      title: t('order.columns.resource', { defaultValue: 'Resource' }),
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
      title: t('order.columns.action', { defaultValue: 'Action' }),
      dataIndex: 'action',
      key: 'action',
      render: (action: LifecycleAction) => (
        <Tag color="blue">{action}</Tag>
      ),
    },
    {
      title: t('order.columns.resourceStatus', { defaultValue: 'Resource Status' }),
      key: 'status',
      render: (_: any, record: any) => {
        const status = record.resource?.resourceStatus || record.resource?.status;
        return status ? (<Tag color={getSimStatusColor(status)}>{status}</Tag>) : '-';
      },
    },
    {
      title: t('order.columns.state', { defaultValue: 'State' }),
      key: 'state',
      render: (_: any, record: any) => {
        const state = getChar(record.resource, 'RESOURCE_STATE');
        return state ? (<Tag color={getSimStatusColor(state)}>{state}</Tag>) : '-';
      },
    },
    {
      title: t('order.columns.quantity', { defaultValue: 'Quantity' }),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: t('order.columns.state', { defaultValue: 'State' }),
      dataIndex: 'state',
      key: 'state',
      render: (state: string) => state || 'Pending',
    },
    {
      title: t('order.columns.actions', { defaultValue: 'Actions' }),
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
          <div><strong>{t('order.timeline.created', { defaultValue: 'Order Created' })}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(order.orderDate)}
          </Text>
        </>
      ),
    },
    ...(order.completionDate ? [{
      color: String(getDisplayState(order)).toLowerCase() === 'completed' ? 'green' : 'red',
      children: (
        <>
          <div><strong>{getDisplayState(order) as string}</strong></div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(order.completionDate)}
          </Text>
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
                {formatDateTime(order.orderDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.expectedCompletion')}>
                {order.expectedCompletionDate 
                  ? formatDateTime(order.expectedCompletionDate)
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('order.requestedStart')}>
                {order.requestedStartDate 
                  ? formatDateTime(order.requestedStartDate)
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('order.completionDate')}>
                {order.completionDate 
                  ? formatDateTime(order.completionDate)
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label={t('common.description')}>
                {order.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('order.externalId')}>
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
                      {formatDateTime(note.date)}
                    </Text>
                  </div>
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: 'var(--table-row-hover-bg)', 
                    borderRadius: 4,
                    borderLeft: '3px solid var(--primary-color)'
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
