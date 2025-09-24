import React from 'react';
import { Drawer, Space, Typography, Divider, Row, Col, Select, Switch, Button, Radio, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useKeycloak } from '../../contexts/KeycloakContext';

const { Title, Text } = Typography;
const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
}

const UserSettingsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation();
  const { settings, setSetting } = useTheme();
  const { userInfo } = useKeycloak();

  // Local storage keys
  const SORT_RES_KEY = 'pref.sort.resources';
  const SORT_ORD_KEY = 'pref.sort.orders';
  const DATE_FMT_KEY = 'pref.date.format';

  // Initialize from localStorage
  const [resourceSort, setResourceSort] = React.useState<string>(() => localStorage.getItem(SORT_RES_KEY) || '-createdDate');
  const [orderSort, setOrderSort] = React.useState<string>(() => localStorage.getItem(SORT_ORD_KEY) || '-orderDate');
  const [dateFmt, setDateFmt] = React.useState<string>(() => localStorage.getItem(DATE_FMT_KEY) || 'YYYY-MM-DD');

  const handleLangChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const savePref = (key: string, value: string) => {
    localStorage.setItem(key, value);
  };

  return (
    <Drawer
      placement="right"
      open={open}
      onClose={onClose}
      width={420}
      title={t('nav.settings', { defaultValue: 'Settings' })}
      extra={
        <Space>
          <Button onClick={onClose}>{t('theme.close', { defaultValue: 'Close' })}</Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>{t('settings.account', { defaultValue: 'Account' })}</Title>
          <Row gutter={12}>
            <Col flex="100px"><Text type="secondary">{t('settings.user', { defaultValue: 'User' })}</Text></Col>
            <Col flex="auto">
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 500 }}>{userInfo?.name || userInfo?.preferred_username || 'User'}</div>
                <Text type="secondary">{userInfo?.email}</Text>
              </div>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Title level={5} style={{ marginBottom: 8 }}>{t('settings.general', { defaultValue: 'General' })}</Title>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="140px"><Text>{t('settings.language', { defaultValue: 'Language' })}</Text></Col>
            <Col flex="auto">
              <Select value={i18n.language} onChange={handleLangChange} style={{ width: '100%' }}>
                <Option value="en">{t('lang.en', { defaultValue: 'English' })}</Option>
                <Option value="tr">{t('lang.tr', { defaultValue: 'Turkish' })}</Option>
                <Option value="de">{t('lang.de', { defaultValue: 'German' })}</Option>
                <Option value="fr">{t('lang.fr', { defaultValue: 'French' })}</Option>
                <Option value="ar">{t('lang.ar', { defaultValue: 'Arabic' })}</Option>
                <Option value="zh">{t('lang.zh', { defaultValue: 'Chinese' })}</Option>
              </Select>
            </Col>
          </Row>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="140px"><Text>{t('theme.compact', { defaultValue: 'Compact Mode' })}</Text></Col>
            <Col>
              <Switch checked={settings.compact} onChange={(v) => setSetting('compact', v)} />
            </Col>
          </Row>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="140px"><Text>{t('settings.dateFormat', { defaultValue: 'Date format' })}</Text></Col>
            <Col flex="auto">
              <Select
                value={dateFmt}
                onChange={(v) => { setDateFmt(v); savePref(DATE_FMT_KEY, v); }}
                style={{ width: '100%' }}
              >
                <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                <Option value="DD.MM.YYYY">DD.MM.YYYY</Option>
                <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Title level={5} style={{ marginBottom: 8 }}>{t('settings.preferences', { defaultValue: 'Preferences' })}</Title>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="200px"><Text>{t('settings.defaultSortResources', { defaultValue: 'Default sort (Resources)' })}</Text></Col>
            <Col flex="auto">
              <Radio.Group
                value={resourceSort}
                onChange={(e) => { setResourceSort(e.target.value); savePref(SORT_RES_KEY, e.target.value); }}
              >
                <Radio value="-createdDate">{t('settings.newestFirst', { defaultValue: 'Newest first' })}</Radio>
                <Radio value="createdDate">{t('settings.oldestFirst', { defaultValue: 'Oldest first' })}</Radio>
              </Radio.Group>
            </Col>
          </Row>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="200px"><Text>{t('settings.defaultSortOrders', { defaultValue: 'Default sort (Orders)' })}</Text></Col>
            <Col flex="auto">
              <Radio.Group
                value={orderSort}
                onChange={(e) => { setOrderSort(e.target.value); savePref(SORT_ORD_KEY, e.target.value); }}
              >
                <Radio value="-orderDate">{t('settings.newestFirst', { defaultValue: 'Newest first' })}</Radio>
                <Radio value="orderDate">{t('settings.oldestFirst', { defaultValue: 'Oldest first' })}</Radio>
              </Radio.Group>
            </Col>
          </Row>
          <Tooltip title={t('settings.sortHint', { defaultValue: 'These preferences may be applied progressively across list screens.' })}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('settings.mightNotApplyEverywhere', { defaultValue: 'Note: may not apply everywhere yet.' })}</Text>
          </Tooltip>
        </div>
      </Space>
    </Drawer>
  );
};

export default UserSettingsDrawer;
