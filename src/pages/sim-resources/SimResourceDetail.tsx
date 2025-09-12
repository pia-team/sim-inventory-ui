import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Divider,
  message,
  Typography,
  Row,
  Col,
  Timeline,
  Dropdown,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  MoreOutlined,
  HistoryOutlined,
  UnlockOutlined,
  RestOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../../services/api.service';
import { SimStatus, LifecycleAction, RESOURCE_STATUS_VALUES } from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SimResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useKeycloak();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<LifecycleAction | null>(null);

  // Fetch SIM resource details
  const { data: response, isLoading } = useQuery(
    ['simResource', id],
    () => apiService.getSimResourceById(id!),
    {
      enabled: !!id,
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: any) => apiService.updateSimResource(id!, data),
    {
      onSuccess: () => {
        message.success('SIM resource updated successfully');
        queryClient.invalidateQueries(['simResource', id]);
        setEditModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to update SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  // Lifecycle mutations
  const activateMutation = useMutation(
    () => apiService.activateSimResource(id!),
    {
      onSuccess: () => {
        message.success('SIM activated successfully');
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to activate SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const suspendMutation = useMutation(
    (reason?: string) => apiService.suspendSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success('SIM suspended successfully');
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to suspend SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const terminateMutation = useMutation(
    (reason?: string) => apiService.terminateSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success('SIM terminated successfully');
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to terminate SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const releaseMutation = useMutation(
    () => apiService.releaseSimResource(id!),
    {
      onSuccess: () => {
        message.success('SIM released successfully');
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to release SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const retireMutation = useMutation(
    (reason?: string) => apiService.retireSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success('SIM retired successfully');
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`Failed to retire SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const deleteMutation = useMutation(
    () => apiService.deleteSimResource(id!),
    {
      onSuccess: () => {
        message.success('SIM deleted successfully');
        navigate('/sim-resources');
      },
      onError: (error: any) => {
        message.error(`Failed to delete SIM: ${error.response?.data?.message || error.message}`);
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
          <Title level={4}>{t('messages.simNotFound')}</Title>
          <Button type="primary" onClick={() => navigate('/sim-resources')}>
            {t('common.back')}
          </Button>
        </div>
      </Card>
    );
  }

  const sim = response.data;

  // Helper to read a characteristic by name (e.g., ICCID, IMSI, BatchId)
  const getChar = (obj: any, key: string) =>
    obj?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

  const getStatusColor = (status?: string | SimStatus) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      // New ResourceStatus values
      case 'available': return 'green';
      case 'reserved': return 'gold';
      case 'standby': return 'cyan';
      case 'suspended': return 'orange';
      case 'alarm': return 'red';
      case 'completed': return 'purple';
      case 'cancelled': return 'default';
      case 'unknown': return 'default';
      // Legacy values fallback
      case 'allocated': return 'blue';
      case 'active': return 'cyan';
      case 'terminated': return 'red';
      case 'retired': return 'default';
      default: return 'default';
    }
  };

  const getDisplayStatus = () => (sim as any).resourceStatus || '-';

  const formatDate = (val?: string) => (val ? new Date(val).toLocaleString() : '-');

  const getAvailableActions = () => {
    const actions = [] as any[];
    const status = String((sim as any).resourceStatus || '').toLowerCase();

    switch (status) {
      case 'available':
      case 'standby':
      case 'unknown':
        actions.push({
          key: 'activate',
          label: 'Activate',
          icon: <PlayCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.ACTIVATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => {
            setSelectedAction(LifecycleAction.RETIRE);
            setActionModalVisible(true);
          },
        });
        break;
      case 'reserved':
        actions.push({
          key: 'suspend',
          label: 'Suspend',
          icon: <PauseCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.SUSPEND);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'terminate',
          label: 'Terminate',
          icon: <StopOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.TERMINATE);
            setActionModalVisible(true);
          },
        });
        break;
      case 'suspended':
        actions.push({
          key: 'activate',
          label: 'Reactivate',
          icon: <PlayCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.ACTIVATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'terminate',
          label: 'Terminate',
          icon: <StopOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.TERMINATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => {
            setSelectedAction(LifecycleAction.RETIRE);
            setActionModalVisible(true);
          },
        });
        break;
      case 'cancelled':
        actions.push({
          key: 'release',
          label: 'Release',
          icon: <UnlockOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.RELEASE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => {
            setSelectedAction(LifecycleAction.RETIRE);
            setActionModalVisible(true);
          },
        });
        break;
      case 'completed':
        break;
    }

    if (status === 'available' && hasRole('sim_admin')) {
      actions.push({
        type: 'divider' as const,
      });
      actions.push({
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: 'Delete SIM Resource',
            content: `Are you sure you want to delete SIM ${getChar(sim, 'ICCID')}? This action cannot be undone.`,
            okType: 'danger',
            onOk: () => deleteMutation.mutate(),
          });
        },
      });
    }

    return actions;
  };

  const handleEdit = () => {
    form.setFieldsValue({
      description: sim.description || '',
      imsi: getChar(sim, 'IMSI') || '',
      name: sim.name || getChar(sim, 'ICCID') || '',
      category: (sim as any)?.category || '',
      administrativeState: (sim as any)?.administrativeState || '',
      operationalState: (sim as any)?.operationalState || '',
      usageState: (sim as any)?.usageState || '',
      resourceStatus: String(getDisplayStatus() || '').toLowerCase(),
      characteristics: (sim as any)?.resourceCharacteristic?.map((c: any) => ({
        name: c?.name,
        value: c?.value,
        valueType: c?.valueType || 'string',
      })) || [],
    });
    setEditModalVisible(true);
  };

  const handleUpdate = (values: any) => {
    // Start from form-provided list so user explicitly controls add/update/delete
    let rc: any[] = Array.isArray(values.characteristics)
      ? values.characteristics
          .filter((x: any) => x && x.name && (x.value !== undefined && x.value !== ''))
          .map((x: any) => ({ name: x.name, value: x.value, valueType: x.valueType || 'string' }))
      : [];

    // Merge IMSI convenience field into characteristics (add/update/remove)
    rc = rc.filter((c) => String(c.name).toLowerCase() !== 'imsi');
    if (values.imsi !== undefined && String(values.imsi).trim() !== '') {
      rc.push({ name: 'IMSI', value: values.imsi, valueType: 'string' });
    }

    // Deduplicate by name (case-insensitive); keep last occurrence
    const dedup = new Map<string, any>();
    rc.forEach((c) => {
      const key = String(c.name || '').trim();
      if (!key) return;
      dedup.set(key.toLowerCase(), { name: key, value: c.value, valueType: c.valueType || 'string' });
    });
    rc = Array.from(dedup.values());

    const payload: any = {
      description: values.description,
      resourceCharacteristic: rc, // send full list; empty array clears all characteristics
    };

    if (values.name !== undefined && String(values.name).trim() !== '') payload.name = values.name;
    if (values.category !== undefined && String(values.category).trim() !== '') payload.category = values.category;
    if (values.administrativeState !== undefined && String(values.administrativeState).trim() !== '') payload.administrativeState = values.administrativeState;
    if (values.operationalState !== undefined && String(values.operationalState).trim() !== '') payload.operationalState = values.operationalState;
    if (values.usageState !== undefined && String(values.usageState).trim() !== '') payload.usageState = values.usageState;
    if (values.resourceStatus !== undefined && String(values.resourceStatus).trim() !== '') payload.resourceStatus = values.resourceStatus;

    updateMutation.mutate(payload);
  };

  const handleLifecycleAction = (values: any) => {
    const reason = values.reason;
    
    switch (selectedAction) {
      case LifecycleAction.ACTIVATE:
        activateMutation.mutate();
        break;
      case LifecycleAction.SUSPEND:
        suspendMutation.mutate(reason);
        break;
      case LifecycleAction.TERMINATE:
        terminateMutation.mutate(reason);
        break;
      case LifecycleAction.RELEASE:
        releaseMutation.mutate();
        break;
      case LifecycleAction.RETIRE:
        retireMutation.mutate(reason);
        break;
    }
  };

  const actionLabels = {
    [LifecycleAction.ACTIVATE]: 'Activate',
    [LifecycleAction.SUSPEND]: 'Suspend',
    [LifecycleAction.TERMINATE]: 'Terminate',
    [LifecycleAction.RELEASE]: 'Release',
    [LifecycleAction.RETIRE]: 'Retire',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/sim-resources')}
          >
            {t('common.back')}
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {t('titles.simResourceDetails')}
          </Title>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={t('titles.basicInformation')}
            extra={
              <Space>
                {hasRole('sim_admin') && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    {t('actions.edit')}
                  </Button>
                )}
                {getAvailableActions().length > 0 && (
                  <Dropdown
                    menu={{ items: getAvailableActions() }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button icon={<MoreOutlined />}>
                      {t('common.actions')}
                    </Button>
                  </Dropdown>
                )}
              </Space>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label={t('sim.iccid')}>
                <Text
                  copyable={!!(getChar(sim, 'ICCID') || '-')} 
                  code={!!(getChar(sim, 'ICCID') || '-')} 
               >
                  {getChar(sim, 'ICCID') || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.imsi')}>
                <Text copyable={!!getChar(sim, 'IMSI')} code={!!getChar(sim, 'IMSI')}>
                  {getChar(sim, 'IMSI') || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.type')}>
                <Tag color={String(getChar(sim, 'SIMType') || (sim as any)?.type || '').toLowerCase().includes('esim') ? 'cyan' : 'blue'}>
                  {getChar(sim, 'SIMType') || (sim as any)?.type || (sim as any)['@type'] || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.status')}>
                <Tag color={getStatusColor(getDisplayStatus())}>
                  {getDisplayStatus()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.state')}>
                <Tag color={getStatusColor(String(getChar(sim, 'RESOURCE_STATE') || ''))}>
                  {getChar(sim, 'RESOURCE_STATE') || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.batchId')}>
                {getChar(sim, 'BatchId') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.profileType')}>
                {getChar(sim, 'ProfileType') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.created')}>
                {formatDate(sim.createdDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.lastModified')}>
                {formatDate(sim.updatedDate || sim.lastModifiedDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t('common.description')}>
                {sim.description || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {sim.resourceCharacteristic && sim.resourceCharacteristic.length > 0 && (
            <Card title={t('titles.resourceCharacteristics')} style={{ marginTop: 16 }}>
              <Descriptions column={1} bordered>
                {sim.resourceCharacteristic.map((char, index) => (
                  <Descriptions.Item key={index} label={char.name}>
                    {JSON.stringify(char.value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><HistoryOutlined /> {t('titles.activityHistory')}</>}>
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <div><strong>Created</strong></div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(sim.createdDate)}
                      </Typography.Text>
                    </>
                  ),
                },
                {
                  color: getStatusColor(getDisplayStatus()),
                  children: (
                    <>
                      <div><strong>Status: {getDisplayStatus()}</strong></div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {sim.createdDate ? new Date(sim.createdDate).toLocaleString() : ''}
                      </Typography.Text>
                    </>
                  ),
                },
              ]}
            />
          </Card>

          {sim.resourceRelationship && sim.resourceRelationship.length > 0 && (
            <Card title={t('titles.relatedResources')} style={{ marginTop: 16 }}>
              {sim.resourceRelationship.map((rel, index) => {
                const targetId = (rel as any)?.resource?.id;
                const label = (rel as any)?.resource?.iccid || (rel as any)?.resource?.name || targetId || '-';
                return (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Tag>{rel.relationshipType}</Tag>
                    <Button
                      type="link"
                      size="small"
                      disabled={!targetId}
                      onClick={() => targetId && navigate(`/sim-resources/${targetId}`)}
                    >
                      {label}
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        title="Edit SIM Resource"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Title level={5}>Resource Characteristics</Title>
          <Form.List name="characteristics">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col xs={24} sm={7}>
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: 'Name is required' }]}
                        label={name === 0 ? 'Name' : undefined}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Name (e.g., IMSI)" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={13}>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: 'Value is required' }]}
                        label={name === 0 ? 'Value' : undefined}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="Value" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={4}>
                      <Form.Item label={name === 0 ? ' ' : undefined} colon={false} style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', height: 32 }}>
                          <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                        </div>
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ valueType: 'string' })}>
                  Add Characteristic
                </Button>
                <Divider />
              </>
            )}
          </Form.List>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Name" name="name">
                <Input placeholder="Enter name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Category" name="category">
                <Input placeholder="Enter category" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Resource Status" name="resourceStatus">
                <Select allowClear placeholder="Select status">
                  {RESOURCE_STATUS_VALUES.map((s) => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Administrative State" name="administrativeState">
                <Select allowClear placeholder="Select administrative state">
                  <Select.Option value="locked">locked</Select.Option>
                  <Select.Option value="unlocked">unlocked</Select.Option>
                  <Select.Option value="shutdown">shutdown</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Operational State" name="operationalState">
                <Select allowClear placeholder="Select operational state">
                  <Select.Option value="enable">enable</Select.Option>
                  <Select.Option value="disable">disable</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Usage State" name="usageState">
                <Select allowClear placeholder="Select usage state">
                  <Select.Option value="idle">idle</Select.Option>
                  <Select.Option value="active">active</Select.Option>
                  <Select.Option value="busy">busy</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="IMSI"
            name="imsi"
            rules={[
              {
                pattern: /^\d{15}$/,
                message: 'IMSI must be 15 digits',
              },
            ]}
          >
            <Input placeholder="Enter IMSI" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Enter description" />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isLoading}
              >
                Update
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Lifecycle Action Modal */}
      <Modal
        title={`${actionLabels[selectedAction!]} SIM Resource`}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={handleLifecycleAction}
        >
          <p>
            Are you sure you want to <strong>{actionLabels[selectedAction!]?.toLowerCase()}</strong> this SIM resource?
          </p>
          
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--table-row-hover-bg)', borderRadius: 4, margin: '16px 0' }}>
            <Text code>{getChar(sim, 'ICCID')}</Text>
          </div>

          {(selectedAction === LifecycleAction.SUSPEND || selectedAction === LifecycleAction.TERMINATE || selectedAction === LifecycleAction.RETIRE) && (
            <Form.Item
              label="Reason (Optional)"
              name="reason"
            >
              <TextArea
                rows={3}
                placeholder="Enter reason for this action"
              />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setActionModalVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={
                  activateMutation.isLoading ||
                  suspendMutation.isLoading ||
                  terminateMutation.isLoading
                }
                danger={selectedAction === LifecycleAction.TERMINATE}
              >
                {actionLabels[selectedAction!]}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default SimResourceDetail;
