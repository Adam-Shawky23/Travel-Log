import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrip, deleteTrip, updateTrip } from '../api/trips.js';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatCoord(value, positiveLabel, negativeLabel) {
  const label = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(4)}°${label}`;
}

function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionError, setActionError] = useState('');

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
    onError: (err) => {
      setActionError(err.response?.data?.error || 'Failed to delete trip.');
    },
  });

  const shareMutation = useMutation({
    mutationFn: (isPublic) => updateTrip(id, { isPublic }),
    onSuccess: (updated) => {
      setActionError('');
      queryClient.setQueryData(['trips', id], updated);
    },
    onError: (err) => {
      setActionError(err.response?.data?.error || 'Failed to update trip.');
    },
  });

  function handleDelete() {
    if (window.confirm('Delete this trip? This cannot be undone.')) {
      setActionError('');
      deleteMutation.mutate();
    }
  }

  if (isLoading) return <p className="px-6 py-10 text-ink-700">Loading...</p>;
  if (isError || !trip) return <p className="px-6 py-10 text-oxblood-500">Trip not found.</p>;

  const isOwner = user && trip.owner === user.id;
  const hasCoords = typeof trip.location?.lat === 'number' && typeof trip.location?.lng === 'number';

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link to="/dashboard" className="text-sm text-ink-700 hover:text-ink-900 mb-6 inline-block">
        ← Back to your log
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-ink-900">{trip.title}</h1>
        {trip.isPublic && (
          <span className="shrink-0 -rotate-6 border-2 border-oxblood-500 text-oxblood-500 rounded-full w-16 h-16 flex items-center justify-center text-xs font-semibold text-center leading-tight">
            Shared
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1.5 text-ink-700">
        <span>{trip.location.name}</span>
        {hasCoords && (
          <span className="text-xs tabular-nums text-brass-600 border-l border-paper-200 pl-3">
            {formatCoord(trip.location.lat, 'N', 'S')} {formatCoord(trip.location.lng, 'E', 'W')}
          </span>
        )}
      </div>

      {trip.description && <p className="mt-5 text-ink-900 leading-relaxed">{trip.description}</p>}

      {trip.photos.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-6">
          {trip.photos.map((photo) => (
            <img
              key={photo}
              src={`${API_URL}${photo}`}
              alt={trip.title}
              className="w-40 h-40 object-cover rounded-xl shadow-card"
            />
          ))}
        </div>
      )}

      {isOwner && (
        <div className="mt-8 pt-6 border-t border-dashed border-paper-200">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/trips/${id}/edit`}
              className="text-sm font-medium bg-white border border-paper-200 text-ink-900 px-4 py-2 rounded-full hover:border-brass-500 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-sm font-medium bg-white border border-paper-200 text-oxblood-500 px-4 py-2 rounded-full hover:border-oxblood-500 transition-colors disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => shareMutation.mutate(!trip.isPublic)}
              disabled={shareMutation.isPending}
              className="text-sm font-medium bg-ink-900 text-paper-50 px-4 py-2 rounded-full hover:bg-ink-800 transition-colors disabled:opacity-50"
            >
              {trip.isPublic ? 'Make private' : 'Make public'}
            </button>
          </div>
          {actionError && <p className="text-oxblood-500 text-sm mt-3">{actionError}</p>}
          {trip.isPublic && (
            <p className="mt-4 text-sm text-ink-700">
              Shareable link:{' '}
              <span className="text-brass-600">
                {window.location.origin}/share/{trip._id}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TripDetailPage;
