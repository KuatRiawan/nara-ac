import { Component } from 'react';

/**
 * ErrorBoundary component to catch and handle React component errors
 * Usage: Wrap any component tree that might throw errors
 * Example: <ErrorBoundary><MyComponent /></ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50" role="alert">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h2>
            <p className="text-slate-600 mb-6">
              Maaf, terjadi kesalahan tidak terduga saat memuat halaman ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Muat Ulang
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4 text-left text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 overflow-auto max-h-32">
                <summary className="font-bold text-red-600 cursor-pointer">Detail Teknis</summary>
                <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-slate-800">{this.state.error.toString()}</pre>
              </details>
            )}
            {this.props.fallback ? this.props.fallback : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
