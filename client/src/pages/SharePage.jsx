import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTrip } from '../api/public.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function SharePage() {
  const { id } = useParams();

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-trip', id],
    queryFn: () => fetchPublicTrip(id),
    retry: false,
  });

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError || !trip) {
    return <p className="p-6 text-red-600">This trip isn't available.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">{trip.title}</h1>
      <p className="text-gray-600">{trip.location.name}</p>
      <p className="mt-4">{trip.description}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {trip.photos.map((photo) => (
          <img
            key={photo}
            src={`${API_URL}${photo}`}
            alt={trip.title}
            className="w-40 h-40 object-cover rounded"
          />
        ))}
      </div>
    </div>
  );
}

export default SharePage;
