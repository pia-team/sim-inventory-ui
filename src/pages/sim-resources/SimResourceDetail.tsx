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
  message,
  Typography,
  Row,
  Col,
  Timeline,
  Dropdown,
  Radio,
  Tabs,
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
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import apiService from '../../services/api.service';
import {
  SimStatus,
  LifecycleAction,
  RESOURCE_STATUS_VALUES,
} from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/format';
import { getResourceStatusColor } from '../../utils/status';

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
  const [selectedAction, setSelectedAction] = useState<LifecycleAction | null>(
    null
  );
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignMsisdn, setAssignMsisdn] = useState('');
  const [unassignModalVisible, setUnassignModalVisible] = useState(false);
  const [unassignBehavior, setUnassignBehavior] = useState<'reserved' | 'disposed'>('disposed');
  const [showPIN, setShowPIN] = useState(false);
  const [showPUK1, setShowPUK1] = useState(false);
  const [showPUK2, setShowPUK2] = useState(false);
  const [showEAct, setShowEAct] = useState(false);
  // Allocation editor state (TMF relatedParty requires id and @referredType)
  const [distId, setDistId] = useState('');
  const [distName, setDistName] = useState('');
  const [distType, setDistType] = useState<
    'Party' | 'Organization' | 'Individual'
  >('Party');
  const [repId, setRepId] = useState('');
  const [repName, setRepName] = useState('');
  const [repType, setRepType] = useState<
    'Party' | 'Organization' | 'Individual'
  >('Party');
  const [custId, setCustId] = useState('');
  const [custName, setCustName] = useState('');
  const [custType, setCustType] = useState<
    'Party' | 'Organization' | 'Individual'
  >('Party');

  // Fetch SIM resource details
  const { data: response, isLoading } = useQuery(
    ['simResource', id],
    () => apiService.getSimResourceById(id!),
    {
      enabled: !!id,
    }
  );

  const assignMutation = useMutation(
    () => apiService.assignSimToAccount(id!, assignMsisdn),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        setAssignModalVisible(false);
        setAssignMsisdn('');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error?.response?.data?.message || error.message}`);
      },
    }
  );

  const unassignMutation = useMutation(
    () => apiService.unassignSimResource(id!, unassignBehavior),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        setUnassignModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error?.response?.data?.message || error.message}`);
      },
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: any) => apiService.updateSimResource(id!, data),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        setEditModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  // Lifecycle mutations
  const activateMutation = useMutation(
    () => apiService.activateSimResource(id!),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const suspendMutation = useMutation(
    (reason?: string) => apiService.suspendSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const terminateMutation = useMutation(
    (reason?: string) => apiService.terminateSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const releaseMutation = useMutation(
    () => apiService.releaseSimResource(id!),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const retireMutation = useMutation(
    (reason?: string) => apiService.retireSimResource(id!, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries(['simResource', id]);
        queryClient.invalidateQueries('simStatistics');
        setActionModalVisible(false);
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const deleteMutation = useMutation(() => apiService.deleteSimResource(id!), {
    onSuccess: () => {
      message.success(t('messages.updated', { defaultValue: 'Updated' }));
      navigate('/sim-resources');
    },
    onError: (error: any) => {
      message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
    },
  });

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
    obj?.resourceCharacteristic?.find(
      (c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase()
    )?.value;

  const getStatusColor = (status?: string | SimStatus) => getResourceStatusColor(String(status));

  const getDisplayStatus = () => (sim as any).resourceStatus || '-';

  const formatStatusLabel = (val?: string) => {
    const s = String(val || '').toLowerCase();
    if (s === 'inuse') return 'In use';
    if (s === 'disposed') return 'Disposed';
    if (!val) return '-';
    return String(val);
  };

  const getRelatedPartyName = (role: string) => {
    const arr = (sim as any)?.relatedParty || [];
    const p = Array.isArray(arr)
      ? arr.find(
          (x: any) => String(x?.role || '').toLowerCase() === role.toLowerCase()
        )
      : undefined;
    return p?.name || p?.id || '-';
  };

  const formatDate = (val?: string) => formatDateTime(val);

  const getAvailableActions = () => {
    const actions = [] as any[];
    const status = String((sim as any).resourceStatus || '').toLowerCase();

    switch (status) {
      case 'available':
      case 'standby':
      case 'unknown':
        actions.push({
          key: 'activate',
          label: t('actions.activate'),
          icon: <PlayCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.ACTIVATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
          icon: <RestOutlined />,
          danger: true,
          onClick: () => {
            setSelectedAction(LifecycleAction.RETIRE);
            setActionModalVisible(true);
          },
        });
        break;
      case 'reserved':
      case 'inuse':
        actions.push({
          key: 'suspend',
          label: t('actions.suspend'),
          icon: <PauseCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.SUSPEND);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'terminate',
          label: t('actions.terminate'),
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
          label: t('actions.activate'),
          icon: <PlayCircleOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.ACTIVATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'terminate',
          label: t('actions.terminate'),
          icon: <StopOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.TERMINATE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
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
          label: t('actions.release'),
          icon: <UnlockOutlined />,
          onClick: () => {
            setSelectedAction(LifecycleAction.RELEASE);
            setActionModalVisible(true);
          },
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
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

    if ((status === 'available' || status === 'disposed') && hasRole('sim_admin')) {
      actions.push({
        type: 'divider' as const,
      });
      actions.push({
        key: 'delete',
        label: t('actions.delete', { defaultValue: 'Delete' }),
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: t('titles.deleteSimResource'),
            content: t('messages.confirmDeleteSim', { iccid: getChar(sim, 'ICCID') }),
            okType: 'danger',
            onOk: () => deleteMutation.mutate(),
          });
        },
      });
    }

    return actions;
  };

  // Sensitive characteristic helpers
  const isSensitiveCharName = (name?: string) => {
    const s = String(name || '').toLowerCase();
    return s === 'pin' || s === 'puk1' || s === 'puk2' || s === 'esim_act_code';
  };
  const SENSITIVE_KEYS = ['PIN', 'PUK1', 'PUK2', 'ESIM_ACT_CODE'] as const;

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
      // Exclude sensitive items from the generic list
      characteristics:
        ((sim as any)?.resourceCharacteristic || [])
          .filter((c: any) => !isSensitiveCharName(c?.name))
          .map((c: any) => ({
            name: c?.name,
            value: c?.value,
            valueType: c?.valueType || 'string',
          })) || [],
      // Initialize secure editor group empty (leave blank to keep)
      sensitive: {},
    });
    setEditModalVisible(true);
  };

  const handleUpdate = (values: any) => {
    // Start from form-provided list so user explicitly controls add/update/delete
    let rc: any[] = Array.isArray(values.characteristics)
      ? values.characteristics
          .filter(
            (x: any) => x && x.name && x.value !== undefined && x.value !== ''
          )
          .map((x: any) => ({
            name: x.name,
            value: x.value,
            valueType: x.valueType || 'string',
          }))
      : [];

    // Merge IMSI convenience field into characteristics (add/update/remove)
    rc = rc.filter((c) => String(c.name).toLowerCase() !== 'imsi');
    if (values.imsi !== undefined && String(values.imsi).trim() !== '') {
      rc.push({ name: 'IMSI', value: values.imsi, valueType: 'string' });
    }

    // Add sensitive characteristics: if provided, use new value; otherwise keep existing
    const sensitive = values?.sensitive || {};
    SENSITIVE_KEYS.forEach((key) => {
      const provided = sensitive?.[key];
      if (provided !== undefined && String(provided).trim() !== '') {
        rc.push({ name: key, value: provided, valueType: 'string' });
      } else {
        const existingVal = getChar(sim, key);
        if (
          existingVal !== undefined &&
          existingVal !== null &&
          String(existingVal) !== ''
        ) {
          rc.push({ name: key, value: existingVal, valueType: 'string' });
        }
      }
    });

    // Deduplicate by name (case-insensitive); keep last occurrence
    const dedup = new Map<string, any>();
    rc.forEach((c) => {
      const key = String(c.name || '').trim();
      if (!key) return;
      dedup.set(key.toLowerCase(), {
        name: key,
        value: c.value,
        valueType: c.valueType || 'string',
      });
    });
    rc = Array.from(dedup.values());

    const payload: any = {
      description: values.description,
      resourceCharacteristic: rc, // send full list; empty array clears all characteristics
    };

    if (values.name !== undefined && String(values.name).trim() !== '')
      payload.name = values.name;
    if (values.category !== undefined && String(values.category).trim() !== '')
      payload.category = values.category;
    if (
      values.administrativeState !== undefined &&
      String(values.administrativeState).trim() !== ''
    )
      payload.administrativeState = values.administrativeState;
    if (
      values.operationalState !== undefined &&
      String(values.operationalState).trim() !== ''
    )
      payload.operationalState = values.operationalState;
    if (
      values.usageState !== undefined &&
      String(values.usageState).trim() !== ''
    )
      payload.usageState = values.usageState;
    if (
      values.resourceStatus !== undefined &&
      String(values.resourceStatus).trim() !== ''
    )
      payload.resourceStatus = values.resourceStatus;

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
    [LifecycleAction.ACTIVATE]: t('actions.activate', { defaultValue: 'Activate' }),
    [LifecycleAction.SUSPEND]: t('actions.suspend', { defaultValue: 'Suspend' }),
    [LifecycleAction.TERMINATE]: t('actions.terminate', { defaultValue: 'Terminate' }),
    [LifecycleAction.RELEASE]: t('actions.release', { defaultValue: 'Release' }),
    [LifecycleAction.RETIRE]: t('actions.retire', { defaultValue: 'Retire' }),
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
                  <Button icon={<EditOutlined />} onClick={handleEdit}>
                    {t('actions.edit')}
                  </Button>
                )}
                {hasRole('sim_admin') && (
                  <>
                    <Button onClick={() => setAssignModalVisible(true)}>
                      {t('actions.assign', {
                        defaultValue: 'Assign to Account',
                      })}
                    </Button>
                    <Button onClick={() => setUnassignModalVisible(true)}>
                      {t('actions.unassign', { defaultValue: 'Unassign' })}
                    </Button>
                  </>
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
                <Text
                  copyable={!!getChar(sim, 'IMSI')}
                  code={!!getChar(sim, 'IMSI')}
                >
                  {getChar(sim, 'IMSI') || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.type')}>
                <Tag
                  color={
                    String(getChar(sim, 'SIMType') || (sim as any)?.type || '')
                      .toLowerCase()
                      .includes('esim')
                      ? 'cyan'
                      : 'blue'
                  }
                >
                  {getChar(sim, 'SIMType') ||
                    (sim as any)?.type ||
                    (sim as any)['@type'] ||
                    '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.status')}>
                <Tag color={getStatusColor(getDisplayStatus())}>
                  {t(`sim.statusValues.${String(getDisplayStatus()).toLowerCase()==='inuse'?'inUse':String(getDisplayStatus())}`, { defaultValue: formatStatusLabel(getDisplayStatus()) })}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('sim.state')}>
                <Tag
                  color={getStatusColor(
                    String(getChar(sim, 'RESOURCE_STATE') || '')
                  )}
                >
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

          {hasRole('sim_admin') && (
            <Card
              title={t('titles.sensitiveInfo', {
                defaultValue: 'Sensitive Information',
              })}
              style={{ marginTop: 16 }}
            >
              <Descriptions column={1} bordered>
                {['PIN', 'PUK1', 'PUK2', 'ESIM_ACT_CODE'].map((key) => {
                  const val = getChar(sim, key);
                  const shown =
                    key === 'PIN'
                      ? showPIN
                      : key === 'PUK1'
                        ? showPUK1
                        : key === 'PUK2'
                          ? showPUK2
                          : showEAct;
                  const setShown =
                    key === 'PIN'
                      ? setShowPIN
                      : key === 'PUK1'
                        ? setShowPUK1
                        : key === 'PUK2'
                          ? setShowPUK2
                          : setShowEAct;
                  return (
                    <Descriptions.Item key={key} label={key}>
                      <Space>
                        <Text code>
                          {val ? (shown ? String(val) : '••••••') : '-'}
                        </Text>
                        {val && (
                          <>
                            <Button
                              size="small"
                              icon={
                                shown ? (
                                  <EyeInvisibleOutlined />
                                ) : (
                                  <EyeOutlined />
                                )
                              }
                              onClick={() => setShown(!shown)}
                            />
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                navigator.clipboard.writeText(String(val));
                                message.success(
                                  t('messages.copiedToClipboard', {
                                    defaultValue: 'Copied to clipboard',
                                  })
                                );
                              }}
                            />
                          </>
                        )}
                      </Space>
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </Card>
          )}

          {Array.isArray(sim.resourceCharacteristic) &&
            sim.resourceCharacteristic.filter(
              (c: any) => !isSensitiveCharName(c?.name)
            ).length > 0 && (
              <Card
                title={t('titles.resourceCharacteristics')}
                style={{ marginTop: 16 }}
              >
                <Descriptions column={1} bordered>
                  {sim.resourceCharacteristic
                    .filter((char: any) => !isSensitiveCharName(char?.name))
                    .map((char: any, index: number) => (
                      <Descriptions.Item key={index} label={char.name}>
                        {JSON.stringify(char.value)}
                      </Descriptions.Item>
                    ))}
                </Descriptions>
              </Card>
            )}
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <>
                <HistoryOutlined /> {t('titles.activityHistory')}
              </>
            }
          >
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <div>
                        <strong>{t('sim.created', { defaultValue: 'Created' })}</strong>
                      </div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {formatDate(sim.createdDate)}
                      </Typography.Text>
                    </>
                  ),
                },
                {
                  color: getStatusColor(getDisplayStatus()),
                  children: (
                    <>
                      <div>
                        <strong>{t('sim.status', { defaultValue: 'Status' })}: {getDisplayStatus()}</strong>
                      </div>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {formatDateTime(sim.createdDate)}
                      </Typography.Text>
                    </>
                  ),
                },
              ]}
            />
          </Card>

          {sim.resourceRelationship && sim.resourceRelationship.length > 0 && (
            <Card 
              title={t('titles.relatedResources')} 
              style={{ marginTop: 16 }}
              size="small"
            >
              {sim.resourceRelationship.map((rel, index) => {
                const targetId = (rel as any)?.resource?.id;
                const label =
                  (rel as any)?.resource?.iccid ||
                  (rel as any)?.resource?.name ||
                  targetId ||
                  t('common.unknown', { defaultValue: 'Unknown' });
                return (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Tag>{rel.relationshipType}</Tag>
                    <Button
                      type="link"
                      size="small"
                      disabled={!targetId}
                      onClick={() =>
                        targetId && navigate(`/sim-resources/${targetId}`)
                      }
                    >
                      {label}
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}

          <Card title={t('titles.allocation', { defaultValue: 'Allocation' })}
            style={{ marginTop: 16 }}
          >
            <Descriptions column={1} bordered>
              <Descriptions.Item label={t('fields.distributor', { defaultValue: 'Distributor' })}>
                {getRelatedPartyName('Distributor')}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.representative', { defaultValue: 'Representative' })}>
                {getRelatedPartyName('Representative')}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.customer', { defaultValue: 'Customer' })}>
                {getRelatedPartyName('Customer')}
              </Descriptions.Item>
            </Descriptions>
            {hasRole('sim_admin') && (
              <div style={{ marginTop: 12 }}>
                {/* Distributor */}
                <Row style={{ marginBottom: 12 }} align="middle">
                  <Col span={24}>
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>
                      {t('fields.distributor', { defaultValue: 'Distributor' })}
                    </div>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        style={{ width: 220 }}
                        placeholder={t('fields.id', { defaultValue: 'ID' })}
                        value={distId}
                        onChange={(e) => setDistId(e.target.value)}
                      />
                      <Input
                        style={{ width: 260 }}
                        placeholder={t('fields.nameOptional', { defaultValue: 'Name (optional)' })}
                        value={distName}
                        onChange={(e) => setDistName(e.target.value)}
                      />
                      <Select
                        value={distType}
                        onChange={(v) => setDistType(v)}
                        style={{ width: 160 }}
                      >
                        <Select.Option value="Party">{t('fields.party', { defaultValue: 'Party' })}</Select.Option>
                        <Select.Option value="Organization">{t('fields.organization', { defaultValue: 'Organization' })}</Select.Option>
                        <Select.Option value="Individual">{t('fields.individual', { defaultValue: 'Individual' })}</Select.Option>
                      </Select>
                      <Button
                        type="primary"
                        disabled={!(distId || distName)}
                        onClick={async () => {
                          const payload: any = distId
                            ? { id: distId }
                            : { name: distName };
                          payload['@referredType'] = distType;
                          const res = await apiService.setAllocationRelatedParty(
                            id!,
                            'Distributor',
                            payload
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('actions.set', { defaultValue: 'Set' })}
                      </Button>
                      <Button
                        danger
                        onClick={async () => {
                          const res = await apiService.clearAllocationByRole(
                            id!,
                            'Distributor'
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('common.clear', { defaultValue: 'Clear' })}
                      </Button>
                    </Space.Compact>
                  </Col>
                </Row>
                {/* Representative */}
                <Row style={{ marginBottom: 12 }} align="middle">
                  <Col span={24}>
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>
                      {t('fields.representative', { defaultValue: 'Representative' })}
                    </div>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        style={{ width: 220 }}
                        placeholder={t('fields.id', { defaultValue: 'ID' })}
                        value={repId}
                        onChange={(e) => setRepId(e.target.value)}
                      />
                      <Input
                        style={{ width: 260 }}
                        placeholder={t('fields.nameOptional', { defaultValue: 'Name (optional)' })}
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                      />
                      <Select
                        value={repType}
                        onChange={(v) => setRepType(v)}
                        style={{ width: 160 }}
                      >
                        <Select.Option value="Party">{t('fields.party', { defaultValue: 'Party' })}</Select.Option>
                        <Select.Option value="Organization">{t('fields.organization', { defaultValue: 'Organization' })}</Select.Option>
                        <Select.Option value="Individual">{t('fields.individual', { defaultValue: 'Individual' })}</Select.Option>
                      </Select>
                      <Button
                        type="primary"
                        disabled={!(repId || repName)}
                        onClick={async () => {
                          const payload: any = repId
                            ? { id: repId }
                            : { name: repName };
                          payload['@referredType'] = repType;
                          const res = await apiService.setAllocationRelatedParty(
                            id!,
                            'Representative',
                            payload
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('actions.set', { defaultValue: 'Set' })}
                      </Button>
                      <Button
                        danger
                        onClick={async () => {
                          const res = await apiService.clearAllocationByRole(
                            id!,
                            'Representative'
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('common.clear', { defaultValue: 'Clear' })}
                      </Button>
                    </Space.Compact>
                  </Col>
                </Row>
                {/* Customer */}
                <Row align="middle">
                  <Col span={24}>
                    <div style={{ marginBottom: 4, fontWeight: 600 }}>
                      {t('fields.customer', { defaultValue: 'Customer' })}
                    </div>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        style={{ width: 220 }}
                        placeholder={t('fields.id', { defaultValue: 'ID' })}
                        value={custId}
                        onChange={(e) => setCustId(e.target.value)}
                      />
                      <Input
                        style={{ width: 260 }}
                        placeholder={t('fields.nameOptional', { defaultValue: 'Name (optional)' })}
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                      />
                      <Select
                        value={custType}
                        onChange={(v) => setCustType(v)}
                        style={{ width: 160 }}
                      >
                        <Select.Option value="Party">{t('fields.party', { defaultValue: 'Party' })}</Select.Option>
                        <Select.Option value="Organization">{t('fields.organization', { defaultValue: 'Organization' })}</Select.Option>
                        <Select.Option value="Individual">{t('fields.individual', { defaultValue: 'Individual' })}</Select.Option>
                      </Select>
                      <Button
                        type="primary"
                        disabled={!(custId || custName)}
                        onClick={async () => {
                          const payload: any = custId
                            ? { id: custId }
                            : { name: custName };
                          payload['@referredType'] = custType;
                          const res = await apiService.setAllocationRelatedParty(
                            id!,
                            'Customer',
                            payload
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('actions.set', { defaultValue: 'Set' })}
                      </Button>
                      <Button
                        danger
                        onClick={async () => {
                          const res = await apiService.clearAllocationByRole(
                            id!,
                            'Customer'
                          );
                          if (res.success) {
                            message.success(t('messages.updated', { defaultValue: 'Updated' }));
                            queryClient.invalidateQueries(['simResource', id]);
                          }
                        }}
                      >
                        {t('common.clear', { defaultValue: 'Clear' })}
                      </Button>
                    </Space.Compact>
                  </Col>
                </Row>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        title={t('titles.editSimResource', { defaultValue: 'Edit SIM Resource' })}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={1000}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Tabs
            items={[
              {
                key: 'general',
                label: t('titles.basicInformation', {
                  defaultValue: 'Basic Information',
                }),
                children: (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item label={t('createSim.name', { defaultValue: 'Name' })} name="name">
                          <Input placeholder={t('placeholders.name', { defaultValue: 'Enter name' })} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label={t('fields.category', { defaultValue: 'Category' })} name="category">
                          <Input placeholder={t('placeholders.category', { defaultValue: 'Enter category' })} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item label={t('common.description', { defaultValue: 'Description' })} name="description">
                      <TextArea rows={3} placeholder={t('common.description', { defaultValue: 'Description' })} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'states',
                label: t('titles.states', { defaultValue: 'States' }),
                children: (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label={t('sim.status', { defaultValue: 'Status' })}
                          name="resourceStatus"
                        >
                          <Select allowClear placeholder={t('filters.status', { defaultValue: 'Status' })}>
                            {RESOURCE_STATUS_VALUES.map((s) => (
                              <Select.Option key={s} value={s}>
                                {s}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label={t('fields.administrativeState', { defaultValue: 'Administrative State' })}
                          name="administrativeState"
                        >
                          <Select
                            allowClear
                            placeholder={t('fields.administrativeState', { defaultValue: 'Administrative State' })}
                          >
                            <Select.Option value="locked">locked</Select.Option>
                            <Select.Option value="unlocked">unlocked</Select.Option>
                            <Select.Option value="shutdown">shutdown</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label={t('fields.operationalState', { defaultValue: 'Operational State' })}
                          name="operationalState"
                        >
                          <Select
                            allowClear
                            placeholder={t('fields.operationalState', { defaultValue: 'Operational State' })}
                          >
                            <Select.Option value="enable">enable</Select.Option>
                            <Select.Option value="disable">disable</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label={t('fields.usageState', { defaultValue: 'Usage State' })} name="usageState">
                          <Select allowClear placeholder={t('fields.usageState', { defaultValue: 'Usage State' })}>
                            <Select.Option value="idle">idle</Select.Option>
                            <Select.Option value="active">active</Select.Option>
                            <Select.Option value="busy">busy</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'characteristics',
                label: t('titles.resourceCharacteristics'),
                children: (
                  <>
                    <Form.Item
                      label="IMSI"
                      name="imsi"
                      rules={[
                        {
                          pattern: /^\d{15}$/,
                          message: t('validation.imsi15Digits', { defaultValue: 'IMSI must be 15 digits' }),
                        },
                      ]}
                    >
                      <Input placeholder={t('placeholders.imsi', { defaultValue: 'Enter IMSI' })} />
                    </Form.Item>
                    <Title level={5}>{t('titles.resourceCharacteristics')}</Title>
                    <Form.List name="characteristics">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Row
                              key={key}
                              gutter={8}
                              align="middle"
                              style={{ marginBottom: 8 }}
                            >
                              <Col xs={24} sm={7}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'name']}
                                  rules={[
                                    {
                                      required: true,
                                      message: t('validation.nameRequired', { defaultValue: 'Name is required' }),
                                    },
                                  ]}
                                  label={name === 0 ? t('createSim.name', { defaultValue: 'Name' }) : undefined}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder={t('placeholders.nameExample', { defaultValue: 'Name (e.g., IMSI)' })} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={13}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'value']}
                                  rules={[
                                    {
                                      required: true,
                                      message: t('validation.valueRequired', { defaultValue: 'Value is required' }),
                                    },
                                  ]}
                                  label={name === 0 ? t('common.value', { defaultValue: 'Value' }) : undefined}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder={t('common.value', { defaultValue: 'Value' })} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={4}>
                                <Form.Item
                                  label={name === 0 ? ' ' : undefined}
                                  colon={false}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Button danger size="small" onClick={() => remove(name)}>
                                    {t('common.remove', { defaultValue: 'Remove' })}
                                  </Button>
                                </Form.Item>
                              </Col>
                            </Row>
                          ))}
                          <Button
                            type="dashed"
                            block
                            onClick={() => add({ valueType: 'string' })}
                          >
                            {t('actions.addCharacteristic', { defaultValue: 'Add Characteristic' })}
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </>
                ),
              },
              {
                key: 'sensitive',
                label: t('titles.sensitiveInfo', {
                  defaultValue: 'Sensitive Information',
                }),
                children: (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="PIN"
                          name={['sensitive', 'PIN']}
                          extra={t('messages.leaveBlankToKeep', {
                            defaultValue: 'Leave blank to keep current',
                          })}
                        >
                          <Input.Password placeholder={t('placeholders.newPinOptional', { defaultValue: 'Enter new PIN (optional)' })} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="PUK1"
                          name={['sensitive', 'PUK1']}
                          extra={t('messages.leaveBlankToKeep', {
                            defaultValue: 'Leave blank to keep current',
                          })}
                        >
                          <Input.Password placeholder={t('placeholders.newPuk1Optional', { defaultValue: 'Enter new PUK1 (optional)' })} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="PUK2"
                          name={['sensitive', 'PUK2']}
                          extra={t('messages.leaveBlankToKeep', {
                            defaultValue: 'Leave blank to keep current',
                          })}
                        >
                          <Input.Password placeholder={t('placeholders.newPuk2Optional', { defaultValue: 'Enter new PUK2 (optional)' })} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label="ESIM_ACT_CODE"
                          name={['sensitive', 'ESIM_ACT_CODE']}
                          extra={t('messages.leaveBlankToKeep', {
                            defaultValue: 'Leave blank to keep current',
                          })}
                        >
                          <Input.Password placeholder={t('placeholders.newActivationCodeOptional', { defaultValue: 'Enter new activation code (optional)' })} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />

        </Form>
      </Modal>

      {/* Assign to Account Modal */}
      <Modal
        title={t('actions.assign', { defaultValue: 'Assign to Account' })}
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={() => assignMutation.mutate()}
        confirmLoading={assignMutation.isLoading}
      >
        <Form layout="vertical">
          <Form.Item
            label={t('fields.msisdn', { defaultValue: 'MSISDN / Account ID' })}
            required
          >
            <Input
              value={assignMsisdn}
              onChange={(e) => setAssignMsisdn(e.target.value)}
              placeholder={t('placeholders.msisdnExample', { defaultValue: 'e.g., 905xxxxxxxxx' })}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Unassign Modal */}
      <Modal
        title={t('actions.unassign', { defaultValue: 'Unassign SIM' })}
        open={unassignModalVisible}
        onCancel={() => setUnassignModalVisible(false)}
        onOk={() => unassignMutation.mutate()}
        confirmLoading={unassignMutation.isLoading}
      >
        <p>
          {t('messages.selectUnassignBehavior', {
            defaultValue: 'Choose resulting status after unassigning:',
          })}
        </p>
        <Radio.Group
          value={unassignBehavior}
          onChange={(e) => setUnassignBehavior(e.target.value)}
        >
          <Radio value="reserved">{t('sim.statusValues.reserved', { defaultValue: 'Reserved' })}</Radio>
          <Radio value="disposed">{t('sim.statusValues.disposed', { defaultValue: 'Disposed' })}</Radio>
        </Radio.Group>
      </Modal>

      {/* Lifecycle Action Modal */}
      <Modal
        title={`${actionLabels[selectedAction!]} ${t('titles.simResourceDetails', { defaultValue: 'SIM Resource' })}`}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleLifecycleAction}>
          <p>
            {t('messages.confirmActionSimResource', { action: actionLabels[selectedAction!], defaultValue: 'Are you sure you want to {{action}} this SIM resource?' })}
          </p>

          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--table-row-hover-bg)',
              borderRadius: 4,
              margin: '16px 0',
            }}
          >
            <Text code>{getChar(sim, 'ICCID')}</Text>
          </div>

          {(selectedAction === LifecycleAction.SUSPEND ||
            selectedAction === LifecycleAction.TERMINATE ||
            selectedAction === LifecycleAction.RETIRE) && (
            <Form.Item label={t('common.reasonOptional', { defaultValue: 'Reason (Optional)' })} name="reason">
              <TextArea rows={3} placeholder={t('placeholders.reason', { defaultValue: 'Enter reason for this action' })} />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setActionModalVisible(false)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
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
