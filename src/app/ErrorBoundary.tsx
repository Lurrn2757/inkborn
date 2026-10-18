import { Component, type ErrorInfo, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Retain the in-memory session; never log note content. */ }
  render() {
    if (this.state.failed) return <main className="recovery-screen"><p className="eyebrow">THE INK STIRRED UNEXPECTEDLY</p><h1>A page came loose.</h1><p>Your current session may still be available. Try reopening the interface.</p><button className="button primary" onClick={() => this.setState({ failed: false })}>Try again</button><button className="button ghost" onClick={() => location.reload()}>Reload application</button></main>;
    return this.props.children;
  }
}
