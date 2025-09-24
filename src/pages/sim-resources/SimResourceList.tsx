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
  Popover,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  UnlockOutlined,
  RestOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { CSVLink as CSVLinkComponent } from 'react-csv';
import apiService from '../../services/api.service';
import { SimResource, LifecycleAction, SimResourceSearchCriteria, RESOURCE_STATUS_VALUES } from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/format';
import { getResourceStatusColor } from '../../utils/status';
import { getResourceSortPref } from '../../utils/prefs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;

// Cast to any to avoid TS2786 from outdated react-csv types with React 18
const CSVLink: any = CSVLinkComponent;

interface SimResourceListProps {}

const SimResourceList: React.FC<SimResourceListProps> = () => {
  const navigate = useNavigate();
  const { hasRole } = useKeycloak();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Preferences from Settings Drawer (with sensible defaults)
  const preferredSort = getResourceSortPref();

  const [searchCriteria, setSearchCriteria] = useState<SimResourceSearchCriteria>({
    limit: 20,
    offset: 0,
    sort: preferredSort,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [charFilters, setCharFilters] = useState<{ name: string; value: string }[]>([]);
  const [marketplaceValue, setMarketplaceValue] = useState<string>('');
  const [allocDistributorId, setAllocDistributorId] = useState<string>('');
  const [allocRepresentativeId, setAllocRepresentativeId] = useState<string>('');
  const [allocCustomerId, setAllocCustomerId] = useState<string>('');

  // Fetch SIM resources
  const { data: response, isLoading, refetch } = useQuery(
    ['simResources', searchCriteria, currentPage, pageSize],
    () => apiService.getSimResources({
      ...searchCriteria,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }),
    {
      keepPreviousData: true,
    }
  );

  // Lifecycle mutations
  const activateMutation = useMutation(
    (id: string) => apiService.activateSimResource(id),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const suspendMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.suspendSimResource(id, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const terminateMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.terminateSimResource(id, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => apiService.deleteSimResource(id),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const releaseMutation = useMutation(
    (id: string) => apiService.releaseSimResource(id),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const retireMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.retireSimResource(id, reason),
    {
      onSuccess: () => {
        message.success(t('messages.updated', { defaultValue: 'Updated' }));
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`${t('app.error', { defaultValue: 'An error occurred.' })}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  // Support both paginated shape { data: [...], totalCount, ... } and raw TMF array responses
  const apiData: any = response?.data as any;
  const simResources: any[] = Array.isArray(apiData) ? apiData : (apiData?.data || []);
  const totalCount: number = Array.isArray(apiData)
    ? simResources.length
    : (apiData?.totalCount || simResources.length || 0);

  const handleSearch = useCallback((value: string) => {
    setSearchCriteria((prev: SimResourceSearchCriteria) => ({
      ...prev,
      iccid: value || undefined,
    }));
    setCurrentPage(1);
  }, []);

  const handleFilterChange = (field: keyof SimResourceSearchCriteria, value: any) => {
    setSearchCriteria((prev: SimResourceSearchCriteria) => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1);
  };

  const applyCharFilters = (rows: { name: string; value: string }[]) => {
    setCharFilters(rows);
    const sanitized = rows.filter(r => r.name && r.value).map(r => ({ name: r.name, value: r.value }));
    setSearchCriteria((prev) => ({ ...prev, characteristicFilters: sanitized.length ? sanitized : undefined }));
    setCurrentPage(1);
  };

  const handleLifecycleAction = (action: LifecycleAction, sim: SimResource) => {
    const actionMap = {
      [LifecycleAction.ACTIVATE]: () => activateMutation.mutate(sim.id),
      [LifecycleAction.SUSPEND]: () => {
        Modal.confirm({
          title: t('actions.suspend', { defaultValue: 'Suspend' }),
          content: t('messages.areYouSure', { defaultValue: 'Are you sure?' }),
          onOk: () => suspendMutation.mutate({ id: sim.id }),
        });
      },
      [LifecycleAction.TERMINATE]: () => {
        Modal.confirm({
          title: t('actions.terminate', { defaultValue: 'Terminate' }),
          content: t('messages.areYouSure', { defaultValue: 'Are you sure?' }),
          onOk: () => terminateMutation.mutate({ id: sim.id }),
        });
      },
      [LifecycleAction.RELEASE]: () => {
        Modal.confirm({
          title: t('actions.release', { defaultValue: 'Release' }),
          content: t('messages.areYouSure', { defaultValue: 'Are you sure?' }),
          onOk: () => releaseMutation.mutate(sim.id),
        });
      },
      [LifecycleAction.RETIRE]: () => {
        Modal.confirm({
          title: t('actions.retire', { defaultValue: 'Retire' }),
          content: t('messages.areYouSure', { defaultValue: 'Are you sure?' }),
          onOk: () => retireMutation.mutate({ id: sim.id }),
        });
      },
    };

    actionMap[action]?.();
  };

  const handleDelete = (sim: SimResource) => {
    Modal.confirm({
      title: t('titles.deleteSimResource'),
      content: t('messages.confirmDeleteSim', { iccid: (getChar(sim, 'ICCID') as any) || (sim as any)?.iccid || (sim as any)?.name || sim.id }),
      okType: 'danger',
      onOk: () => deleteMutation.mutate(sim.id),
    });
  };

  const formatStatusLabel = (val?: string) => {
    const s = String(val || '').toLowerCase();
    if (s === 'inuse') return 'In use';
    if (s === 'disposed') return 'Disposed';
    if (!val) return '-';
    return String(val);
  };

  const getAvailableActions = (sim: SimResource) => {
    const actions: any[] = [];
    const stateChar = String(getChar(sim, 'RESOURCE_STATE') || '').toLowerCase();
    const statusRaw = stateChar || (sim as any)?.status || (sim as any)?.resourceStatus || '';
    const status = String(statusRaw).toLowerCase();
    
    switch (status) {
      // New statuses
      case 'available':
      case 'standby':
      case 'unknown':
        actions.push({
          key: 'activate',
          label: t('actions.activate'),
          icon: <PlayCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.ACTIVATE, sim),
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'reserved':
      case 'inuse':
      case 'active':
        actions.push({
          key: 'suspend',
          label: t('actions.suspend'),
          icon: <PauseCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.SUSPEND, sim),
        });
        actions.push({
          key: 'terminate',
          label: t('actions.terminate'),
          icon: <StopOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.TERMINATE, sim),
        });
        break;
      case 'suspended':
        actions.push({
          key: 'activate',
          label: t('actions.activate'),
          icon: <PlayCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.ACTIVATE, sim),
        });
        actions.push({
          key: 'terminate',
          label: t('actions.terminate'),
          icon: <StopOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.TERMINATE, sim),
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'cancelled':
      case 'terminated':
        actions.push({
          key: 'release',
          label: t('actions.release'),
          icon: <UnlockOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.RELEASE, sim),
        });
        actions.push({
          key: 'retire',
          label: t('actions.retire'),
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'completed':
        // No further lifecycle actions
        break;
    }

    if ((status === 'available' || status === 'disposed') && hasRole('sim_admin')) {
      actions.push({
        key: 'delete',
        label: t('actions.delete'),
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(sim),
      });
    }

    return actions;
  };

  // Helper to pick a specific characteristic value (e.g., ICCID or IMSI)
  const getChar = (sim: any, key: string) =>
    sim?.resourceCharacteristic?.find((c: any) => c.name?.toLowerCase() === key.toLowerCase())?.value;

  const columns = [
    {
      title: t('sim.iccid'),
      dataIndex: 'iccid',
      key: 'iccid',
      width: 200,
      render: (iccid: string, record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/sim-resources/${record.id}`)}
          style={{ padding: 0, fontFamily: 'monospace' }}
        >
          {getChar(record, 'ICCID') || iccid || record?.name || record?.id}
        </Button>
      ),
    },
    {
      title: t('sim.imsi'),
      dataIndex: 'imsi',
      key: 'imsi',
      width: 180,
      render: (_: any, record: any) => (
        <span style={{ fontFamily: 'monospace' }}>
          {getChar(record, 'IMSI') || '-'}
        </span>
      ),
    },
    {
      title: t('sim.type'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
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
      width: 120,
      render: (_: any, record: any) => {
        const s = record?.resourceStatus || record?.status;
        const key = String(s || '').toLowerCase() === 'inuse' ? 'inUse' : String(s || '');
        return (
          <Tag color={getResourceStatusColor(s as any)}>
            {t(`sim.statusValues.${key}`, { defaultValue: formatStatusLabel(s as string) })}
          </Tag>
        );
      },
    },
    {
      title: t('sim.state'),
      dataIndex: 'state',
      key: 'state',
      width: 120,
      render: (_: any, record: any) => {
        const state = getChar(record, 'RESOURCE_STATE');
        return (
          <Tag color={getResourceStatusColor(state as any)}>
            {state || '-'}
          </Tag>
        );
      },
    },
    {
      title: t('sim.batchId'),
      dataIndex: 'batchId',
      key: 'batchId',
      width: 120,
      render: (batchId: string, record: any) => batchId || getChar(record, 'BatchId') || '-',
    },
    {
      title: t('sim.created'),
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 180,
      render: (_: any, record: any) => formatDateTime(record?.createdDate),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: SimResource) => {
        const actions = getAvailableActions(record);
        const items: MenuProps['items'] = (actions.length ? actions : [{
          key: 'view',
          label: t('actions.view', { defaultValue: 'View' }),
          icon: <EyeOutlined />,
        }]).map((it: any) => ({ key: it.key, label: it.label, icon: it.icon, danger: it.danger }));

        const onMenuClick: MenuProps['onClick'] = ({ key }) => {
          switch (key) {
            case 'activate':
              handleLifecycleAction(LifecycleAction.ACTIVATE, record);
              break;
            case 'suspend':
              handleLifecycleAction(LifecycleAction.SUSPEND, record);
              break;
            case 'terminate':
              handleLifecycleAction(LifecycleAction.TERMINATE, record);
              break;
            case 'release':
              handleLifecycleAction(LifecycleAction.RELEASE, record);
              break;
            case 'retire':
              handleLifecycleAction(LifecycleAction.RETIRE, record);
              break;
            case 'delete':
              handleDelete(record);
              break;
            case 'view':
              navigate(`/sim-resources/${record.id}`);
              break;
          }
        };

        return (
          <Dropdown
            menu={{ items, onClick: onMenuClick }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="default"
              shape="circle"
              icon={<MoreOutlined />}
              size="middle"
              title={t('common.actions', { defaultValue: 'Actions' })}
            />
          </Dropdown>
        );
      },
    },
  ];

  const csvData = simResources.map((sim: any) => {
    const displayType = sim?.type || sim?.['@type'] || sim?.resourceSpecification?.name || '';
    const s = sim?.resourceStatus || sim?.status || '';
    const state = getChar(sim, 'RESOURCE_STATE') || '';
    return {
      ICCID: getChar(sim, 'ICCID') || sim?.iccid || sim?.name || sim?.id,
      IMSI: getChar(sim, 'IMSI') || '',
      Type: displayType,
      Status: s,
      State: state,
      BatchID: sim?.batchId || getChar(sim, 'BatchId') || '',
      Created: sim?.createdDate ? new Date(sim.createdDate).toISOString() : '',
    };
  });

  if (isLoading && !response) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{t('nav.simResources')}</Title>
        
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input.Search
                placeholder={t('placeholders.searchByIccid')}
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
                filename={`sim-resources-${new Date().toISOString().split('T')[0]}.csv`}
              >
                <Button icon={<ExportOutlined />}>
                  {t('buttons.exportCsv')}
                </Button>
              </CSVLink>
              
              {hasRole('sim_admin') && (
                <>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/sim-resources/create')}
                  >
                    {t('buttons.addSim')}
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => navigate('/sim-resources/batch-import')}
                  >
                    {t('buttons.batchImport')}
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>

        {filterVisible && (
          <Card style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder={t('filters.status')}
                  style={{ width: '100%' }}
                  mode="multiple"
                  onChange={(value) => handleFilterChange('status', value.length ? value : undefined)}
                  allowClear
                >
                  {RESOURCE_STATUS_VALUES.map(status => (
                    <Option key={status} value={status}>
                      <Tag color={getResourceStatusColor(status)}>{formatStatusLabel(status)}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder={t('filters.type')}
                  style={{ width: '100%' }}
                  mode="multiple"
                  onChange={(value) => handleFilterChange('@type' as any, value.length ? value : undefined)}
                  allowClear
                >
                  <Option key="LogicalResource" value="LogicalResource">LogicalResource</Option>
                  <Option key="PhysicalResource" value="PhysicalResource">PhysicalResource</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  placeholder={t('filters.batchId')}
                  onChange={(e) => handleFilterChange('batchId', e.target.value || undefined)}
                  allowClear
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <RangePicker
                  style={{ width: '100%' }}
                  placeholder={[t('filters.createdFrom'), t('filters.createdTo')]}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      const from = dates[0].toISOString();
                      const to = dates[1].toISOString();
                      handleFilterChange('createdDate', `${from},${to}`);
                    } else {
                      handleFilterChange('createdDate', undefined);
                    }
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input
                  placeholder={t('filters.imsi')}
                  onChange={(e) => handleFilterChange('imsi', e.target.value || undefined)}
                  allowClear
                />
              </Col>

              {/* Allocation filters */}
              <Col xs={24} sm={12} md={6}>
                <Input placeholder={t('filters.distributor', { defaultValue: 'Distributor' })}
                  onChange={(e) => handleFilterChange('allocationDistributor' as any, e.target.value || undefined)} allowClear />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input placeholder={t('filters.representative', { defaultValue: 'Representative' })}
                  onChange={(e) => handleFilterChange('allocationRepresentative' as any, e.target.value || undefined)} allowClear />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Input placeholder={t('filters.customer', { defaultValue: 'Customer' })}
                  onChange={(e) => handleFilterChange('allocationCustomer' as any, e.target.value || undefined)} allowClear />
              </Col>

              {/* Custom characteristic filter builder */}
              <Col xs={24}>
                <Card size="small" title={t('filters.customCharacteristics', { defaultValue: 'Custom Field Filters' })}>
                  {charFilters.map((row, idx) => (
                    <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
                      <Col xs={24} sm={8}>
                        <Input placeholder="Name (e.g., Marketplace)" value={row.name}
                          onChange={(e) => {
                            const next = [...charFilters];
                            next[idx] = { ...next[idx], name: e.target.value };
                            applyCharFilters(next);
                          }} />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Input placeholder="Value" value={row.value}
                          onChange={(e) => {
                            const next = [...charFilters];
                            next[idx] = { ...next[idx], value: e.target.value };
                            applyCharFilters(next);
                          }} />
                      </Col>
                      <Col xs={24} sm={4}>
                        <Button danger onClick={() => {
                          const next = charFilters.filter((_, i) => i !== idx);
                          applyCharFilters(next);
                        }}>{t('common.remove', { defaultValue: 'Remove' })}</Button>
                      </Col>
                    </Row>
                  ))}
                  <Button onClick={() => applyCharFilters([...charFilters, { name: '', value: '' }])}>{t('common.add', { defaultValue: 'Add filter' })}</Button>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
        </div>

        {/* Bulk operations toolbar */}
        {hasRole('sim_admin') && selectedRowKeys.length > 0 && (
          <Card size="small" style={{ marginBottom: 12 }}>
            <Space wrap size={8}>
              <Tag color="blue">{selectedRowKeys.length} selected</Tag>
              <Button size="small" onClick={async () => {
                for (const id of selectedRowKeys) {
                  await apiService.updateResourceStatus(String(id), 'reserved');
                }
                message.success(t('messages.updated', { defaultValue: 'Updated' }));
                setSelectedRowKeys([]);
                refetch();
              }}>{t('actions.reserve', { defaultValue: 'Set Reserved' })}</Button>
              <Button size="small" danger onClick={async () => {
                for (const id of selectedRowKeys) {
                  await apiService.updateResourceStatus(String(id), 'disposed');
                }
                message.success(t('messages.updated', { defaultValue: 'Updated' }));
                setSelectedRowKeys([]);
                refetch();
              }}>{t('actions.dispose', { defaultValue: 'Set Disposed' })}</Button>
              <Space.Compact>
                <Input size="small" placeholder={t('fields.marketplace', { defaultValue: 'Marketplace' })} value={marketplaceValue} onChange={(e) => setMarketplaceValue(e.target.value)} style={{ width: 220 }} />
                <Button size="small" type="primary" disabled={!marketplaceValue} onClick={async () => {
                  for (const id of selectedRowKeys) {
                    await apiService.upsertCharacteristic(String(id), 'Marketplace', marketplaceValue);
                  }
                  message.success(t('messages.updated', { defaultValue: 'Updated' }));
                  setSelectedRowKeys([]);
                  setMarketplaceValue('');
                  refetch();
                }}>{t('actions.setMarketplace', { defaultValue: 'Set Marketplace' })}</Button>
              </Space.Compact>

              <Tooltip title={t('buttons.showAllocationControls', { defaultValue: 'Allocation' })}>
                <Popover
                  placement="bottomLeft"
                  trigger="click"
                  content={(
                    <Space direction="vertical" size={8}>
                      {/* Distributor */}
                      <Space.Compact>
                        <Input size="small" placeholder={t('filters.distributor', { defaultValue: 'Distributor ID' })}
                          value={allocDistributorId} onChange={(e) => setAllocDistributorId(e.target.value)} style={{ width: 220 }} />
                        <Button size="small" disabled={!allocDistributorId} onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.setAllocationRelatedParty(String(id), 'Distributor', { id: allocDistributorId, '@referredType': 'Party' });
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setAllocDistributorId('');
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.setDistributor', { defaultValue: 'Set Distributor' })}</Button>
                        <Button size="small" danger onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.clearAllocationByRole(String(id), 'Distributor');
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.clearDistributor', { defaultValue: 'Clear Distributor' })}</Button>
                      </Space.Compact>

                      {/* Representative */}
                      <Space.Compact>
                        <Input size="small" placeholder={t('filters.representative', { defaultValue: 'Representative ID' })}
                          value={allocRepresentativeId} onChange={(e) => setAllocRepresentativeId(e.target.value)} style={{ width: 240 }} />
                        <Button size="small" disabled={!allocRepresentativeId} onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.setAllocationRelatedParty(String(id), 'Representative', { id: allocRepresentativeId, '@referredType': 'Party' });
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setAllocRepresentativeId('');
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.setRepresentative', { defaultValue: 'Set Representative' })}</Button>
                        <Button size="small" danger onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.clearAllocationByRole(String(id), 'Representative');
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.clearRepresentative', { defaultValue: 'Clear Representative' })}</Button>
                      </Space.Compact>

                      {/* Customer */}
                      <Space.Compact>
                        <Input size="small" placeholder={t('filters.customer', { defaultValue: 'Customer ID' })}
                          value={allocCustomerId} onChange={(e) => setAllocCustomerId(e.target.value)} style={{ width: 220 }} />
                        <Button size="small" disabled={!allocCustomerId} onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.setAllocationRelatedParty(String(id), 'Customer', { id: allocCustomerId, '@referredType': 'Party' });
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setAllocCustomerId('');
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.setCustomer', { defaultValue: 'Set Customer' })}</Button>
                        <Button size="small" danger onClick={async () => {
                          for (const id of selectedRowKeys) {
                            await apiService.clearAllocationByRole(String(id), 'Customer');
                          }
                          message.success(t('messages.updated', { defaultValue: 'Updated' }));
                          setSelectedRowKeys([]);
                          refetch();
                        }}>{t('actions.clearCustomer', { defaultValue: 'Clear Customer' })}</Button>
                      </Space.Compact>
                    </Space>
                  )}
                >
                  <Button size="small" icon={<TeamOutlined />} />
                </Popover>
              </Tooltip>
            </Space>
          </Card>
        )}

        <Card>
        <Table
          columns={columns}
          dataSource={simResources}
          rowKey="id"
          loading={isLoading}
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
          rowSelection={hasRole('sim_admin') ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          } : undefined}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default SimResourceList;
