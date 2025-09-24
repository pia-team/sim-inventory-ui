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
  Divider,
  Table,
  Switch,
} from 'antd';
import { ArrowLeftOutlined, CloudUploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation } from 'react-query';
import apiService from '../../services/api.service';
import type { BulkCharacteristic, BulkResourceCreateRequest, ResourceCharacteristic } from '../../types/sim.types';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface BulkCharRow extends BulkCharacteristic {
  key: string;
}

const BulkTemplateCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [charRows, setCharRows] = useState<BulkCharRow[]>([
    { key: 'row-1', name: 'ICCID', valueFrom: '', valueMask: '', valueTo: '', isPopulateCharacteristicValueToResourceName: false },
  ]);
  const [result, setResult] = useState<any | null>(null);

  const addRow = () => {
    setCharRows(prev => [...prev, { key: `row-${prev.length + 1}`, name: '', valueFrom: '', valueMask: '', valueTo: '', isPopulateCharacteristicValueToResourceName: false }]);
  };

  const removeRow = (key: string) => {
    setCharRows(prev => prev.filter(r => r.key !== key));
  };

  const parseBaseCharacteristics = (text?: string): ResourceCharacteristic[] | undefined => {
    if (!text) return undefined;
    const items = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name, value] = line.split(':').map(s => s.trim());
        if (!name || value === undefined) return null;
        return { name, value, valueType: 'string' } as ResourceCharacteristic;
      })
      .filter(Boolean) as ResourceCharacteristic[];
    return items.length ? items : undefined;
  };

  const mutation = useMutation((payload: BulkResourceCreateRequest) => apiService.bulkResourceCreateJob(payload), {
    onSuccess: (res) => {
      if (res.success) {
        setResult(res.data);
        message.success(t('bulkTemplate.jobSubmittedSuccess', { defaultValue: 'Bulk create job submitted successfully' }));
      } else {
        message.error(res.error?.message || t('bulkTemplate.createFailed', { defaultValue: 'Bulk create failed' }));
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || err.message || t('bulkTemplate.createFailed', { defaultValue: 'Bulk create failed' }));
    },
  });

  const onFinish = (values: any) => {
    const baseType = values.resourceType === 'Logical' ? 'LogicalResource' : 'PhysicalResource';
    const baseResource: any = {
      '@type': baseType,
      name: values.name,
      description: values.description || undefined,
    };
    const baseChars = parseBaseCharacteristics(values.baseCharacteristics);
    if (baseChars) baseResource.resourceCharacteristic = baseChars;

    // Validate at least one characteristic with required fields
    const cleanedRows: BulkCharacteristic[] = charRows
      .map(r => ({
        name: r.name?.trim(),
        valueFrom: (r as any).valueFrom?.trim(),
        valueMask: (r as any).valueMask?.trim(),
        valueTo: (r as any).valueTo?.trim(),
        isPopulateCharacteristicValueToResourceName: r.isPopulateCharacteristicValueToResourceName,
      }))
      .filter(r => r.name && r.valueFrom && r.valueMask && r.valueTo) as BulkCharacteristic[];

    if (!cleanedRows.length) {
      message.error(t('bulkTemplate.validation.atLeastOneCharacteristic', { defaultValue: 'Please add at least one valid Bulk Characteristic (name, valueFrom, valueMask, valueTo)' }));
      return;
    }

    const payload: BulkResourceCreateRequest = {
      jobReference: values.jobReference || undefined,
      itemCount: Number(values.itemCount),
      baseResource,
      bulkCharacteristic: cleanedRows,
    };

    if (!payload.itemCount || payload.itemCount <= 0) {
      message.error(t('bulkTemplate.validation.itemCountPositive', { defaultValue: 'Item count must be greater than 0' }));
      return;
    }

    mutation.mutate(payload);
  };

  const columns = [
    {
      title: t('bulkTemplate.columns.name', { defaultValue: 'Name' }),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (_: any, record: BulkCharRow, idx: number) => (
        <Input
          placeholder={t('bulkTemplate.placeholders.nameExample', { defaultValue: 'e.g., ICCID' })}
          value={record.name}
          onChange={(e) => {
            const v = e.target.value;
            setCharRows(rows => rows.map((r, i) => i === idx ? { ...r, name: v } : r));
          }}
        />
      ),
    },
    {
      title: t('bulkTemplate.columns.valueFrom', { defaultValue: 'Value From' }),
      dataIndex: 'valueFrom',
      key: 'valueFrom',
      render: (_: any, record: BulkCharRow, idx: number) => (
        <Input
          placeholder={t('bulkTemplate.placeholders.valueFrom', { defaultValue: 'Start value' })}
          value={(record as any).valueFrom}
          onChange={(e) => {
            const v = e.target.value;
            setCharRows(rows => rows.map((r, i) => i === idx ? { ...r, valueFrom: v } as any : r));
          }}
        />
      ),
    },
    {
      title: t('bulkTemplate.columns.valueMask', { defaultValue: 'Value Mask' }),
      dataIndex: 'valueMask',
      key: 'valueMask',
      render: (_: any, record: BulkCharRow, idx: number) => (
        <Input
          placeholder={t('bulkTemplate.placeholders.valueMask', { defaultValue: 'Mask (e.g., #### or 0000)' })}
          value={(record as any).valueMask}
          onChange={(e) => {
            const v = e.target.value;
            setCharRows(rows => rows.map((r, i) => i === idx ? { ...r, valueMask: v } as any : r));
          }}
        />
      ),
    },
    {
      title: t('bulkTemplate.columns.valueTo', { defaultValue: 'Value To' }),
      dataIndex: 'valueTo',
      key: 'valueTo',
      render: (_: any, record: BulkCharRow, idx: number) => (
        <Input
          placeholder={t('bulkTemplate.placeholders.valueTo', { defaultValue: 'End value' })}
          value={(record as any).valueTo}
          onChange={(e) => {
            const v = e.target.value;
            setCharRows(rows => rows.map((r, i) => i === idx ? { ...r, valueTo: v } as any : r));
          }}
        />
      ),
    },
    {
      title: t('bulkTemplate.columns.populateToName', { defaultValue: 'Populate to Name' }),
      dataIndex: 'isPopulateCharacteristicValueToResourceName',
      key: 'isPopulate',
      width: 150,
      render: (_: any, record: BulkCharRow, idx: number) => (
        <Switch
          checked={record.isPopulateCharacteristicValueToResourceName}
          onChange={(checked) => {
            setCharRows(rows => rows.map((r, i) => i === idx ? { ...r, isPopulateCharacteristicValueToResourceName: checked } : r));
          }}
        />
      ),
    },
    {
      title: t('bulkTemplate.columns.actions', { defaultValue: 'Actions' }),
      key: 'actions',
      width: 100,
      render: (_: any, record: BulkCharRow) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/sim-resources')}>
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <Title level={2} style={{ margin: 0 }}>{t('nav.bulkTemplate', { defaultValue: 'Bulk Create (Template)' })}</Title>
        </Space>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Title level={4}>{t('bulkTemplate.baseResource', { defaultValue: 'Base Resource' })}</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label={t('bulkTemplate.resourceType', { defaultValue: 'Resource Type' })} name="resourceType" rules={[{ required: true, message: t('bulkTemplate.validation.selectResourceType', { defaultValue: 'Please select resource type' }) }]}> 
                <Select placeholder={t('bulkTemplate.selectType', { defaultValue: 'Select type' })}>
                  <Option value="Physical">PhysicalResource</Option>
                  <Option value="Logical">LogicalResource</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('createSim.name', { defaultValue: 'Name' })} name="name" rules={[{ required: true, message: t('validation.nameRequired', { defaultValue: 'Name is required' }) }]}> 
                <Input placeholder={t('bulkTemplate.placeholders.baseNameRequired', { defaultValue: 'Base name (required)' })} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={t('bulkTemplate.jobReference', { defaultValue: 'Job Reference' })} name="jobReference">
                <Input placeholder={t('bulkTemplate.placeholders.jobReferenceOptional', { defaultValue: 'Optional job reference' })} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('common.description', { defaultValue: 'Description' })} name="description">
                <Input placeholder={t('createSim.descriptionPlaceholder', { defaultValue: 'Enter description (optional)' })} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('bulkTemplate.itemCount', { defaultValue: 'Item Count' })} name="itemCount" rules={[{ required: true, message: t('bulkTemplate.validation.itemCountRequired', { defaultValue: 'Item count is required' }) }]}> 
                <Input type="number" min={1} placeholder={t('bulkTemplate.placeholders.itemCount', { defaultValue: 'Number of resources to create' })} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('bulkTemplate.baseCharacteristicsLabel', { defaultValue: 'Base Characteristics (key: value per line)' })} name="baseCharacteristics">
            <Input.TextArea rows={3} placeholder={t('bulkTemplate.baseCharacteristicsExample', { defaultValue: 'Example:\nCategory: Gold\nRegion: EU' })} style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Divider />

          <Title level={4}>{t('bulkTemplate.bulkCharacteristics', { defaultValue: 'Bulk Characteristics' })}</Title>
          <Paragraph type="secondary">
            {t('bulkTemplate.bulkCharacteristicsHelp', { defaultValue: 'Define one or more template characteristics using valueFrom, valueMask, and valueTo. Backend will generate values accordingly. Mask format is backend-specific (e.g., #### or 0000).' })}
          </Paragraph>

          <div style={{ marginBottom: 12 }}>
            <Button icon={<PlusOutlined />} onClick={addRow}>{t('actions.addCharacteristic', { defaultValue: 'Add Characteristic' })}</Button>
          </div>

          <Table
            columns={columns as any}
            dataSource={charRows}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
          />

          <Divider />

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/sim-resources')}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
            <Button type="primary" htmlType="submit" icon={<CloudUploadOutlined />} loading={mutation.isLoading}>
              {t('buttons.submitBulkJob', { defaultValue: 'Submit Bulk Job' })}
            </Button>
          </Space>
        </Form>
      </Card>

      {result && (
        <Card style={{ marginTop: 24 }} title={t('batchImport.bulk.responseTitle', { defaultValue: 'Bulk Job Response' })}>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
};

export default BulkTemplateCreate;
