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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { CSVLink } from 'react-csv';
import apiService from '../../services/api.service';
import { SimResource, SimStatus, LifecycleAction, SimResourceSearchCriteria, RESOURCE_STATUS_VALUES } from '../../types/sim.types';
import { useKeycloak } from '../../contexts/KeycloakContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title } = Typography;

interface SimResourceListProps {}

const SimResourceList: React.FC<SimResourceListProps> = () => {
  const navigate = useNavigate();
  const { hasRole } = useKeycloak();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [searchCriteria, setSearchCriteria] = useState<SimResourceSearchCriteria>({
    limit: 20,
    offset: 0,
    sort: '-createdDate',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);

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
        message.success('SIM activated successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to activate SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const suspendMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.suspendSimResource(id, reason),
    {
      onSuccess: () => {
        message.success('SIM suspended successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to suspend SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const terminateMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.terminateSimResource(id, reason),
    {
      onSuccess: () => {
        message.success('SIM terminated successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to terminate SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => apiService.deleteSimResource(id),
    {
      onSuccess: () => {
        message.success('SIM deleted successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to delete SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const releaseMutation = useMutation(
    (id: string) => apiService.releaseSimResource(id),
    {
      onSuccess: () => {
        message.success('SIM released successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to release SIM: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const retireMutation = useMutation(
    ({ id, reason }: { id: string; reason?: string }) => apiService.retireSimResource(id, reason),
    {
      onSuccess: () => {
        message.success('SIM retired successfully');
        queryClient.invalidateQueries('simResources');
        queryClient.invalidateQueries('simStatistics');
      },
      onError: (error: any) => {
        message.error(`Failed to retire SIM: ${error.response?.data?.message || error.message}`);
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

  const handleLifecycleAction = (action: LifecycleAction, sim: SimResource) => {
    const actionMap = {
      [LifecycleAction.ACTIVATE]: () => activateMutation.mutate(sim.id),
      [LifecycleAction.SUSPEND]: () => {
        Modal.confirm({
          title: 'Suspend SIM',
          content: 'Are you sure you want to suspend this SIM?',
          onOk: () => suspendMutation.mutate({ id: sim.id }),
        });
      },
      [LifecycleAction.TERMINATE]: () => {
        Modal.confirm({
          title: 'Terminate SIM',
          content: 'Are you sure you want to terminate this SIM? This action cannot be undone.',
          onOk: () => terminateMutation.mutate({ id: sim.id }),
        });
      },
      [LifecycleAction.RELEASE]: () => {
        Modal.confirm({
          title: 'Release SIM',
          content: 'This will release the SIM resource. Continue?',
          onOk: () => releaseMutation.mutate(sim.id),
        });
      },
      [LifecycleAction.RETIRE]: () => {
        Modal.confirm({
          title: 'Retire SIM',
          content: 'Are you sure you want to retire this SIM? This action cannot be undone.',
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

  const getStatusColor = (status?: string | SimStatus, record?: any) => {
    const stateChar = record ? String(getChar(record, 'RESOURCE_STATE') || '').toLowerCase() : '';
    const s = stateChar || String(status || '').toLowerCase();
    switch (s) {
      // New ResourceStatus values
      case 'available': return 'green';
      case 'reserved': return 'gold';
      case 'standby': return 'cyan';
      case 'suspended': return 'orange';
      case 'alarm': return 'red';
      case 'completed': return 'green';
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
          label: 'Activate',
          icon: <PlayCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.ACTIVATE, sim),
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'active':
      case 'reserved':
        actions.push({
          key: 'suspend',
          label: 'Suspend',
          icon: <PauseCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.SUSPEND, sim),
        });
        actions.push({
          key: 'terminate',
          label: 'Terminate',
          icon: <StopOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.TERMINATE, sim),
        });
        break;
      case 'suspended':
        actions.push({
          key: 'activate',
          label: 'Reactivate',
          icon: <PlayCircleOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.ACTIVATE, sim),
        });
        actions.push({
          key: 'terminate',
          label: 'Terminate',
          icon: <StopOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.TERMINATE, sim),
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'cancelled':
      case 'terminated':
        actions.push({
          key: 'release',
          label: 'Release',
          icon: <UnlockOutlined />,
          onClick: () => handleLifecycleAction(LifecycleAction.RELEASE, sim),
        });
        actions.push({
          key: 'retire',
          label: 'Retire',
          icon: <RestOutlined />,
          danger: true,
          onClick: () => handleLifecycleAction(LifecycleAction.RETIRE, sim),
        });
        break;
      case 'completed':
        // No further lifecycle actions
        break;
    }

    if (status === 'available' && hasRole('sim_admin')) {
      actions.push({
        key: 'delete',
        label: 'Delete',
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
        return (
          <Tag color={getStatusColor(s as any)}>
            {s || '-'}
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
          <Tag color={getStatusColor(state as any)}>
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
      render: (_: any, record: any) => record?.createdDate ? new Date(record.createdDate).toLocaleString() : '-',
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
          label: 'View',
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
              title="Actions"
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
                      <Tag color={getStatusColor(status)}>{status}</Tag>
                    </Option>
                  ))}
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder={t('filters.type')}
                  style={{ width: '100%' }}
                  mode="multiple"
                  onChange={(value) => handleFilterChange('type', value.length ? value : undefined)}
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
            </Row>
          </Card>
        )}
        </div>

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
