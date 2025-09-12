import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from 'react-query';
import { useForm } from 'antd/es/form/Form';
import apiService from '../../services/api.service';
import { CreateSimOrderRequest, SimResource, LifecycleAction } from '../../types/sim.types';

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
  const queryClient = useQueryClient();
  const [form] = useForm();
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [simSearchVisible, setSimSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<SimResource[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const createMutation = useMutation(
    (data: CreateSimOrderRequest) => apiService.createSimOrder(data),
    {
      onSuccess: (response) => {
        if (response.success) {
          message.success('Order created successfully');
          queryClient.invalidateQueries('simOrders');
          navigate(`/sim-orders/${response.data?.id}`);
        } else {
          message.error(response.error?.message || 'Failed to create order');
        }
      },
      onError: (error: any) => {
        message.error(`Failed to create order: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const searchSims = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await apiService.getSimResources({
        iccid: searchTerm,
        limit: 20,
      });
      
      if (response.success) {
        setSearchResults(response.data?.data || []);
      }
    } catch (error) {
      message.error('Failed to search SIMs');
    } finally {
      setSearchLoading(false);
    }
  };

  const addOrderItem = (sim: SimResource) => {
    const exists = orderItems.some(item => item.resourceId === sim.id);
    if (exists) {
      message.warning('SIM already added to order');
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
    const statusRaw = (sim as any)?.status || (sim as any)?.resourceStatus || '';
    const status = String(statusRaw).toLowerCase();

    switch (status) {
      case 'available':
      case 'allocated':
        actions.push(LifecycleAction.ACTIVATE);
        break;
      case 'active':
        actions.push(LifecycleAction.SUSPEND, LifecycleAction.TERMINATE);
        break;
      case 'suspended':
        actions.push(LifecycleAction.ACTIVATE, LifecycleAction.TERMINATE);
        break;
      case 'terminated':
        actions.push(LifecycleAction.RELEASE);
        break;
      default:
        break;
    }
    
    return actions;
  };

  const getChar = (resource: SimResource | undefined, key: string) =>
    resource?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

  const orderItemColumns = [
    {
      title: 'ICCID',
      key: 'iccid',
      render: (_: any, record: OrderItem) => (
        <span style={{ fontFamily: 'monospace' }}>
          {getChar(record.resource, 'ICCID') || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: OrderItem) => (record.resource as any)?.resourceStatus || (record.resource as any)?.status || '-',
    },
    {
      title: 'State',
      key: 'state',
      render: (_: any, record: OrderItem) => getChar(record.resource, 'RESOURCE_STATE') || '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: OrderItem) => (
        <Select
          value={record.action}
          style={{ width: 120 }}
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
      render: (_: any, record: OrderItem) => (
        <Input
          type="number"
          min={1}
          value={record.quantity}
          style={{ width: 80 }}
          onChange={(e) => updateOrderItem(record.key, 'quantity', parseInt(e.target.value) || 1)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: OrderItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeOrderItem(record.key)}
        />
      ),
    },
  ];

  const simSearchColumns = [
    {
      title: 'ICCID',
      dataIndex: 'iccid',
      key: 'iccid',
      render: (_: any, record: SimResource) => (
        <span style={{ fontFamily: 'monospace' }}>{getChar(record, 'ICCID') || '-'}</span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: SimResource) => (record as any)?.resourceStatus || (record as any)?.status || '-',
    },
    {
      title: 'State',
      key: 'state',
      render: (_: any, record: SimResource) => getChar(record, 'RESOURCE_STATE') || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SimResource) => (
        <Button
          type="primary"
          size="small"
          onClick={() => addOrderItem(record)}
        >
          Add
        </Button>
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
            Back
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Create New Order
          </Title>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Order Details">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                  >
                    <Select placeholder="Select priority">
                      <Option value="high">High</Option>
                      <Option value="medium">Medium</Option>
                      <Option value="low">Low</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Requested Start Date"
                    name="requestedStartDate"
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      placeholder="Select start date"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Requested Completion Date"
                    name="requestedCompletionDate"
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      placeholder="Select completion date"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Description"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="Enter order description"
                />
              </Form.Item>

              <Form.Item
                label="Notes"
                name="notes"
              >
                <TextArea
                  rows={3}
                  placeholder="Enter any additional notes"
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Order Summary"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setSimSearchVisible(true)}
              >
                Add SIM
              </Button>
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
            Cancel
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={createMutation.isLoading}
            disabled={orderItems.length === 0}
          >
            Create Order
          </Button>
        </Space>
      </div>

      {/* SIM Search Modal */}
      <Modal
        title="Search and Add SIMs"
        open={simSearchVisible}
        onCancel={() => setSimSearchVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by ICCID"
            onSearch={searchSims}
            enterButton={<SearchOutlined />}
            loading={searchLoading}
          />
        </div>

        <Table
          columns={simSearchColumns}
          dataSource={searchResults}
          rowKey="id"
          pagination={false}
          loading={searchLoading}
          size="small"
          locale={{ emptyText: 'Search for SIMs to add to order' }}
        />
      </Modal>
    </div>
  );
};

export default CreateSimOrder;
