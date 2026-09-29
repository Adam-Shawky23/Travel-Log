import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../api/trips.js';
import TripCard from '../components/TripCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function DashboardPage() {
  const { user, logout } = useAuth();
  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.name}` : ''}</h1>
        <div className="space-x-4">
          <Link to="/trips/new" className="bg-blue-600 text-white px-4 py-2 rounded">
            New trip
          </Link>
          <button onClick={logout} className="text-gray-600">
            Log out
          </button>
        </div>
      </div>

      {isLoading && <p>Loading trips...</p>}
      {isError && <p className="text-red-600">Failed to load trips.</p>}
      {trips && trips.length === 0 && <p>No trips yet. Create your first one!</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {trips?.map((trip) => (
          <TripCard key={trip._id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
