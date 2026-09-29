import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SharePage from '../pages/SharePage.jsx';
import * as publicApi from '../api/public.js';

vi.mock('../api/public.js');

function renderShare() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/share/1']}>
        <Routes>
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SharePage', () => {
  it('renders a public trip', async () => {
    publicApi.fetchPublicTrip.mockResolvedValue({
      _id: '1',
      title: 'Lisbon Trip',
      description: 'Great food',
      location: { name: 'Lisbon' },
      photos: [],
    });

    renderShare();

    await waitFor(() => {
      expect(screen.getByText('Lisbon Trip')).toBeInTheDocument();
    });
  });

  it('shows a not-available message when the trip is private or missing', async () => {
    publicApi.fetchPublicTrip.mockRejectedValue({ response: { status: 404 } });

    renderShare();

    await waitFor(() => {
      expect(screen.getByText("This trip isn't available.")).toBeInTheDocument();
    });
  });
});
