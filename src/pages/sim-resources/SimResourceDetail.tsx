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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../../services/api.service';
import { SimStatus, SimType, LifecycleAction } from '../../types/sim.types';
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

  const getStatusColor = (status?: string | SimStatus) => {
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

  const getDisplayStatus = () => (sim.status as any) || (sim as any).resourceStatus || '-';

  const formatDate = (val?: string) => (val ? new Date(val).toLocaleString() : '-');

  const getAvailableActions = () => {
    const actions = [];
    const status = String((sim.status as any) || (sim as any).resourceStatus || '').toLowerCase();
    
    switch (status) {
      case 'available':
      case 'allocated':
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
      case 'active':
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
      case 'terminated':
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
            content: `Are you sure you want to delete SIM ${sim.iccid}? This action cannot be undone.`,
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
      imsi: sim.imsi || '',
    });
    setEditModalVisible(true);
  };

  const handleUpdate = (values: any) => {
    updateMutation.mutate({
      ...values,
      lastModifiedDate: new Date().toISOString(),
    });
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
                <Text copyable code>
                  {sim.iccid}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.imsi')}>
                <Text copyable={!!sim.imsi} code={!!sim.imsi}>
                  {sim.imsi || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.type')}>
                <Tag color={sim.type === SimType.ESIM ? 'purple' : 'blue'}>
                  {sim.type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.status')}>
                <Tag color={getStatusColor(getDisplayStatus())}>
                  {getDisplayStatus()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.batchId')}>
                {sim.batchId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.profileType')}>
                {sim.profileType || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.created')}>
                {formatDate(sim.createdDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.lastModified')}>
                {formatDate(sim.updatedDate || sim.lastModifiedDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t('common.description')} span={2}>
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
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {formatDate(sim.createdDate)}
                      </div>
                    </>
                  ),
                },
                {
                  color: getStatusColor(getDisplayStatus()),
                  children: (
                    <>
                      <div><strong>Status: {getDisplayStatus()}</strong></div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {sim.createdDate ? new Date(sim.createdDate).toLocaleString() : ''}
                      </div>
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

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="Enter description"
            />
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
          
          <div style={{ padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: 4, margin: '16px 0' }}>
            <Text code>{sim.iccid}</Text>
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
