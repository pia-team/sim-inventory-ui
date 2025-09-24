import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Table,
  Modal,
  DatePicker,
  Divider,
  Tooltip,
  InputNumber,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import debounce from 'lodash/debounce';
import { useMutation, useQueryClient } from 'react-query';
import { useForm } from 'antd/es/form/Form';
import apiService from '../../services/api.service';
import { CreateSimOrderRequest, SimResource, LifecycleAction } from '../../types/sim.types';
import { getResourceStatusColor } from '../../utils/status';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface OrderItem {
  key: string;
  resourceId?: string;
  resource?: SimResource;
  action: LifecycleAction;
  quantity: number;
}

const CreateSimOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [form] = useForm();
  const { t } = useTranslation();
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [simSearchVisible, setSimSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<SimResource[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState<'iccid' | 'imsi' | 'msisdn'>('iccid');
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      searchSims(term);
    }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchType]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Initialize search state from URL params or localStorage on first mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const st = params.get('st');
    const q = params.get('q');
    const valid = (v: any): v is 'iccid' | 'imsi' | 'msisdn' => v === 'iccid' || v === 'imsi' || v === 'msisdn';
    if (valid(st)) {
      setSearchType(st);
    } else {
      const savedSt = localStorage.getItem('simOrderSearchType');
      if (valid(savedSt)) setSearchType(savedSt);
    }
    if (typeof q === 'string' && q.length) {
      setSearchTerm(q);
    } else {
      const savedQ = localStorage.getItem('simOrderSearchTerm');
      if (savedQ) setSearchTerm(savedQ);
    }
    // Do not auto-trigger search here to avoid surprise queries; user can press Enter or keep typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist search state to URL and localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('st', searchType);
    if (searchTerm) params.set('q', searchTerm); else params.delete('q');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    localStorage.setItem('simOrderSearchType', searchType);
    localStorage.setItem('simOrderSearchTerm', searchTerm);
  }, [searchType, searchTerm, location.pathname, location.search, navigate]);

  const createMutation = useMutation(
    (data: CreateSimOrderRequest) => apiService.createSimOrder(data),
    {
      onSuccess: (response) => {
        if (response.success) {
          message.success(t('messages.success', { defaultValue: 'Operation completed successfully.' }));
          queryClient.invalidateQueries('simOrders');
          navigate(`/sim-orders/${response.data?.id}`);
        } else {
          message.error(response.error?.message || t('app.error', { defaultValue: 'An error occurred.' }));
        }
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const searchSims = async (termInput: string) => {
    const term = (termInput || '').trim();
    if (!term) {
      setSearchResults([]);
      return;
    }

    // Basic validation per search type
    const isDigits = /^\d+$/;
    if (searchType === 'iccid' && (!isDigits.test(term) || term.length < 10)) {
      // Allow partial but at least 10 digits to avoid huge scans
      message.warning(t('createOrder.validation.iccidDigits', { defaultValue: 'Please enter at least 10 digits for ICCID' }));
      setSearchResults([]);
      return;
    }
    if (searchType === 'imsi' && (!isDigits.test(term) || term.length < 6)) {
      message.warning(t('createOrder.validation.imsiDigits', { defaultValue: 'Please enter at least 6 digits for IMSI' }));
      setSearchResults([]);
      return;
    }
    if (searchType === 'msisdn' && (!isDigits.test(term) || term.length < 7)) {
      message.warning(t('createOrder.validation.msisdnDigits', { defaultValue: 'Please enter a valid MSISDN (min 7 digits)' }));
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Build search criteria
      let criteria: any = { limit: 20, sort: '-createdDate' };
      if (searchType === 'iccid') criteria.iccid = term;
      else if (searchType === 'imsi') criteria.imsi = term;
      else criteria.characteristicFilters = [{ name: 'MSISDN', value: term }];

      const response = await apiService.getSimResources(criteria);
      
      if (response.success) {
        const raw: any = response.data as any;
        const list: SimResource[] = Array.isArray(raw) ? raw : (raw?.data || []);
        setSearchResults(list);
      } else {
        message.error(response.error?.message || t('app.error', { defaultValue: 'An error occurred.' }));
      }
    } catch (error) {
      message.error(t('app.error', { defaultValue: 'An error occurred.' }));
    } finally {
      setSearchLoading(false);
    }
  };

  const addOrderItem = (sim: SimResource) => {
    const exists = orderItems.some(item => item.resourceId === sim.id);
    if (exists) {
      message.warning(t('createOrder.alreadyAdded', { defaultValue: 'SIM already added to order' }));
      return;
    }

    const newItem: OrderItem = {
      key: `item-${Date.now()}`,
      resourceId: sim.id,
      resource: sim,
      action: LifecycleAction.ACTIVATE,
      quantity: 1,
    };

    setOrderItems([...orderItems, newItem]);
    setSimSearchVisible(false);
    setSearchResults([]);
  };

  const removeOrderItem = (key: string) => {
    setOrderItems(orderItems.filter(item => item.key !== key));
  };

  const updateOrderItem = (key: string, field: keyof OrderItem, value: any) => {
    setOrderItems(orderItems.map(item => 
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (values: any) => {
    if (orderItems.length === 0) {
      message.error('Please add at least one SIM to the order');
      return;
    }

    const request: CreateSimOrderRequest = {
      ...(values.description && String(values.description).trim() !== '' ? { description: values.description } : {}),
      ...(values.priority && String(values.priority).trim() !== '' ? { priority: values.priority } : {}),
      requestedStartDate: values.requestedStartDate?.toISOString(),
      requestedCompletionDate: values.requestedCompletionDate?.toISOString(),
      orderItem: orderItems.map(item => ({
        quantity: item.quantity,
        action: item.action,
        resource: item.resource,
      })),
      note: values.notes && String(values.notes).trim() !== '' ? [{
        text: values.notes,
        author: 'Current User', // This should come from Keycloak context
        date: new Date().toISOString(),
      }] : undefined,
    };

    createMutation.mutate(request);
  };

  const getAvailableActions = (sim: SimResource) => {
    const actions: LifecycleAction[] = [];
    const stateChar = String(getChar(sim, 'RESOURCE_STATE') || '').toLowerCase();
    const statusRaw = stateChar || (sim as any)?.status || (sim as any)?.resourceStatus || '';
    const status = String(statusRaw).toLowerCase();

    switch (status) {
      case 'available':
      case 'allocated':
      case 'reserved':
      case 'standby':
      case 'unknown':
        actions.push(LifecycleAction.ACTIVATE);
        break;
      case 'inuse':
      case 'active':
        actions.push(LifecycleAction.SUSPEND, LifecycleAction.TERMINATE);
        break;
      case 'suspended':
        actions.push(LifecycleAction.ACTIVATE, LifecycleAction.TERMINATE);
        break;
      case 'terminated':
      case 'cancelled':
        actions.push(LifecycleAction.RELEASE);
        break;
      case 'disposed':
      case 'completed':
      case 'retired':
      case 'alarm':
        // no actions
        break;
      default:
        break;
    }
    
    return actions;
  };

  const getChar = (resource: SimResource | undefined, key: string) =>
    resource?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

  const getDisabledReason = (sim: SimResource): string | null => {
    if (orderItems.some(i => i.resourceId === sim.id)) {
      return 'Already added to order';
    }
    const actions = getAvailableActions(sim);
    if (actions.length === 0) {
      const statusRaw = (sim as any)?.resourceStatus || (sim as any)?.status || 'unknown';
      return t('createOrder.notEligible', { status: String(statusRaw), defaultValue: `Not eligible (status: ${String(statusRaw)})` });
    }
    return null;
  };

  const orderItemColumns = [
    {
      title: 'ICCID',
      key: 'iccid',
      width: 100,
      ellipsis: true as any,
      render: (_: any, record: OrderItem) => (
        <span style={{ fontFamily: 'monospace' }}>
          {getChar(record.resource, 'ICCID') || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 52,
      responsive: ['xxl'] as any,
      ellipsis: true as any,
      render: (_: any, record: OrderItem) => (record.resource as any)?.resourceStatus || (record.resource as any)?.status || '-',
    },
    {
      title: 'State',
      key: 'state',
      width: 52,
      responsive: ['xl'] as any,
      ellipsis: true as any,
      render: (_: any, record: OrderItem) => getChar(record.resource, 'RESOURCE_STATE') || '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 132,
      render: (_: any, record: OrderItem) => (
        <Select
          value={record.action}
          size="small"
          style={{ width: 128 }}
          dropdownMatchSelectWidth={false}
          onChange={(value) => updateOrderItem(record.key, 'action', value)}
        >
          {getAvailableActions(record.resource!).map(action => (
            <Option key={action} value={action}>{action}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 36,
      render: (_: any, record: OrderItem) => (
        <InputNumber
          min={1}
          value={record.quantity}
          size="small"
          style={{ width: 34 }}
          onChange={(val) => updateOrderItem(record.key, 'quantity', Number(val) || 1)}
        />
      ),
    },
    {
      title: 'Delete',
      key: 'actions',
      width: 28,
      render: (_: any, record: OrderItem) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeOrderItem(record.key)}
          style={{ padding: 0, minWidth: 0 }}
        />
      ),
    },
  ];

  const simSearchColumns = [
    {
      title: 'ICCID',
      key: 'iccid',
      width: 200,
      ellipsis: true as any,
      render: (_: any, record: SimResource) => (
        <span style={{ fontFamily: 'monospace' }}>{getChar(record, 'ICCID') || '-'}</span>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      responsive: ['md'] as any,
      render: (_: any, record: SimResource) => {
        const simTypeChar = getChar(record, 'SIMType');
        const t = simTypeChar || (record as any)['@type'] || (record as any)?.resourceSpecification?.name || '-';
        return String(t);
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: any, record: SimResource) => {
        const s = (record as any)?.resourceStatus || (record as any)?.status || '-';
        return <Tag color={getResourceStatusColor(String(s))}>{s}</Tag>;
      },
    },
    {
      title: 'State',
      key: 'state',
      width: 120,
      responsive: ['lg'] as any,
      render: (_: any, record: SimResource) => {
        const state = getChar(record, 'RESOURCE_STATE') || '-';
        return <Tag color={getResourceStatusColor(String(state))}>{state}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: SimResource) => (
        (() => {
          const reason = getDisabledReason(record);
          const btn = (
            <Button
              type="primary"
              size="small"
              onClick={() => addOrderItem(record)}
              disabled={!!reason}
            >
              Add
            </Button>
          );
          // Tooltip does not work directly on disabled Button; wrap with span
          return reason ? (
            <Tooltip title={reason}>
              <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>{btn}</span>
            </Tooltip>
          ) : (
            btn
          );
        })()
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/sim-orders')}
          >
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {t('order.createNew', { defaultValue: 'Create New Order' })}
          </Title>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={13} lg={10} xl={10} xxl={10}>
          <Card title={t('titles.orderInformation', { defaultValue: 'Order Details' })}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('order.priority', { defaultValue: 'Priority' })}
                    name="priority"
                  >
                    <Select placeholder={t('order.priority', { defaultValue: 'Priority' })}>
                      <Option value="high">{t('order.priorityHigh', { defaultValue: 'High' })}</Option>
                      <Option value="medium">{t('order.priorityMedium', { defaultValue: 'Medium' })}</Option>
                      <Option value="low">{t('order.priorityLow', { defaultValue: 'Low' })}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('order.requestedStartDate', { defaultValue: 'Requested Start Date' })}
                    name="requestedStartDate"
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      placeholder={t('order.requestedStartDate', { defaultValue: 'Requested Start Date' })}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('order.requestedCompletionDate', { defaultValue: 'Requested Completion Date' })}
                    name="requestedCompletionDate"
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      placeholder={t('order.requestedCompletionDate', { defaultValue: 'Requested Completion Date' })}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={t('common.description', { defaultValue: 'Description' })}
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder={t('common.description', { defaultValue: 'Description' })}
                />
              </Form.Item>

              <Form.Item
                label={t('titles.notes', { defaultValue: 'Notes' })}
                name="notes"
              >
                <TextArea
                  rows={3}
                  placeholder={t('titles.notes', { defaultValue: 'Notes' })}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={11} lg={14} xl={14} xxl={14}>
          <Card
            title={t('order.summary', { defaultValue: 'Order Summary' })}
            extra={
              <Space>
                <Button
                  type="default"
                  danger
                  onClick={() => setOrderItems([])}
                  disabled={orderItems.length === 0}
                >
                  {t('actions.clearAll', { defaultValue: 'Clear All' })}
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setSimSearchVisible(true)}
                >
                  {t('buttons.addSim', { defaultValue: 'Add SIM' })}
                </Button>
              </Space>
            }
          >
            {orderItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Typography.Text type="secondary">No SIMs added yet</Typography.Text>
              </div>
            ) : (
              <Table
                columns={orderItemColumns}
                dataSource={orderItems}
                pagination={false}
                size="small"
                rowKey="key"
                scroll={{ x: 'max-content' }}
                tableLayout="fixed"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button
            onClick={() => navigate('/sim-orders')}
            disabled={createMutation.isLoading}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={createMutation.isLoading}
            disabled={orderItems.length === 0}
          >
            {t('buttons.createOrder', { defaultValue: 'Create Order' })}
          </Button>
        </Space>
      </div>

      {/* SIM Search Modal */}
      <Modal
        title={t('order.searchAndAdd', { defaultValue: 'Search and Add SIMs' })}
        open={simSearchVisible}
        onCancel={() => setSimSearchVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 8 }}>
          <Row gutter={8}>
            <Col flex="160px">
              <Select value={searchType} onChange={(v) => setSearchType(v)} style={{ width: '100%' }}>
                <Option value="iccid">ICCID</Option>
                <Option value="imsi">IMSI</Option>
                <Option value="msisdn">MSISDN</Option>
              </Select>
            </Col>
            <Col flex="auto">
              <Input.Search
                placeholder={searchType === 'iccid' ? t('placeholders.searchByIccid', { defaultValue: 'Search by ICCID' }) : (searchType === 'imsi' ? t('placeholders.searchByImsi', { defaultValue: 'Search by IMSI' }) : t('placeholders.searchOrders', { defaultValue: 'Search...' }))}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); debouncedSearch(e.target.value); }}
                onSearch={(v) => { setSearchTerm(v); searchSims(v); }}
                enterButton={<SearchOutlined />}
                loading={searchLoading}
                allowClear
              />
            </Col>
            <Col>
              <Button
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setSearchType('iccid');
                  setSearchTerm('');
                  setSearchResults([]);
                  localStorage.removeItem('simOrderSearchType');
                  localStorage.removeItem('simOrderSearchTerm');
                  const params = new URLSearchParams(location.search);
                  params.delete('st');
                  params.delete('q');
                  navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
                }}
              >
                {t('common.clear', { defaultValue: 'Clear' })}
              </Button>
            </Col>
          </Row>
        </div>
        <div style={{ marginBottom: 8, opacity: 0.7 }}>
          {searchResults.length > 0 ? t('order.searchResultsCount', { count: searchResults.length, defaultValue: '{{count}} result(s)' }) : t('order.searchHint', { defaultValue: 'Search for SIMs to add to order' })}
        </div>

        <Table
          columns={simSearchColumns}
          dataSource={searchResults}
          rowKey="id"
          pagination={false}
          loading={searchLoading}
          size="small"
          scroll={{ x: 'max-content' }}
          tableLayout="fixed"
          locale={{ emptyText: t('order.searchHint', { defaultValue: 'Search for SIMs to add to order' }) }}
        />
      </Modal>
    </div>
  );
};

export default CreateSimOrder;
