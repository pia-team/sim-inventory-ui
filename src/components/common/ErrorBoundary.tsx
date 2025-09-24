import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title={t('errorBoundary.title', { defaultValue: 'Something went wrong' })}
          subTitle={t('errorBoundary.subTitle', { defaultValue: 'An unexpected error occurred. Please try reloading the page or contact support if the issue persists.' })}
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              {t('errorBoundary.reload', { defaultValue: 'Reload Page' })}
            </Button>,
            <Button key="home" onClick={this.handleGoHome}>
              {t('errorBoundary.goToDashboard', { defaultValue: 'Go to Dashboard' })}
            </Button>,
          ]}
        >
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: 16, textAlign: 'left' }}>
              <summary>{t('errorBoundary.errorDetails', { defaultValue: 'Error Details (Development Mode)' })}</summary>
              <pre style={{ fontSize: '12px', marginTop: 8 }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
