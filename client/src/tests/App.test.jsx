import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('App', () => {
  it('renders the landing page heading', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Travel Log' })).toBeInTheDocument();
  });
});
