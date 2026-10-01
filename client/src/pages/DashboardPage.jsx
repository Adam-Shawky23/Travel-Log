import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripCard from '../components/TripCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function DashboardPage() {
  const { user } = useAuth();
  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-sm text-brass-600 font-medium mb-1">Your log</p>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            Welcome{user ? `, ${user.name}` : ''}
          </h1>
        </div>
        <Link
          to="/trips/new"
          className="bg-ink-900 text-paper-50 px-4 py-2.5 rounded-full font-medium text-sm hover:bg-ink-800 transition-colors"
        >
          New trip
        </Link>
      </div>

      {isLoading && <p className="text-ink-700">Loading trips...</p>}
      {isError && <p className="text-oxblood-500">Failed to load trips.</p>}
      {trips && trips.length === 0 && (
        <div className="border border-dashed border-paper-200 rounded-2xl py-16 text-center">
          <p className="text-ink-700">No trips yet. Create your first one!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {trips?.map((trip) => (
          <TripCard key={trip._id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
