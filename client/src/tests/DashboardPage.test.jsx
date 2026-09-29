import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage.jsx';
import * as tripsApi from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/trips.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderDashboard() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  it('renders a card for each trip', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ada' }, logout: vi.fn() });
    tripsApi.fetchTrips.mockResolvedValue([
      { _id: '1', title: 'Lisbon', location: { name: 'Lisbon' }, photos: [] },
      { _id: '2', title: 'Tokyo', location: { name: 'Tokyo' }, photos: [] },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Lisbon/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Tokyo/ })).toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no trips', async () => {
    useAuth.mockReturnValue({ user: { name: 'Ada' }, logout: vi.fn() });
    tripsApi.fetchTrips.mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No trips yet. Create your first one!')).toBeInTheDocument();
    });
  });
});
