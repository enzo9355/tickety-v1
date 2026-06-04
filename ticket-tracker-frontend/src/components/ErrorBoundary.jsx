import React from 'react';

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
        <div className="glass-panel p-10 text-center text-error flex flex-col items-center gap-4 m-5">
          <span className="material-symbols-outlined text-[48px]">warning</span>
          <h2 className="text-white">畫面渲染發生錯誤</h2>
          <p className="text-on-surface-variant">抱歉，系統遇到未預期的錯誤，請嘗試重新整理網頁。</p>
          <button 
            onClick={() => window.location.reload()} 
            className="glass-button mt-4" 
          >
            重新整理
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
