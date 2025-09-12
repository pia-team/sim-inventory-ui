import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  message,
  Upload,
  Table,
  Alert,
  Steps,
  Row,
  Col,
  Divider,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from 'react-query';
import type { UploadFile, UploadProps } from 'antd';
import { CSVLink } from 'react-csv';
import apiService from '../../services/api.service';
import { BatchSimImportRequest, BatchSimImportResponse, SimType, ProfileType, BulkResourceCreateRequest } from '../../types/sim.types';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ParsedSim {
  iccid: string;
  type: SimType;
  profileType?: ProfileType;
  description?: string;
  name?: string;
  valid: boolean;
  errors: string[];
}

const BatchImport: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedSim[]>([]);
  const [importResult, setImportResult] = useState<BatchSimImportResponse | null>(null);
  const [batchId, setBatchId] = useState<string>('');
  const [useBulkTemplate, setUseBulkTemplate] = useState<boolean>(false);
  const [bulkEligibility, setBulkEligibility] = useState<{
    eligible: boolean;
    reason?: string;
    type?: SimType;
    commonPrefix?: string;
    suffixLength?: number;
    minSuffix?: number;
    maxSuffix?: number;
    valueFrom?: string;
    valueTo?: string;
    valueMask?: string;
    commonProfile?: ProfileType | undefined;
  } | null>(null);
  const [bulkJobResult, setBulkJobResult] = useState<any | null>(null);

  const importMutation = useMutation(
    (data: BatchSimImportRequest) => apiService.batchImportSims(data),
    {
      onSuccess: (response) => {
        if (response.success) {
          setImportResult(response.data!);
          setCurrentStep(2);
          message.success(`Batch import completed. ${response.data?.successCount} SIMs imported successfully.`);
          queryClient.invalidateQueries('simResources');
          queryClient.invalidateQueries('simStatistics');
        } else {
          message.error(response.error?.message || 'Failed to import SIMs');
        }
      },
      onError: (error: any) => {
        message.error(`Failed to import SIMs: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const parseCSVContent = (content: string): ParsedSim[] => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    // Skip header if present
    const hasHeader = lines[0].toLowerCase().includes('iccid');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line, index) => {
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      const sim: ParsedSim = {
        iccid: columns[0] || '',
        type: (columns[1] as SimType) || SimType.PHYSICAL,
        profileType: columns[2] as ProfileType || undefined,
        description: columns[3] || undefined,
        name: columns[4] || undefined,
        valid: true,
        errors: [],
      };

      // Validation
      if (!sim.iccid) {
        sim.errors.push('ICCID is required');
        sim.valid = false;
      } else if (!/^\d{19,20}$/.test(sim.iccid)) {
        sim.errors.push('ICCID must be 19-20 digits');
        sim.valid = false;
      }

      if (!Object.values(SimType).includes(sim.type)) {
        sim.errors.push('Invalid SIM type');
        sim.valid = false;
      }

      if (sim.profileType && !Object.values(ProfileType).includes(sim.profileType)) {
        sim.errors.push('Invalid profile type');
        sim.valid = false;
      }

      return sim;
    });

    // Duplicate ICCID pre-check: mark all duplicate ICCIDs as invalid
    const counts: Record<string, number> = {};
    parsed.forEach((s) => {
      if (s.valid && s.iccid && /^\d{19,20}$/.test(s.iccid)) {
        counts[s.iccid] = (counts[s.iccid] || 0) + 1;
      }
    });
    parsed.forEach((s) => {
      if (s.iccid && counts[s.iccid] > 1) {
        s.errors.push('Duplicate ICCID in file');
        s.valid = false;
      }
    });

    return parsed;
  };

  // Analyze ICCIDs to see if they can be represented by a contiguous masked range
  const analyzeEligibility = (data: ParsedSim[]) => {
    const valid = data.filter(d => d.valid);
    if (valid.length === 0) return { eligible: false, reason: 'No valid records' } as const;
    // All ICCIDs same length and numeric
    const len = valid[0].iccid.length;
    if (!valid.every(v => v.iccid.length === len && /^\d+$/.test(v.iccid))) {
      return { eligible: false, reason: 'ICCID lengths differ or contain non-digits' } as const;
    }
    // All types equal
    const type = valid[0].type;
    if (!valid.every(v => v.type === type)) {
      return { eligible: false, reason: 'Mixed SIM types' } as const;
    }
    // Determine longest common prefix
    const iccids = valid.map(v => v.iccid);
    let prefix = iccids[0];
    for (let i = 1; i < iccids.length; i++) {
      let j = 0;
      while (j < prefix.length && j < iccids[i].length && prefix[j] === iccids[i][j]) j++;
      prefix = prefix.slice(0, j);
      if (prefix.length === 0) break;
    }
    if (prefix.length === len) {
      // all equal -> treat as non-range (not suitable for bulk mask)
      return { eligible: false, reason: 'All ICCIDs identical' } as const;
    }
    // Variable part is trailing digits
    const suffixes = iccids.map(id => id.slice(prefix.length));
    const suffixLen = suffixes[0].length;
    if (!suffixes.every(s => s.length === suffixLen && /^\d+$/.test(s))) {
      return { eligible: false, reason: 'Variable part is not numeric or inconsistent' } as const;
    }
    const nums = suffixes.map(s => parseInt(s, 10));
    const set = new Set(nums);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (max - min + 1 !== set.size) {
      return { eligible: false, reason: 'ICCID suffixes are not contiguous' } as const;
    }
    // Optional: common profile type across all or undefined
    const profiles = new Set(valid.map(v => v.profileType || '')); // '' for undefined
    const commonProfile = profiles.size === 1 ? (valid[0].profileType || undefined) : undefined;
    const pad = (n: number) => n.toString().padStart(suffixLen, '0');
    const valueFrom = prefix + pad(min);
    const valueTo = prefix + pad(max);
    const valueMask = '0'.repeat(suffixLen);
    return {
      eligible: true,
      type,
      commonPrefix: prefix,
      suffixLength: suffixLen,
      minSuffix: min,
      maxSuffix: max,
      valueFrom,
      valueTo,
      valueMask,
      commonProfile,
    } as const;
  };

  useEffect(() => {
    setBulkEligibility(analyzeEligibility(parsedData));
  }, [parsedData]);

  const uploadProps: UploadProps = {
    accept: '.csv',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const parsed = parseCSVContent(content);
        setParsedData(parsed);
        setCurrentStep(1);
      };
      reader.readAsText(file);
      return false; // Prevent auto upload
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onRemove: () => {
      setParsedData([]);
      setCurrentStep(0);
    },
  };

  const bulkMutation = useMutation((payload: BulkResourceCreateRequest) => apiService.bulkResourceCreateJob(payload), {
    onSuccess: (res) => {
      if (res.success) {
        setBulkJobResult(res.data);
        setCurrentStep(2);
        message.success('Bulk create job submitted');
      } else {
        message.error(res.error?.message || 'Bulk create failed');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err.message || 'Bulk create failed');
    },
  });

  const handleImport = (values: any) => {
    const validSims = parsedData.filter(sim => sim.valid);
    setBatchId(values.batchId);

    if (useBulkTemplate) {
      let elig = bulkEligibility;
      if (!elig || !elig.eligible) {
        elig = analyzeEligibility(validSims);
        setBulkEligibility(elig as any);
      }
      if (!elig.eligible) {
        message.error(`Bulk Template is not eligible: ${elig.reason}`);
        return;
      }
      const baseType = elig.type === SimType.ESIM ? 'LogicalResource' : 'PhysicalResource';
      const payload: BulkResourceCreateRequest = {
        jobReference: values.batchId,
        itemCount: validSims.length,
        baseResource: {
          '@type': baseType,
          name: values.baseName || values.batchId,
          description: values.description || undefined,
          resourceCharacteristic: [
            { name: 'BatchId', value: values.batchId, valueType: 'string' },
            ...(elig.commonProfile ? [{ name: 'ProfileType', value: elig.commonProfile, valueType: 'string' } as any] : []),
          ],
        },
        bulkCharacteristic: [
          {
            name: 'ICCID',
            valueFrom: elig.valueFrom!,
            valueMask: elig.valueMask!,
            valueTo: elig.valueTo!,
            isPopulateCharacteristicValueToResourceName: false,
          },
        ],
      };
      bulkMutation.mutate(payload);
      return;
    }

    const request: BatchSimImportRequest = {
      batchId: values.batchId,
      description: values.description,
      sims: validSims.map(sim => ({
        '@type': sim.type === SimType.ESIM ? 'LogicalResource' : 'PhysicalResource',
        name: sim.name || sim.iccid,
        description: sim.description,
        resourceCharacteristic: [
          { name: 'ICCID', value: sim.iccid, valueType: 'string' },
          { name: 'SIMType', value: sim.type, valueType: 'string' },
          ...(sim.profileType ? [{ name: 'ProfileType', value: sim.profileType, valueType: 'string' } as any] : []),
          { name: 'BatchId', value: values.batchId, valueType: 'string' },
        ],
      })),
    };
    importMutation.mutate(request);
  };

  const validCount = parsedData.filter(sim => sim.valid).length;
  const invalidCount = parsedData.length - validCount;

  const previewColumns = [
    {
      title: 'Line',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'ICCID',
      dataIndex: 'iccid',
      key: 'iccid',
      width: 200,
      render: (iccid: string, record: ParsedSim) => (
        <span style={{ 
          fontFamily: 'monospace',
          color: record.valid ? undefined : 'var(--error-color)'
        }}>
          {iccid}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: 'Profile Type',
      dataIndex: 'profileType',
      key: 'profileType',
      width: 120,
      render: (type: string) => type || '-',
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_: any, record: ParsedSim) => (
        record.valid ? (
          <CheckCircleOutlined style={{ color: 'var(--success-color)' }} />
        ) : (
          <ExclamationCircleOutlined style={{ color: 'var(--error-color)' }} />
        )
      ),
    },
    {
      title: 'Errors',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors: string[]) => (
        errors.length > 0 ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {errors.join(', ')}
          </Text>
        ) : null
      ),
    },
  ];

  const sampleData = [
    ['ICCID', 'Type', 'Profile Type', 'Description', 'Name'],
    ['89014103211118510720', 'Physical', 'Prepaid', 'Sample SIM 1', 'SIM-001'],
    ['89014103211118510721', 'eSIM', 'Postpaid', 'Sample SIM 2', 'SIM-002'],
    ['89014103211118510722', 'Physical', '', 'Sample SIM 3', ''],
  ];

  const steps = [
    {
      title: t('batchImport.steps.uploadFile'),
      description: t('batchImport.upload.selectFile'),
      icon: <UploadOutlined />,
    },
    {
      title: t('batchImport.steps.reviewData'),
      description: t('batchImport.preview.title'),
      icon: <FileTextOutlined />,
    },
    {
      title: t('batchImport.steps.importResults'),
      description: t('batchImport.result.title'),
      icon: <CheckCircleOutlined />,
    },
  ];

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
            {t('batchImport.title')}
          </Title>
        </Space>
      </div>

      <Card>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {/* Step 0: Upload File */}
        {currentStep === 0 && (
          <div>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Title level={4}>{t('batchImport.upload.sectionTitle')}</Title>
                <Paragraph>
                  {t('batchImport.upload.selectFile')}
                </Paragraph>
                <ul>
                  <li><strong>ICCID</strong> (required): 19-20 digit unique identifier</li>
                  <li><strong>Type</strong> (required): Physical or eSIM</li>
                  <li><strong>Profile Type</strong> (optional): Prepaid or Postpaid</li>
                  <li><strong>Description</strong> (optional): SIM description</li>
                  <li><strong>Name</strong> (optional): Human-readable name</li>
                </ul>

                <Card size="small" style={{ marginTop: 16 }} bodyStyle={{ padding: 12 }}>
                  <Dragger {...uploadProps} className="uploader" style={{ width: '100%' }}>
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">{t('batchImport.upload.dragText')}</p>
                    <p className="ant-upload-hint">{t('batchImport.upload.dragHint')}</p>
                  </Dragger>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Title level={4}>{t('batchImport.sample.title')}</Title>
                <Card size="small">
                  <CSVLink
                    data={sampleData}
                    filename="sim-import-sample.csv"
                  >
                    {t('buttons.downloadSampleCsv')}
                  </CSVLink>
                  <pre style={{ marginTop: 16, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`ICCID,Type,Profile Type,Description,Name
89014103211118510720,Physical,Prepaid,Sample SIM 1,SIM-001
89014103211118510721,eSIM,Postpaid,Sample SIM 2,SIM-002
89014103211118510722,Physical,,Sample SIM 3,`}
                  </pre>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {currentStep === 2 && !importResult && bulkJobResult && (
          <div>
            <Alert
              message={t('batchImport.bulk.jobSubmitted')}
              description={t('batchImport.bulk.jobSubmittedDesc')}
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Card title={t('batchImport.bulk.responseTitle')} size="small" style={{ marginBottom: 24 }}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(bulkJobResult, null, 2)}</pre>
            </Card>

            <Space>
              <Button
                type="primary"
                onClick={() => navigate('/sim-resources')}
              >
                {t('buttons.viewSimResources')}
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  setFileList([]);
                  setParsedData([]);
                  setImportResult(null);
                  setBulkJobResult(null);
                  form.resetFields();
                }}
              >
                {t('buttons.startNewImport')}
              </Button>
            </Space>
          </div>
        )}

        {/* Step 1: Review Data */}
        {currentStep === 1 && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: 'var(--primary-color)' }}>
                      {parsedData.length}
                    </Title>
                    <Text>{t('batchImport.metrics.totalRecords')}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: 'var(--success-color)' }}>
                      {validCount}
                    </Title>
                    <Text>{t('batchImport.metrics.validRecords')}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: 'var(--error-color)' }}>
                      {invalidCount}
                    </Title>
                    <Text>{t('batchImport.metrics.invalidRecords')}</Text>
                  </div>
                </Card>
              </Col>
            </Row>

            {invalidCount > 0 && (
              <Alert
                message={t('batchImport.validation.title')}
                description={t('batchImport.validation.description', { count: invalidCount })}
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            <Card title={t('batchImport.preview.title')} size="small" style={{ marginBottom: 24 }}>
              <Table
                columns={previewColumns}
                dataSource={parsedData}
                rowKey={(record, index) => `${record.iccid}-${index}`}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ x: 800 }}
                rowClassName={(record) => !record.valid ? 'row-error' : ''}
              />
            </Card>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleImport}
              disabled={validCount === 0}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('batchImport.form.batchId')}
                    name="batchId"
                    rules={[{ required: true, message: t('batchImport.form.batchIdRequired') }]}
                    extra={t('batchImport.form.batchIdHelp')}
                  >
                    <Input placeholder="e.g., BATCH-2024-001" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('common.description')}
                    name="description"
                  >
                    <Input placeholder={t('batchImport.form.descriptionHelp')} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label={t('batchImport.form.useBulkTemplate')} name="useBulkTemplate" valuePropName="checked">
                    <Switch checked={useBulkTemplate} onChange={setUseBulkTemplate} />
                  </Form.Item>
                </Col>
                {useBulkTemplate && (
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={t('batchImport.form.baseName')}
                      name="baseName"
                      rules={[{ required: true, message: t('batchImport.form.baseNameRequired') }]}
                    >
                      <Input placeholder="e.g., SIM Base" />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              {useBulkTemplate && (
                <Card size="small" style={{ marginBottom: 16 }} title={t('batchImport.bulk.eligibilityTitle')}>
                  {bulkEligibility?.eligible ? (
                    <div>
                      <Paragraph type="secondary" style={{ marginBottom: 8 }}>{t('batchImport.bulk.eligibleDesc')}</Paragraph>
                      <ul>
                        <li><strong>{t('batchImport.eligibility.type')}</strong>: {bulkEligibility.type}</li>
                        <li><strong>{t('batchImport.eligibility.commonPrefix')}</strong>: <span style={{ fontFamily: 'monospace' }}>{bulkEligibility.commonPrefix}</span></li>
                        <li><strong>{t('batchImport.eligibility.variableLength')}</strong>: {bulkEligibility.suffixLength}</li>
                        <li><strong>{t('batchImport.eligibility.from')}</strong>: <span style={{ fontFamily: 'monospace' }}>{bulkEligibility.valueFrom}</span></li>
                        <li><strong>{t('batchImport.eligibility.to')}</strong>: <span style={{ fontFamily: 'monospace' }}>{bulkEligibility.valueTo}</span></li>
                        <li><strong>{t('batchImport.eligibility.mask')}</strong>: <span style={{ fontFamily: 'monospace' }}>{bulkEligibility.valueMask}</span></li>
                        {bulkEligibility.commonProfile && <li><strong>{t('batchImport.eligibility.profileType')}</strong>: {bulkEligibility.commonProfile}</li>}
                      </ul>
                    </div>
                  ) : (
                    <Alert type="warning" showIcon message={t('batchImport.bulk.notEligible')} description={bulkEligibility?.reason || t('batchImport.bulk.notEligibleDesc')} />
                  )}
                </Card>
              )}

              <Divider />

              <Space>
                <Button
                  onClick={() => setCurrentStep(0)}
                  disabled={importMutation.isLoading}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={validCount === 0}
                  loading={importMutation.isLoading || bulkMutation.isLoading}
                >
                  {useBulkTemplate ? t('buttons.submitBulkJob') : `Import ${validCount} SIM${validCount !== 1 ? 's' : ''}`}
                </Button>
              </Space>
            </Form>
          </div>
        )}

        {/* Step 2: Import Results */}
        {currentStep === 2 && importResult && (
          <div>
            <Alert
              message={t('batchImport.result.title')}
              description={t('batchImport.result.description', { success: importResult.successCount, total: importResult.totalCount })}
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0 }}>
                      {importResult.totalCount}
                    </Title>
                    <Text>{t('batchImport.result.totalProcessed')}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: 'var(--success-color)' }}>
                      {importResult.successCount}
                    </Title>
                    <Text>{t('batchImport.result.successful')}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: 'var(--error-color)' }}>
                      {importResult.failureCount}
                    </Title>
                    <Text>{t('batchImport.result.failed')}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Text strong>{t('batchImport.result.batchId')}</Text>
                    <div style={{ fontFamily: 'monospace', marginTop: 4 }}>
                      {batchId}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {importResult.failures && importResult.failures.length > 0 && (
              <Card title={t('batchImport.result.failedTitle')} size="small" style={{ marginBottom: 24 }}>
                <Table
                  columns={[
                    {
                      title: t('batchImport.preview.columns.line'),
                      dataIndex: 'lineNumber',
                      key: 'lineNumber',
                      width: 60,
                    },
                    {
                      title: t('batchImport.preview.columns.iccid'),
                      dataIndex: 'iccid',
                      key: 'iccid',
                      render: (iccid: string) => (
                        <span style={{ fontFamily: 'monospace' }}>{iccid}</span>
                      ),
                    },
                    {
                      title: t('batchImport.preview.columns.error'),
                      dataIndex: 'error',
                      key: 'error',
                      render: (error: string) => (
                        <Text type="danger">{error}</Text>
                      ),
                    },
                  ]}
                  dataSource={importResult.failures}
                  rowKey="iccid"
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            <Space>
              <Button
                type="primary"
                onClick={() => navigate('/sim-resources')}
              >
                {t('buttons.viewSimResources')}
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep(0);
                  setFileList([]);
                  setParsedData([]);
                  setImportResult(null);
                  form.resetFields();
                }}
              >
                {t('buttons.importAnotherBatch')}
              </Button>
            </Space>
          </div>
        )}
      </Card>

      <style>{`
        .row-error {
          background-color: color-mix(in srgb, var(--error-color) 8%, var(--card-bg));
        }

        /* Ensure dragger texts wrap within the available width */
        .uploader .ant-upload-text,
        .uploader .ant-upload-hint {
          white-space: normal;
          word-break: break-word;
        }

        /* Base sizing for the drag area */
        .uploader .ant-upload,
        .uploader .ant-upload-drag {
          width: 100%;
        }
        .uploader .ant-upload-drag {
          padding: 10px 10px;
          height: 112px !important; /* increased height */
          min-height: 112px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        .uploader .ant-upload-drag-icon { margin-bottom: 4px; }
        .uploader .ant-upload-drag-icon .anticon { font-size: 22px; }
        .uploader .ant-upload-text { margin: 0; line-height: 1.2; }
        .uploader .ant-upload-hint { margin: 2px 0 0; line-height: 1.2; }

        /* Large tablets / small desktops */
        @media (max-width: 1200px) {
          .uploader .ant-upload-drag { height: 100px !important; min-height: 100px; }
          .uploader .ant-upload-drag-icon .anticon { font-size: 20px; }
        }

        /* Tablets */
        @media (max-width: 992px) {
          .uploader .ant-upload-drag { height: 90px !important; min-height: 90px; padding: 8px 8px; }
          .uploader .ant-upload-drag-icon .anticon { font-size: 18px; }
          .uploader .ant-upload-text {
            font-size: 12px;
          }
          .uploader .ant-upload-hint {
            font-size: 10px;
          }
        }

        /* Responsive font sizes for small screens */
        @media (max-width: 768px) {
          .uploader .ant-upload-drag { height: 84px !important; min-height: 84px; padding: 6px 6px; }
          .uploader .ant-upload-drag-icon { margin-bottom: 2px; }
          .uploader .ant-upload-drag-icon .anticon { font-size: 16px; }
          .uploader .ant-upload-text { font-size: 11px; }
          .uploader .ant-upload-hint { display: none; }
        }

        /* Phones */
        @media (max-width: 576px) {
          .uploader .ant-upload-drag { height: 72px !important; min-height: 72px; padding: 6px 8px; }
          .uploader .ant-upload-drag-icon { display: none; }
          .uploader .ant-upload-text { font-size: 11px; }
        }

        /* Small phones */
        @media (max-width: 480px) {
          .uploader .ant-upload-drag { height: 64px !important; min-height: 64px; padding: 4px 6px; }
          .uploader .ant-upload-text { font-size: 10px; }
          .uploader .ant-upload-hint { display: none; }
        }

        /* Upload list styling: make filename bold and delete button more visible */
        .uploader .ant-upload-list { margin-top: 8px; }
        .uploader .ant-upload-list-item {
          padding: 8px 12px;
          border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
          background: color-mix(in srgb, var(--primary-color) 8%, var(--card-bg));
          border-radius: 6px;
        }
        .uploader .ant-upload-list-item .ant-upload-list-item-name {
          font-weight: 600;
          color: var(--text-color);
          font-size: 13px;
        }
        .uploader .ant-upload-list-item-actions .ant-btn,
        .uploader .ant-upload-list-item-actions .ant-btn-icon-only,
        .uploader .ant-upload-list-item-action .ant-btn,
        .uploader .ant-upload-list-item-action .ant-btn-icon-only,
        .uploader .ant-upload-list-item-action > button,
        .uploader .ant-upload-list-item-action > a {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid color-mix(in srgb, var(--error-color) 35%, transparent);
          background: color-mix(in srgb, var(--error-color) 12%, var(--card-bg));
          color: var(--error-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .uploader .ant-upload-list-item-actions .ant-btn:hover,
        .uploader .ant-upload-list-item-actions .ant-btn-icon-only:hover,
        .uploader .ant-upload-list-item-action .ant-btn:hover,
        .uploader .ant-upload-list-item-action .ant-btn-icon-only:hover,
        .uploader .ant-upload-list-item-action > button:hover,
        .uploader .ant-upload-list-item-action > a:hover {
          border-color: var(--error-color);
          background: color-mix(in srgb, var(--error-color) 12%, transparent);
          color: var(--error-color);
        }
        .uploader .ant-upload-list-item-actions .anticon,
        .uploader .ant-upload-list-item-action .anticon {
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default BatchImport;
