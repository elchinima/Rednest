import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#450a0a',
          backgroundImage: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.15) 0%, transparent 50%), radial-gradient(circle at bottom left, #450a0a 0%, #7f1d1d 100%)',
          color: '#fff',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: '24px',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '480px',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>☕</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.02em' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginBottom: '32px', lineHeight: 1.6 }}>
              An unexpected error occurred. Please try refreshing the page or go back to the homepage.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseOver={e => e.target.style.background = '#f87171'}
                onMouseOut={e => e.target.style.background = '#ef4444'}
              >
                Refresh page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  fontFamily: 'inherit',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
