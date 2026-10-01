import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripsMap from '../components/TripsMap.jsx';

function MapPage() {
  const { data: trips, isLoading, isError } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  if (isLoading) return <p className="px-6 py-10 text-ink-700">Loading map...</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-sm text-brass-600 font-medium mb-1">The full route</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-6">
        Your trips on the map
      </h1>
      {isError && <p className="text-oxblood-500 mb-4">Failed to load trips.</p>}
      <div className="rounded-2xl overflow-hidden border border-paper-200 shadow-card">
        <TripsMap trips={trips || []} />
      </div>
    </div>
  );
}

export default MapPage;
