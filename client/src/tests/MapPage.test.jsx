import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapPage from '../pages/MapPage.jsx';
import * as tripsApi from '../api/trips.js';

vi.mock('../api/trips.js');
vi.mock('../components/TripsMap.jsx', () => ({
  default: ({ trips }) => <div>{trips.length} pins</div>,
}));

describe('MapPage', () => {
  it('passes fetched trips down to the map', async () => {
    tripsApi.fetchTrips.mockResolvedValue([
      { _id: '1', title: 'A', location: { lat: 1, lng: 1 } },
      { _id: '2', title: 'B', location: { lat: 2, lng: 2 } },
    ]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MapPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 pins')).toBeInTheDocument();
    });
  });
});
