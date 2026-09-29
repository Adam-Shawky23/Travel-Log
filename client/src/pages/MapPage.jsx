import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripsMap from '../components/TripsMap.jsx';

function MapPage() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  if (isLoading) return <p className="p-6">Loading map...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your trips on the map</h1>
      <TripsMap trips={trips || []} />
    </div>
  );
}

export default MapPage;
