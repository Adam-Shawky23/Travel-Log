import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrip, deleteTrip, updateTrip } from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: trip,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => fetchTrip(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate('/dashboard');
    },
  });

  const shareMutation = useMutation({
    mutationFn: (isPublic) => updateTrip(id, { isPublic }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['trips', id], updated);
    },
  });

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError || !trip) return <p className="p-6 text-red-600">Trip not found.</p>;

  const isOwner = user && trip.owner === user.id;

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

      {isOwner && (
        <div className="mt-6 space-x-4">
          <Link to={`/trips/${id}/edit`} className="text-blue-600">
            Edit
          </Link>
          <button onClick={() => deleteMutation.mutate()} className="text-red-600">
            Delete
          </button>
          <button onClick={() => shareMutation.mutate(!trip.isPublic)} className="text-gray-700">
            {trip.isPublic ? 'Make private' : 'Make public'}
          </button>
          {trip.isPublic && (
            <span className="block mt-2 text-sm text-gray-600">
              Shareable link: {window.location.origin}/share/{trip._id}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TripDetailPage;
