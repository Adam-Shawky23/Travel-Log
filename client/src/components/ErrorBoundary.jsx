import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-sm mx-auto mt-16 p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-gray-600 mb-6">
            An unexpected error occurred. Please try going back to the home page.
          </p>
          <button
            onClick={() => window.location.assign('/')}
            className="bg-blue-600 text-white rounded px-4 py-2"
          >
            Go home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
