import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { KeycloakProvider } from './contexts/KeycloakContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ConfigProvider } from 'antd';
import i18n from './i18n';
import 'antd/dist/reset.css';
import './styles/App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App: React.FC = () => {
  const RTL_LANGS = React.useMemo(() => ['ar', 'fa', 'he', 'ur'], []);
  const computeDir = React.useCallback((lng?: string) => {
    const lang = lng || i18n.language || 'en';
    return RTL_LANGS.some((code) => lang.startsWith(code)) ? 'rtl' : 'ltr';
  }, [RTL_LANGS]);

  const [dir, setDir] = React.useState<'ltr' | 'rtl'>(computeDir());

  React.useEffect(() => {
    const handler = (lng: string) => setDir(computeDir(lng) as 'ltr' | 'rtl');
    i18n.on('languageChanged', handler);
    // in case language already set before this component mounts
    setDir(computeDir());
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [computeDir]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConfigProvider direction={dir}>
          <QueryClientProvider client={queryClient}>
            <KeycloakProvider>
              <Router
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <div className="app">
                  <AppRoutes />
                </div>
              </Router>
            </KeycloakProvider>
          </QueryClientProvider>
        </ConfigProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
