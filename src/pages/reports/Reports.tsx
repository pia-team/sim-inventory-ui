import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Table,
  Typography,
  Space,
  Divider,
  Progress,
} from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { CSVLink as CSVLinkComponent } from 'react-csv';
import apiService from '../../services/api.service';
import { SimType } from '../../types/sim.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../../utils/format';

// Helper to read a characteristic value (e.g., IMSI, BatchId)
const getChar = (sim: any, key: string) =>
  sim?.resourceCharacteristic?.find((c: any) => String(c?.name || '').toLowerCase() === key.toLowerCase())?.value;

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Cast to any to avoid TS2786 from outdated react-csv types with React 18
const CSVLink: any = CSVLinkComponent;

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>();
  // Applied filter states (updated only when user clicks "Apply Filters")
  const [appliedDateRange, setAppliedDateRange] = useState<[any, any] | null>(null);
  const [appliedBatch, setAppliedBatch] = useState<string | undefined>();
  const { t } = useTranslation();

  const handleApplyFilters = () => {
    setAppliedDateRange(dateRange);
    setAppliedBatch(selectedBatch);
  };

  // Fetch statistics
  const { data: statsResponse, isLoading: statsLoading, refetch } = useQuery(
    'simStatistics',
    () => apiService.getSimStatistics(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch recent activity (SIMs)
  const { data: activityResponse, isLoading: activityLoading } = useQuery(
    'recentActivity',
    () => apiService.getSimResources({ 
      limit: 100, 
      sort: '-createdDate', 
    })
  );

  const stats = statsResponse?.data;
  const recentSimsRaw = Array.isArray(activityResponse?.data)
    ? (activityResponse?.data as any)
    : (activityResponse?.data?.data || []);

  // Apply basic filters
  const toDate = (d: any) => (d && typeof d?.toDate === 'function') ? d.toDate() : (d ? new Date(d) : undefined);
  const start = appliedDateRange?.[0] ? toDate(appliedDateRange[0]) : undefined;
  const end = appliedDateRange?.[1] ? toDate(appliedDateRange[1]) : undefined;
  const inRange = (dt: any) => {
    const x = dt ? new Date(dt) : undefined;
    if (!x) return true;
    if (start && x < start) return false;
    if (end && x > end) return false;
    return true;
  };

  const recentSims = recentSimsRaw.filter((sim: any) => inRange(sim.createdDate));

  // Calculate status distribution percentages (use canonical keys for i18n)
  const totalSims = stats?.total || 0;
  const statusDistribution = [
    { key: 'available', count: stats?.available || 0, color: 'var(--success-color)' },
    { key: 'reserved', count: stats?.reserved || 0, color: 'var(--warning-color)' },
    { key: 'inUse', count: stats?.inUse || 0, color: 'var(--info-color)' },
    { key: 'disposed', count: stats?.disposed || 0, color: 'var(--text-color)' },
    { key: 'allocated', count: stats?.allocated || 0, color: 'var(--primary-color)' },
    { key: 'active', count: stats?.active || 0, color: 'var(--info-color)' },
    { key: 'suspended', count: stats?.suspended || 0, color: 'var(--warning-color)' },
    { key: 'terminated', count: stats?.terminated || 0, color: 'var(--error-color)' },
    { key: 'retired', count: stats?.retired || 0, color: 'var(--text-color-secondary)' },
  ];

  // Activity analysis by date
  const activityByDate = recentSims.reduce((acc: any, sim: any) => {
    const date = new Date(sim.createdDate).toDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const activityData = Object.entries(activityByDate)
    .slice(0, 7)
    .map(([date, count]) => ({ date, count }));

  const batchColumns = [
    {
      title: t('sim.batchId'),
      dataIndex: 'batchId',
      key: 'batchId',
      render: (batchId: string) => batchId || t('dashboard.noBatch'),
    },
    {
      title: t('dashboard.totalSims'),
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <Text strong>{count.toLocaleString()}</Text>
      ),
    },
    {
      title: t('reports.distribution'),
      key: 'distribution',
      render: (_: any, record: any) => {
        const percentage = totalSims > 0 ? (record.count / totalSims * 100).toFixed(1) : '0';
        return (
          <div style={{ width: 150 }}>
            <Progress 
              percent={parseFloat(percentage)} 
              size="small"
              format={() => `${percentage}%`}
            />
          </div>
        );
      },
    },
  ];

  const batchAll = Object.entries(stats?.byBatch || {}).map(([batchId, count]) => ({ key: batchId, batchId, count }));
  const batchData = appliedBatch ? batchAll.filter(b => b.batchId === appliedBatch) : batchAll;

  const exportData = recentSims.map((sim: any) => ({
    ICCID: getChar(sim, 'ICCID') || sim.name || sim.id,
    IMSI: getChar(sim, 'IMSI') || '',
    Type: sim.type || sim['@type'] || sim?.resourceSpecification?.name || '',
    Status: sim.resourceStatus || sim.status || '',
    State: getChar(sim, 'RESOURCE_STATE') || '',
    BatchID: getChar(sim, 'BatchId') || '',
    Created: sim.createdDate ? new Date(sim.createdDate).toISOString() : '',
  }));

  if (statsLoading && !stats) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>{t('nav.reports')}</Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={statsLoading}
              >
                {t('common.refresh')}
              </Button>
              <CSVLink
                data={exportData}
                filename={`sim-inventory-report-${new Date().toISOString().split('T')[0]}.csv`}
              >
                <Button icon={<DownloadOutlined />}>
                  {t('reports.exportReport')}
                </Button>
              </CSVLink>
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={[t('reports.startDate'), t('reports.endDate')]}
              onChange={setDateRange}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              placeholder={t('reports.selectBatch')}
              style={{ width: '100%' }}
              allowClear
              onChange={setSelectedBatch}
            >
              {Object.keys(stats?.byBatch || {}).map(batchId => (
                <Option key={batchId} value={batchId}>
                  {batchId}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Button
              icon={<FilterOutlined />}
              style={{ width: '100%' }}
              onClick={handleApplyFilters}
            >
              {t('reports.applyFilters')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('dashboard.totalSims')}
              value={totalSims}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: 'var(--primary-color)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('dashboard.available')}
              value={stats?.available || 0}
              valueStyle={{ color: 'var(--success-color)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('dashboard.active')}
              value={stats?.active || 0}
              valueStyle={{ color: 'var(--info-color)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('sim.statusValues.suspended')}
              value={stats?.suspended || 0}
              valueStyle={{ color: 'var(--warning-color)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('sim.statusValues.terminated')}
              value={stats?.terminated || 0}
              valueStyle={{ color: 'var(--error-color)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('reports.totalBatches')}
              value={Object.keys(stats?.byBatch || {}).length}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Status Distribution */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={t('reports.statusDistribution')}>
            <Row gutter={[8, 16]}>
              {statusDistribution.map((item, index) => (
                <Col xs={24} key={index}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: item.color,
                        borderRadius: 2,
                        marginRight: 8,
                      }}
                    />
                    <Text style={{ flex: 1 }}>{t(`sim.statusValues.${item.key}`)}</Text>
                    <Text strong>{item.count.toLocaleString()}</Text>
                  </div>
                  <Progress
                    percent={totalSims > 0 ? (item.count / totalSims * 100) : 0}
                    strokeColor={item.color}
                    showInfo={false}
                    size="small"
                    style={{ marginBottom: 8 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('reports.simTypeDistribution')}>
            <Row gutter={[16, 16]}>
              {Object.entries(stats?.byType || {}).map(([type, count]) => (
                <Col xs={24} key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text>{type}</Text>
                    <Text strong>{(count as number).toLocaleString()}</Text>
                  </div>
                  <Progress
                    percent={totalSims > 0 ? ((count as number) / totalSims * 100) : 0}
                    strokeColor={type === SimType.ESIM ? 'var(--info-color)' : 'var(--primary-color)'}
                    showInfo={false}
                    size="small"
                  />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Batch Analysis */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title={t('reports.batchAnalysis')} loading={statsLoading}>
            <Table
              columns={batchColumns}
              dataSource={batchData}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} ${t('reports.ofBatches', { total })}`,
              }}
              size="small"
              rowKey="key"
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Activity */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={t('reports.recentActivityLast7Days')} loading={activityLoading}>
            {activityData.length > 0 ? (
              <Row gutter={[16, 16]}>
                {activityData.map((item, index) => (
                  <Col xs={24} sm={12} md={8} lg={6} xl={4} key={index}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {String(item.count)}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {formatDateTime(item.date).split(' ')[0]}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, opacity: 0.75 }}>
                {t('reports.noRecentActivity')}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title={t('reports.utilizationRate')}
              value={totalSims > 0 ? (((stats?.active || 0) / totalSims) * 100).toFixed(1) : 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: 'var(--info-color)' }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('reports.utilizationHint')}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title={t('reports.issueRate')}
              value={totalSims > 0 ? ((((stats?.suspended || 0) + (stats?.terminated || 0)) / totalSims) * 100).toFixed(1) : 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: 'var(--error-color)' }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('reports.issueHint')}
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
