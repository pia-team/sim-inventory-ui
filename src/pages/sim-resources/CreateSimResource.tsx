import React from 'react';
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
  Divider,
  Row,
  Col,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from 'react-query';
import { useForm } from 'antd/es/form/Form';
import apiService from '../../services/api.service';
import { CreateSimResourceRequest, SimType, ProfileType } from '../../types/sim.types';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CreateSimResource: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = useForm();
  const { t } = useTranslation();

  const createMutation = useMutation(
    (data: CreateSimResourceRequest) => apiService.createSimResource(data),
    {
      onSuccess: (response) => {
        if (response.success) {
          message.success(t('messages.success'));
          queryClient.invalidateQueries('simResources');
          queryClient.invalidateQueries('simStatistics');
          navigate(`/sim-resources/${response.data?.id}`);
        } else {
          message.error(response.error?.message || t('app.error'));
        }
      },
      onError: (error: any) => {
        message.error(`${t('app.error')}: ${error.response?.data?.message || error.message}`);
      },
    }
  );

  const handleSubmit = (values: any) => {
    // Build characteristics list merging manual entries and core SIM fields
    const manualChars = values.characteristics
      ? values.characteristics
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const [name, value] = line.split(':').map((s) => s.trim());
            return name && value ? { name, value, valueType: 'string' } : null;
          })
          .filter(Boolean)
      : [];
    const ensureChar = (arr: any[], name: string, value?: any) => {
      if (value === undefined || value === null || value === '') return;
      if (!arr.some((c: any) => String(c.name).toLowerCase() === name.toLowerCase())) {
        arr.push({ name, value, valueType: 'string' });
      }
    };
    const resourceChars: any[] = [...(manualChars as any[])];
    ensureChar(resourceChars, 'ICCID', values.iccid);
    ensureChar(resourceChars, 'SIMType', values.type);
    ensureChar(resourceChars, 'ProfileType', values.profileType);
    ensureChar(resourceChars, 'BatchId', values.batchId);
    const request: CreateSimResourceRequest = {
      '@type': values.type === SimType.ESIM ? 'LogicalResource' : 'PhysicalResource',
      description: values.description || undefined,
      name: values.name || values.iccid,
      resourceCharacteristic: resourceChars.length ? resourceChars : undefined,
    };

    createMutation.mutate(request);
  };

  const validateICCID = (_: any, value: string) => {
    if (!value) {
      // Let the "required" rule handle empty value to avoid duplicate error messages
      return Promise.resolve();
    }
    
    // ICCID should be 19-20 digits
    if (!/^\d{19,20}$/.test(value)) {
      return Promise.reject(new Error(t('createSim.iccidDigits')));
    }
    
    // Basic ICCID checksum validation (Luhn algorithm)
    const digits = value.split('').map(Number);
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      return Promise.reject(new Error(t('createSim.iccidChecksum')));
    }
    
    return Promise.resolve();
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
            {t('createSim.title')}
          </Title>
        </Space>
      </div>

      <Row justify="center">
        <Col xs={24} lg={16} xl={12}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
            >
              <Title level={4}>{t('createSim.basicInformation')}</Title>
              
              <Form.Item
                label={t('sim.iccid')}
                name="iccid"
                rules={[
                  { required: true, message: t('createSim.iccidRequired') },
                  { validator: validateICCID }
                ]}
                extra={t('createSim.iccidDigits')}
              >
                <Input
                  placeholder="Enter ICCID (e.g., 89014103211118510720)"
                  maxLength={20}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('createSim.simType')}
                    name="type"
                    rules={[{ required: true, message: t('createSim.simTypeRequired') }]}
                  >
                    <Select placeholder={t('createSim.selectSimType')}>
                      <Option value={SimType.PHYSICAL}>Physical SIM</Option>
                      <Option value={SimType.ESIM}>eSIM</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('createSim.profileType')}
                    name="profileType"
                  >
                    <Select placeholder={t('createSim.selectProfileType')} allowClear>
                      <Option value={ProfileType.PREPAID}>Prepaid</Option>
                      <Option value={ProfileType.POSTPAID}>Postpaid</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('createSim.batchId')}
                    name="batchId"
                    extra={t('createSim.batchIdHelp')}
                  >
                    <Input placeholder={t('createSim.batchIdHelp')} />
                  </Form.Item>
                </Col>
                
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={t('createSim.name')}
                    name="name"
                    extra={t('createSim.nameHelp')}
                  >
                    <Input placeholder={t('createSim.nameHelp')} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={t('createSim.description')}
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder={t('createSim.descriptionPlaceholder')}
                />
              </Form.Item>

              <Divider />

              <Title level={4}>{t('createSim.additionalCharacteristics')}</Title>
              <Typography.Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                {t('createSim.additionalHelp')} Format: <code>key: value</code>
              </Typography.Text>

              <Form.Item
                label={t('createSim.characteristicsLabel')}
                name="characteristics"
                extra={t('createSim.characteristicsExample').split('\n').join(', ')}
              >
                <TextArea
                  rows={4}
                  placeholder={t('createSim.characteristicsExample')}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>

              <Divider />

              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => navigate('/sim-resources')}
                    disabled={createMutation.isLoading}
                  >
                    {t('createSim.cancel')}
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={createMutation.isLoading}
                  >
                    {t('createSim.submit')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CreateSimResource;
