import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '20px' }}>
          <AlertTriangle size={48} />
          <h2 style={{ color: 'white' }}>畫面渲染發生錯誤</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>抱歉，系統遇到未預期的錯誤，請嘗試重新整理網頁。</p>
          <button 
            onClick={() => window.location.reload()} 
            className="glass-button" 
            style={{ marginTop: '16px' }}
          >
            重新整理
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
