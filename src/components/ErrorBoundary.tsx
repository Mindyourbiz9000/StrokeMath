import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportBackup } from '../lib/storage';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

const FR = navigator.language?.toLowerCase().startsWith('fr');
const T = FR
  ? {
      title: 'Une erreur est survenue',
      body: 'Vos données restent enregistrées sur cet appareil. Vous pouvez les exporter avant de recharger.',
      reload: 'Recharger l’application',
      export: '⬇︎ Exporter mes données',
    }
  : {
      title: 'Something went wrong',
      body: 'Your data is still saved on this device. You can export it before reloading.',
      reload: 'Reload the app',
      export: '⬇︎ Export my data',
    };

/**
 * Top-level safety net. A render crash on hole 14 with no devtools must not
 * mean a white screen and a lost round — show a recover/export fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ShotIQ] render error', error, info.componentStack);
  }

  private exportData = () => {
    try {
      const blob = new Blob([exportBackup()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shotiq-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 28,
          textAlign: 'center',
          color: '#f5f5f7',
          background: '#0a0a0f',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, sans-serif",
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h1 style={{ fontSize: 22, margin: 0 }}>{T.title}</h1>
        <p style={{ color: '#86868f', maxWidth: 360, lineHeight: 1.5 }}>
          {T.body}
        </p>
        <button
          onClick={this.exportData}
          style={{
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'transparent',
            color: '#f5f5f7',
            padding: '14px 22px',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {T.export}
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            border: 'none',
            background: 'linear-gradient(140deg,#7c7aff,#bf5af2)',
            color: '#fff',
            padding: '15px 24px',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {T.reload}
        </button>
      </div>
    );
  }
}
