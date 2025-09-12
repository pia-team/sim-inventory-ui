import React from 'react';
import { Drawer, Space, Typography, Divider, Row, Col, ColorPicker, InputNumber, Switch, Button, Segmented, Input, Tag, Card } from 'antd';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

const ColorItem: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
      <Col flex="160px"><Text>{label}</Text></Col>
      <Col>
        <ColorPicker
          value={value}
          onChangeComplete={(c) => onChange(c.toHexString())}
        />
      </Col>
      <Col flex="auto">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--header-border-color)', borderRadius: 6 }}
        />
      </Col>
    </Row>
  );
};

const ThemeSettingsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { settings, setSetting, reset, recommendedPresets, customPresets, applyPreset, savePreset, deletePreset } = useTheme();
  const { t } = useTranslation();
  const [presetName, setPresetName] = React.useState('');

  return (
    <Drawer
      placement="left"
      open={open}
      onClose={onClose}
      closable={false}
      width={360}
      title={t('theme.settings', { defaultValue: 'Theme Settings' })}
      extra={
        <Space>
          <Button onClick={reset}>{t('theme.reset', { defaultValue: 'Reset to defaults' })}</Button>
          <Button type="primary" onClick={onClose}>{t('theme.close', { defaultValue: 'Close' })}</Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={5}>{t('theme.colors', { defaultValue: 'Colors' })}</Title>
          <ColorItem label={t('theme.navbarBg', { defaultValue: 'Navbar Background' }) as string} value={settings.navbarBg} onChange={(v) => setSetting('navbarBg', v)} />
          <ColorItem label={t('theme.navbarText', { defaultValue: 'Navbar Text Color' }) as string} value={settings.navbarText} onChange={(v) => setSetting('navbarText', v)} />
          <ColorItem label={t('theme.sidebarBg', { defaultValue: 'Sidebar Background' }) as string} value={settings.sidebarBg} onChange={(v) => setSetting('sidebarBg', v)} />
          <ColorItem label={t('theme.sidebarText', { defaultValue: 'Sidebar Text Color' }) as string} value={settings.sidebarText} onChange={(v) => setSetting('sidebarText', v)} />
          <ColorItem label={t('theme.pageBg', { defaultValue: 'Page Background' }) as string} value={settings.pageBg} onChange={(v) => setSetting('pageBg', v)} />
          <ColorItem label={t('theme.cardBg', { defaultValue: 'Card/Container Background' }) as string} value={settings.cardBg} onChange={(v) => setSetting('cardBg', v)} />
          <ColorItem label={t('theme.textColor', { defaultValue: 'Text Color' }) as string} value={settings.textColor} onChange={(v) => setSetting('textColor', v)} />
          <ColorItem label={t('theme.secondaryTextColor', { defaultValue: 'Secondary Text Color' }) as string} value={settings.secondaryTextColor} onChange={(v) => setSetting('secondaryTextColor', v)} />
          <ColorItem label={t('theme.primaryColor', { defaultValue: 'Primary/Button Color' }) as string} value={settings.primaryColor} onChange={(v) => setSetting('primaryColor', v)} />
          <ColorItem label={t('theme.linkColor', { defaultValue: 'Link Color' }) as string} value={settings.linkColor} onChange={(v) => setSetting('linkColor', v)} />
          <ColorItem label={t('theme.menuActiveBg', { defaultValue: 'Menu Active Background' }) as string} value={settings.menuActiveBg} onChange={(v) => setSetting('menuActiveBg', v)} />
          <ColorItem label={t('theme.menuActiveText', { defaultValue: 'Menu Active Text' }) as string} value={settings.menuActiveText} onChange={(v) => setSetting('menuActiveText', v)} />
          <ColorItem label={t('theme.tableRowHoverBg', { defaultValue: 'Table Row Hover Background' }) as string} value={settings.tableRowHoverBg} onChange={(v) => setSetting('tableRowHoverBg', v)} />
          <ColorItem label={t('theme.headerBorderColor', { defaultValue: 'Header Border Color' }) as string} value={settings.headerBorderColor} onChange={(v) => setSetting('headerBorderColor', v)} />
          <Divider style={{ margin: '12px 0' }} />
          <ColorItem label={t('theme.successColor', { defaultValue: 'Success Color' }) as string} value={settings.successColor} onChange={(v) => setSetting('successColor', v)} />
          <ColorItem label={t('theme.warningColor', { defaultValue: 'Warning Color' }) as string} value={settings.warningColor} onChange={(v) => setSetting('warningColor', v)} />
          <ColorItem label={t('theme.errorColor', { defaultValue: 'Error Color' }) as string} value={settings.errorColor} onChange={(v) => setSetting('errorColor', v)} />
          <ColorItem label={t('theme.infoColor', { defaultValue: 'Info Color' }) as string} value={settings.infoColor} onChange={(v) => setSetting('infoColor', v)} />
        </div>

        <Divider />

        <div>
          <Title level={5}>{t('theme.typographyLayout', { defaultValue: 'Typography & Layout' })}</Title>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.fontSize', { defaultValue: 'Base Font Size' })}</Text></Col>
            <Col>
              <InputNumber
                min={12}
                max={20}
                value={settings.fontSize}
                onChange={(v) => setSetting('fontSize', Number(v) || 14)}
              />
            </Col>
          </Row>

          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.borderRadius', { defaultValue: 'Border Radius' })}</Text></Col>
            <Col>
              <InputNumber
                min={0}
                max={16}
                value={settings.borderRadius}
                onChange={(v) => setSetting('borderRadius', Number(v) || 6)}
              />
            </Col>
          </Row>

          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.compact', { defaultValue: 'Compact Mode' })}</Text></Col>
            <Col>
              <Switch checked={settings.compact} onChange={(v) => setSetting('compact', v)} />
            </Col>
          </Row>

          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.mode', { defaultValue: 'Mode' })}</Text></Col>
            <Col>
              <Segmented
                options={[{ label: t('theme.light', { defaultValue: 'Light' }), value: 'light' }, { label: t('theme.dark', { defaultValue: 'Dark' }), value: 'dark' }]}
                value={settings.mode}
                onChange={(v) => setSetting('mode', v as any)}
              />
            </Col>
          </Row>

          {/* Tag Lightness controls moved under Mode */}
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.tagBgStrength', { defaultValue: 'Background strength (%)' })}</Text></Col>
            <Col>
              <InputNumber
                min={0}
                max={60}
                value={settings.tagLightBgStrength}
                onChange={(v) => setSetting('tagLightBgStrength', Number(v) || 0)}
              />
            </Col>
          </Row>
          <Row align="middle" gutter={12} style={{ marginBottom: 12 }}>
            <Col flex="160px"><Text>{t('theme.tagBorderStrength', { defaultValue: 'Border strength (%)' })}</Text></Col>
            <Col>
              <InputNumber
                min={0}
                max={80}
                value={settings.tagLightBorderStrength}
                onChange={(v) => setSetting('tagLightBorderStrength', Number(v) || 0)}
              />
            </Col>
          </Row>
          <Text type="secondary">{t('theme.tagLightnessHint', { defaultValue: 'Adjust light variants intensity for Tag background/border.' })}</Text>
        </div>

        <Divider />

        <div>
          <Title level={5}>{t('theme.presets', { defaultValue: 'Presets' })}</Title>
          <div style={{ marginBottom: 12 }}>
            <Text strong>{t('theme.recommended', { defaultValue: 'Recommended' })}:</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {recommendedPresets.map(p => (
                  <Button key={p.name} onClick={() => applyPreset(p.settings)}>{p.name}</Button>
                ))}
              </Space>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <Text strong>{t('theme.custom', { defaultValue: 'Custom' })}:</Text>
            <div style={{ marginTop: 8 }}>
              {customPresets.length === 0 ? (
                <Text type="secondary">{t('common.empty', { defaultValue: 'No items' })}</Text>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {customPresets.map(p => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Space>
                        <Tag color="blue">{p.name}</Tag>
                      </Space>
                      <Space>
                        <Button size="small" onClick={() => applyPreset(p.settings)}>{t('theme.apply', { defaultValue: 'Apply' })}</Button>
                        <Button size="small" danger onClick={() => deletePreset(p.name)}>{t('theme.delete', { defaultValue: 'Delete' })}</Button>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </div>
          </div>

          <div>
            <Text strong>{t('theme.savePreset', { defaultValue: 'Save as Preset' })}</Text>
            <Space.Compact style={{ width: '100%', marginTop: 8 }}>
              <Input placeholder={t('theme.presetNamePlaceholder', { defaultValue: 'Preset name' })} value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              <Button type="primary" onClick={() => { savePreset(presetName.trim()); setPresetName(''); }}>{t('actions.save', { defaultValue: 'Save' })}</Button>
            </Space.Compact>
          </div>
        </div>

        <Divider />

        <div>
          <Title level={5}>{t('theme.preview', { defaultValue: 'Preview' })}</Title>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space size="middle" wrap>
              <Button type="primary">{t('actions.createOrder', { defaultValue: 'Create Order' })}</Button>
              <Button>{t('actions.actions', { defaultValue: 'Actions' })}</Button>
              <Button type="dashed">{t('actions.dashed', { defaultValue: 'Dashed' })}</Button>
              <Switch defaultChecked />
              <Tag color="processing">Tag</Tag>
              <a href="#preview" onClick={(e) => e.preventDefault()}>{t('theme.button', { defaultValue: 'Theme' })}</a>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                {t('theme.tagPalette', { defaultValue: 'Tag Palette' })}
              </Text>
              <Space size={[8, 8]} wrap>
                <Tag>{t('common.default', { defaultValue: 'Default' })}</Tag>
                <Tag color="success">{t('status.success', { defaultValue: 'Success' })}</Tag>
                <Tag color="warning">{t('status.warning', { defaultValue: 'Warning' })}</Tag>
                <Tag color="error">{t('status.error', { defaultValue: 'Error' })}</Tag>
                <Tag color="cyan">{t('status.info', { defaultValue: 'Info' })}</Tag>
                <Tag color="processing">{t('common.primary', { defaultValue: 'Primary' })}</Tag>
              </Space>
            </div>
            <Input placeholder={t('placeholders.searchByIccid', { defaultValue: 'Search...' })} style={{ maxWidth: 300 }} />
            <Card title={t('titles.basicInformation', { defaultValue: 'Basic Information' })} style={{ maxWidth: 520 }}>
              <p style={{ marginBottom: 8 }}>{t('app.welcome', { name: 'User', defaultValue: 'Welcome, {{name}}!' })}</p>
              <p style={{ margin: 0 }}>{t('messages.success', { defaultValue: 'Operation completed successfully.' })}</p>
            </Card>
          </Space>
        </div>

        
      </Space>
    </Drawer>
  );
};

export default ThemeSettingsDrawer;
