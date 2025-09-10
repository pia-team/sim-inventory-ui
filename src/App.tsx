import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider } from 'antd';
import { KeycloakProvider } from './contexts/KeycloakContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
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

// Ant Design theme configuration
const antdTheme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
  },
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ConfigProvider theme={antdTheme}>
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
    </ErrorBoundary>
  );
};

export default App;
