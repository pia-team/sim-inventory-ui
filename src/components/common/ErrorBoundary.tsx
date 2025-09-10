import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
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
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="Something went wrong"
          subTitle="An unexpected error occurred. Please try reloading the page or contact support if the issue persists."
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReload}>
              Reload Page
            </Button>,
            <Button key="home" onClick={this.handleGoHome}>
              Go to Dashboard
            </Button>,
          ]}
        >
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: 16, textAlign: 'left' }}>
              <summary>Error Details (Development Mode)</summary>
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

export default ErrorBoundary;
