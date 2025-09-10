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
import { CSVLink } from 'react-csv';
import apiService from '../../services/api.service';
import { SimType } from '../../types/sim.types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | undefined>();
  const { t } = useTranslation();

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
      sort: 'createdDate', 
    })
  );

  const stats = statsResponse?.data;
  const recentSimsRaw = Array.isArray(activityResponse?.data)
    ? (activityResponse?.data as any)
    : (activityResponse?.data?.data || []);

  // Apply basic filters
  const toDate = (d: any) => (d && typeof d?.toDate === 'function') ? d.toDate() : (d ? new Date(d) : undefined);
  const start = dateRange?.[0] ? toDate(dateRange[0]) : undefined;
  const end = dateRange?.[1] ? toDate(dateRange[1]) : undefined;
  const inRange = (dt: any) => {
    const x = dt ? new Date(dt) : undefined;
    if (!x) return true;
    if (start && x < start) return false;
    if (end && x > end) return false;
    return true;
  };

  const recentSims = recentSimsRaw.filter((sim: any) => inRange(sim.createdDate));

  // Calculate status distribution percentages
  const totalSims = stats?.total || 0;
  const statusDistribution = [
    { status: 'Available', count: stats?.available || 0, color: '#52c41a' },
    { status: 'Allocated', count: stats?.allocated || 0, color: '#1890ff' },
    { status: 'Active', count: stats?.active || 0, color: '#13c2c2' },
    { status: 'Suspended', count: stats?.suspended || 0, color: '#faad14' },
    { status: 'Terminated', count: stats?.terminated || 0, color: '#ff4d4f' },
    { status: 'Retired', count: stats?.retired || 0, color: '#d9d9d9' },
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
  const batchData = selectedBatch ? batchAll.filter(b => b.batchId === selectedBatch) : batchAll;

  const exportData = recentSims.map((sim: any) => ({
    ICCID: sim.iccid,
    IMSI: sim.imsi || '',
    Type: sim.type,
    Status: sim.status,
    BatchID: sim.batchId || '',
    Created: new Date(sim.createdDate).toISOString(),
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
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('dashboard.available')}
              value={stats?.available || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('dashboard.active')}
              value={stats?.active || 0}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('sim.statusValues.suspended')}
              value={stats?.suspended || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title={t('sim.statusValues.terminated')}
              value={stats?.terminated || 0}
              valueStyle={{ color: '#ff4d4f' }}
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
                    <Text style={{ flex: 1 }}>{t(`sim.statusValues.${item.status.toLowerCase()}`)}</Text>
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
                    strokeColor={type === SimType.ESIM ? '#722ed1' : '#1890ff'}
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
                      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                        {String(item.count)}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {new Date(item.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
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
              valueStyle={{ color: '#13c2c2' }}
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
              valueStyle={{ color: '#ff4d4f' }}
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
