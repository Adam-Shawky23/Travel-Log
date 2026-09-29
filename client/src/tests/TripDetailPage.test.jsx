import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TripDetailPage from '../pages/TripDetailPage.jsx';
import * as tripsApi from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/trips.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

function renderDetail() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/trips/1']}>
        <Routes>
          <Route path="/trips/:id" element={<TripDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const sampleTrip = {
  _id: '1',
  title: 'Lisbon Trip',
  description: 'Great food',
  location: { name: 'Lisbon' },
  photos: [],
  isPublic: false,
  owner: 'owner-id',
};

describe('TripDetailPage', () => {
  it('shows owner controls when the current user owns the trip', async () => {
    tripsApi.fetchTrip.mockResolvedValue(sampleTrip);
    useAuth.mockReturnValue({ user: { id: 'owner-id' } });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('hides owner controls for a non-owner', async () => {
    tripsApi.fetchTrip.mockResolvedValue(sampleTrip);
    useAuth.mockReturnValue({ user: { id: 'someone-else' } });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Lisbon Trip')).toBeInTheDocument();
    });
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
