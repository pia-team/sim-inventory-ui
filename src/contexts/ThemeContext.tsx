import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

export type ThemeMode = 'light' | 'dark';

export interface ThemeSettings {
  // colors
  navbarBg: string;
  navbarText: string;
  sidebarBg: string;
  sidebarText: string;
  pageBg: string; // layout background
  cardBg: string; // container background
  textColor: string;
  primaryColor: string; // antd colorPrimary
  // advanced colors
  menuActiveBg: string;
  menuActiveText: string;
  tableRowHoverBg: string;
  headerBorderColor: string;
  linkColor: string;
  // semantic colors
  successColor: string;
  warningColor: string;
  errorColor: string;
  infoColor: string;
  // text semantic
  secondaryTextColor: string;
  // tag light variants
  tagLightBgStrength: number; // percent e.g., 12
  tagLightBorderStrength: number; // percent e.g., 35

  // layout
  borderRadius: number; // antd borderRadius
  fontSize: number; // antd fontSize
  compact: boolean; // antd compact algorithm switch
  mode: ThemeMode; // light/dark hint (we only tweak tokens/colors)
}

const DEFAULTS: ThemeSettings = {
  navbarBg: '#ffffff',
  navbarText: '#1f1f1f',
  sidebarBg: '#ffffff',
  sidebarText: '#1f1f1f',
  pageBg: '#f5f5f5',
  cardBg: '#ffffff',
  textColor: '#1f1f1f',
  primaryColor: '#1677ff',
  menuActiveBg: 'rgba(22, 119, 255, 0.15)',
  menuActiveText: '#1677ff',
  tableRowHoverBg: '#f5f5f5',
  headerBorderColor: '#f0f0f0',
  linkColor: '#1677ff',
  successColor: '#52c41a',
  warningColor: '#faad14',
  errorColor: '#ff4d4f',
  infoColor: '#13c2c2',
  secondaryTextColor: '#8c8c8c',
  tagLightBgStrength: 12,
  tagLightBorderStrength: 35,
  borderRadius: 6,
  fontSize: 14,
  compact: false,
  mode: 'light',
};

const STORAGE_KEY = 'theme.settings.v1';

interface ThemeContextValue {
  settings: ThemeSettings;
  setSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  reset: () => void;
  // presets
  recommendedPresets: { name: string; settings: ThemeSettings }[];
  customPresets: { name: string; settings: ThemeSettings }[];
  applyPreset: (preset: ThemeSettings) => void;
  savePreset: (name: string) => void;
  deletePreset: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const applyCssVars = (s: ThemeSettings) => {
  const root = document.documentElement;
  root.style.setProperty('--navbar-bg', s.navbarBg);
  root.style.setProperty('--navbar-text', s.navbarText);
  root.style.setProperty('--sidebar-bg', s.sidebarBg);
  root.style.setProperty('--sidebar-text', s.sidebarText);
  root.style.setProperty('--page-bg', s.pageBg);
  root.style.setProperty('--card-bg', s.cardBg);
  root.style.setProperty('--text-color', s.textColor);
  root.style.setProperty('--primary-color', s.primaryColor);
  root.style.setProperty('--success-color', s.successColor);
  root.style.setProperty('--warning-color', s.warningColor);
  root.style.setProperty('--error-color', s.errorColor);
  root.style.setProperty('--info-color', s.infoColor);
  root.style.setProperty('--text-color-secondary', s.secondaryTextColor);
  root.style.setProperty('--tag-light-bg-strength', `${s.tagLightBgStrength}%`);
  root.style.setProperty('--tag-light-border-strength', `${s.tagLightBorderStrength}%`);
  root.style.setProperty('--border-radius', `${s.borderRadius}px`);
  root.style.setProperty('--font-size-base', `${s.fontSize}px`);
  root.style.setProperty('--menu-active-bg', s.menuActiveBg);
  root.style.setProperty('--menu-active-text', s.menuActiveText);
  root.style.setProperty('--table-row-hover-bg', s.tableRowHoverBg);
  root.style.setProperty('--header-border-color', s.headerBorderColor);
  root.style.setProperty('--link-color', s.linkColor);
};

const deriveAntdTokens = (s: ThemeSettings) => {
  const algorithms: any[] = [];
  if (s.mode === 'dark') algorithms.push(antdTheme.darkAlgorithm);
  if (s.compact) algorithms.push(antdTheme.compactAlgorithm);
  return {
    token: {
      colorPrimary: s.primaryColor,
      colorBgLayout: s.pageBg,
      colorBgContainer: s.cardBg,
      colorBgElevated: s.cardBg,
      colorText: s.textColor,
      colorLink: s.linkColor,
      colorSuccess: s.successColor,
      colorWarning: s.warningColor,
      colorError: s.errorColor,
      colorInfo: s.infoColor,
      colorTextSecondary: s.secondaryTextColor,
      borderRadius: s.borderRadius,
      fontSize: s.fontSize,
    },
    algorithm: algorithms.length ? algorithms : undefined,
  } as const;
};

const STORAGE_PRESETS_KEY = 'theme.presets.v1';

const buildRecommendedPresets = (): { name: string; settings: ThemeSettings }[] => {
  const light: ThemeSettings = { ...DEFAULTS, mode: 'light' };
  const dark: ThemeSettings = {
    ...DEFAULTS,
    mode: 'dark',
    navbarBg: '#141414',
    navbarText: '#f0f0f0',
    sidebarBg: '#1f1f1f',
    sidebarText: '#e8e8e8',
    pageBg: '#0f0f0f',
    cardBg: '#141414',
    textColor: '#e8e8e8',
    primaryColor: '#4096ff',
    linkColor: '#4096ff',
    menuActiveBg: 'rgba(64, 150, 255, 0.18)',
    menuActiveText: '#69b1ff',
    tableRowHoverBg: '#111a2c',
    headerBorderColor: '#303030',
  };
  const ocean: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#13c2c2',
    linkColor: '#13c2c2',
    navbarBg: '#ffffff',
    sidebarBg: '#ffffff',
    menuActiveBg: 'rgba(19, 194, 194, 0.18)',
    menuActiveText: '#13c2c2',
  };
  const sunset: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#fa8c16',
    linkColor: '#fa8c16',
    menuActiveBg: 'rgba(250, 140, 22, 0.18)',
    menuActiveText: '#fa8c16',
  };
  const darkHighContrast: ThemeSettings = {
    ...dark,
    navbarBg: '#0a0a0a',
    navbarText: '#fafafa',
    sidebarBg: '#111111',
    sidebarText: '#f5f5f5',
    pageBg: '#000000',
    cardBg: '#141414',
    textColor: '#ffffff',
    primaryColor: '#4c9aff',
    linkColor: '#69b1ff',
    menuActiveBg: 'rgba(76, 154, 255, 0.25)',
    menuActiveText: '#69b1ff',
    headerBorderColor: '#262626',
  };

  const corporateBlue: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#0052CC',
    linkColor: '#0052CC',
    menuActiveBg: 'rgba(0, 82, 204, 0.15)',
    menuActiveText: '#0052CC',
  };

  const emerald: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#2F9E44',
    linkColor: '#2F9E44',
    menuActiveBg: 'rgba(47, 158, 68, 0.18)',
    menuActiveText: '#2F9E44',
  };

  const amethyst: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#722ED1',
    linkColor: '#722ED1',
    menuActiveBg: 'rgba(114, 46, 209, 0.18)',
    menuActiveText: '#722ED1',
  };

  const crimson: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#D4380D',
    linkColor: '#D4380D',
    menuActiveBg: 'rgba(212, 56, 13, 0.18)',
    menuActiveText: '#D4380D',
  };

  const slate: ThemeSettings = {
    ...DEFAULTS,
    primaryColor: '#5B718F',
    linkColor: '#5B718F',
    menuActiveBg: 'rgba(91, 113, 143, 0.18)',
    menuActiveText: '#5B718F',
  };

  return [
    { name: 'Light', settings: light },
    { name: 'Dark', settings: dark },
    { name: 'Dark High Contrast', settings: darkHighContrast },
    { name: 'Ocean', settings: ocean },
    { name: 'Sunset', settings: sunset },
    { name: 'Corporate Blue', settings: corporateBlue },
    { name: 'Emerald', settings: emerald },
    { name: 'Amethyst', settings: amethyst },
    { name: 'Crimson', settings: crimson },
    { name: 'Slate', settings: slate },
  ];
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) } as ThemeSettings;
    } catch {}
    return DEFAULTS;
  });
  const [customPresets, setCustomPresets] = useState<{ name: string; settings: ThemeSettings }[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (raw) return JSON.parse(raw) || [];
    } catch {}
    return [];
  });
  const recommendedPresets = useMemo(buildRecommendedPresets, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
    applyCssVars(settings);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(customPresets));
    } catch {}
  }, [customPresets]);

  // Initial apply is covered by the settings effect on first render

  const setSetting = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => {
      if (key === 'mode') {
        const targetMode = value as ThemeMode;
        const lower = targetMode.toLowerCase();
        const exact = recommendedPresets.find(p => p.name.toLowerCase() === lower);
        const fuzzy = recommendedPresets.find(p => p.name.toLowerCase().includes(lower));
        const basePreset = (exact || fuzzy || recommendedPresets[0]).settings;
        // Apply the base preset for the chosen mode, but keep typography/layout toggles
        return {
          ...prev,
          ...basePreset,
          mode: targetMode,
          fontSize: prev.fontSize,
          borderRadius: prev.borderRadius,
          compact: prev.compact,
        };
      }
      return { ...prev, [key]: value } as ThemeSettings;
    });
  }, [recommendedPresets]);

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  const applyPreset = useCallback((preset: ThemeSettings) => {
    setSettings({ ...preset });
  }, []);

  const savePreset = useCallback((name: string) => {
    if (!name) return;
    setCustomPresets(prev => {
      const filtered = prev.filter(p => p.name.toLowerCase() !== name.toLowerCase());
      return [...filtered, { name, settings }];
    });
  }, [settings]);

  const deletePreset = useCallback((name: string) => {
    setCustomPresets(prev => prev.filter(p => p.name.toLowerCase() !== name.toLowerCase()));
  }, []);

  const ctxValue = useMemo<ThemeContextValue>(() => ({ 
    settings, setSetting, reset,
    recommendedPresets,
    customPresets,
    applyPreset,
    savePreset,
    deletePreset,
  }), [settings, setSetting, reset, recommendedPresets, customPresets, applyPreset, savePreset, deletePreset]);
  const antd = useMemo(() => deriveAntdTokens(settings), [settings]);

  return (
    <ThemeContext.Provider value={ctxValue}>
      <ConfigProvider theme={antd}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
