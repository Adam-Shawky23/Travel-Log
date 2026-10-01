import { useQuery } from '@tanstack/react-query';
import { fetchPublicTrips } from '../api/public.js';
import ExploreTripCard from '../components/ExploreTripCard.jsx';

function ExplorePage() {
  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['publicTrips'],
    queryFn: fetchPublicTrips,
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-sm text-brass-600 font-medium mb-1">Other travelers</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-8">
        Trips shared by everyone
      </h1>

      {isLoading && <p className="text-ink-700">Loading trips...</p>}
      {isError && <p className="text-oxblood-500">Failed to load trips.</p>}
      {trips && trips.length === 0 && (
        <div className="border border-dashed border-paper-200 rounded-2xl py-16 text-center">
          <p className="text-ink-700">No one has shared a trip yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {trips?.map((trip) => (
          <ExploreTripCard key={trip._id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

export default ExplorePage;
