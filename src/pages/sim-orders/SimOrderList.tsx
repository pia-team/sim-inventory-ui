import React, { useState, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Dropdown,
  Modal,
  message,
  Row,
  Col,
  DatePicker,
  Typography,
} from 'antd';

import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  EyeOutlined,
  StopOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { CSVLink } from 'react-csv';
import apiService from '../../services/api.service';
import { SimOrder, OrderStatus } from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/format';
import { getOrderStatusColor } from '../../utils/status';
import { getOrderSortPref } from '../../utils/prefs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;

const SimOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole, authenticated, token } = useKeycloak();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Preferences (from Settings)
  const preferredOrderSort = getOrderSortPref();

  const [searchParams, setSearchParams] = useState<{
    status?: string[];
    limit?: number;
    offset?: number;
    sort?: string;
  }>({
    limit: 20,
    offset: 0,
    sort: preferredOrderSort,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterVisible, setFilterVisible] = useState(false);

  // Fetch SIM orders
  const { data: response, isLoading, refetch } = useQuery(
    ['simOrders', token, searchParams, currentPage, pageSize],
    () => apiService.getSimOrders({
      ...searchParams,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }),
    {
      keepPreviousData: true,
      enabled: authenticated && !!token,
      onError: (error: any) => {
        message.error(`${t('app.error')}: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
        // eslint-disable-next-line no-console
        console.error('simOrders error', error);
      },
    }
  );

  // Cancel order mutation
  const cancelMutation = useMutation(
    (id: string) => apiService.cancelSimOrder(id),
    {
      onSuccess: () => {
        message.success(t('messages.orderCancelled'));
        queryClient.invalidateQueries('simOrders');
      },
      onError: (error: any) => {
        message.error(`${t('app.error')}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const apiData = response?.data as any;
  const toArray = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };
  const orders = toArray(apiData);
  const totalCount = typeof apiData?.totalCount === 'number'
    ? apiData.totalCount
    : (typeof apiData?.total === 'number' ? apiData.total : orders.length);

  const handleSearch = useCallback((value: string) => {
    // For orders, we might search by ID or description
    setSearchParams(prev => ({
      ...prev,
      // Add search functionality when API supports it
    }));
    setCurrentPage(1);
  }, []);

  const handleFilterChange = (field: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1);
  };

  const handleCancelOrder = (order: SimOrder) => {
    Modal.confirm({
      title: t('titles.cancelOrder'),
      content: t('messages.confirmCancelOrder', { id: order.id.substring(0, 8) }),
      onOk: () => cancelMutation.mutate(order.id),
    });
  };

  const getStatusColor = (status: string) => getOrderStatusColor(status);

  const getDisplayState = (order: SimOrder) => (order.status as any) || (order as any).state || 'Pending';
  const isPending = (order: SimOrder) => {
    const s = String(getDisplayState(order)).toLowerCase();
    return s === 'pending' || s === 'acknowledged';
  };

  const getOrderActions = (order: SimOrder) => {
    const actions = [
      {
        key: 'view',
        label: t('actions.view'),
        icon: <EyeOutlined />,
        onClick: () => navigate(`/sim-orders/${order.id}`),
      },
    ];

    if (isPending(order) && hasRole('sim_admin')) {
      actions.push({
        key: 'cancel',
        label: t('titles.cancelOrder'),
        icon: <StopOutlined />,
        onClick: () => handleCancelOrder(order),
      });
    }

    return actions;
  };

  const columns = [
    {
      title: t('order.orderId'),
      dataIndex: 'id',
      key: 'id',
      width: 200,
      fixed: 'left' as const,
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      ellipsis: true,
      render: (id: string) => (
        <Button
          type="link"
          onClick={() => navigate(`/sim-orders/${id}`)}
          style={{ padding: 0, fontFamily: 'monospace' }}
        >
          {id}
        </Button>
      ),
    },
    {
      title: t('order.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: SimOrder) => {
        const st = getDisplayState(record) as string;
        return (
          <Tag color={getStatusColor(st)}>
            {st}
          </Tag>
        );
      },
    },
    {
      title: t('order.items'),
      dataIndex: 'orderItem',
      key: 'orderItem',
      width: 60,
      align: 'center' as const,
      render: (items: any[]) => items?.length || 0,
    },
    {
      title: t('common.description'),
      dataIndex: 'description',
      key: 'description',
      width: 160,
      ellipsis: true,
      onCell: () => ({ style: { whiteSpace: 'nowrap' } }),
      responsive: ['xl'] as any,
      render: (description: string) => (
        description ? (
          <Typography.Paragraph style={{ margin: 0 }} ellipsis={{ rows: 1, tooltip: description }}>
            {description}
          </Typography.Paragraph>
        ) : '-'
      ),
    },
    {
      title: t('order.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      align: 'center' as const,
      render: (priority: string) => {
        const colors = {
          high: 'red',
          medium: 'orange',
          low: 'blue',
        };
        return priority ? (
          <Tag color={colors[priority as keyof typeof colors] || 'default'} style={{ fontSize: 12, padding: '0 6px' }}>
            {priority}
          </Tag>
        ) : '-';
      },
    },
    {
      title: t('order.orderDate'),
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 160,
      align: 'center' as const,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: t('order.expectedCompletion'),
      dataIndex: 'expectedCompletionDate',
      key: 'expectedCompletionDate',
      width: 160,
      align: 'center' as const,
      render: (date: string) => date ? formatDateTime(date) : '-',
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 56,
      fixed: 'right' as const,
      render: (_: any, record: SimOrder) => {
        const actions = getOrderActions(record);
        const items = actions.map(a => ({ key: a.key, label: a.label, icon: a.icon, danger: (a as any).danger }));
        const onClick = ({ key }: { key: string }) => {
          const found = actions.find(a => a.key === key);
          (found as any)?.onClick?.();
        };
        return (
          <Dropdown
            menu={{ items, onClick }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="default"
              shape="circle"
              icon={<MoreOutlined />}
              size="middle"
              title="Actions"
            />
          </Dropdown>
        );
      },
    },
  ];

  const csvData = orders.map(order => ({
    OrderID: order.id,
    Status: order.status,
    ItemCount: order.orderItem?.length || 0,
    Description: order.description || '',
    Priority: order.priority || '',
    OrderDate: new Date(order.orderDate).toISOString(),
    ExpectedCompletion: order.expectedCompletionDate ? new Date(order.expectedCompletionDate).toISOString() : '',
    CompletionDate: order.completionDate ? new Date(order.completionDate).toISOString() : '',
  }));

  if (isLoading && !response) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{t('nav.orders')}</Title>
        
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input.Search
                placeholder={t('placeholders.searchOrders')}
                style={{ width: 250 }}
                onSearch={handleSearch}
                enterButton={<SearchOutlined />}
              />
              
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(!filterVisible)}
              >
                {t('common.filters')}
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                {t('common.refresh')}
              </Button>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <CSVLink
                data={csvData}
                filename={`sim-orders-${new Date().toISOString().split('T')[0]}.csv`}
              >
                <Button icon={<ExportOutlined />}>
                  {t('buttons.exportCsv')}
                </Button>
              </CSVLink>
              
              {(hasRole('sim_user') || hasRole('sim_admin')) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/sim-orders/create')}
                >
                  {t('buttons.createOrder')}
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {filterVisible && (
          <Card style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="Status"
                  style={{ width: '100%' }}
                  mode="multiple"
                  onChange={(value) => handleFilterChange('status', value.length ? value : undefined)}
                  allowClear
                >
                  {Object.values(OrderStatus).map(status => (
                    <Option key={status} value={status}>
                      <Tag color={getStatusColor(status)}>{String(status)}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={[t('filters.orderFrom'), t('filters.orderTo')]}
                  onChange={(dates) => {
                    // Add date filtering when API supports it
                  }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={isLoading}
          tableLayout="fixed"
          size="small"
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
            onChange: setCurrentPage,
            onShowSizeChange: (current, size) => {
              setCurrentPage(current);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1300 }}
        />
      </Card>
    </div>
  );
};

export default SimOrderList;
