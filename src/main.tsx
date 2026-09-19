import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('GLOBAL JS ERROR:', event.error || event.message);
  const root = document.getElementById('root');
  if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
    root.innerHTML = `
      <div style="padding:24px;font-family:sans-serif;background:#fff0f0;color:#c00;border:3px solid black;margin:20px;border-radius:12px;">
        <h2 style="font-size:20px;font-weight:bold;margin-bottom:8px;">⚠️ COMIC PORTAL INITIALIZATION ERROR</h2>
        <p style="font-size:14px;color:#333;">A JavaScript runtime error stopped the app from rendering:</p>
        <pre style="background:#222;color:#0f0;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">${event.error?.stack || event.message}</pre>
      </div>
    `;
  }
});

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('REACT BOUNDARY CAUGHT ERROR:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', background: '#fff0f0', color: '#c00', border: '3px solid black', margin: 20, borderRadius: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>⚠️ REACT RENDER CRASH DETECTED</h2>
          <p style={{ fontSize: 14, color: '#333' }}>Component render threw an unhandled error:</p>
          <pre style={{ background: '#222', color: '#0f0', padding: 12, borderRadius: 8, overflow: 'auto', fontSize: 12 }}>
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 12, padding: '8px 16px', background: '#00F0FF', border: '2px solid black', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Clear Local Storage & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
