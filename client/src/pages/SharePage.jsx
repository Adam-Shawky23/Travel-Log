import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicTrip } from '../api/public.js';
import ShareButtons from '../components/ShareButtons.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatCoord(value, positiveLabel, negativeLabel) {
  const label = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(4)}°${label}`;
}

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

  if (isLoading) return <p className="px-6 py-10 text-ink-700">Loading...</p>;
  if (isError || !trip) {
    return <p className="px-6 py-10 text-oxblood-500">This trip isn't available.</p>;
  }

  const hasCoords = typeof trip.location?.lat === 'number' && typeof trip.location?.lng === 'number';

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-sm text-brass-600 font-medium mb-1">Shared entry</p>
      <h1 className="font-display text-3xl font-semibold text-ink-900">{trip.title}</h1>
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

      <div className="mt-8 pt-6 border-t border-dashed border-paper-200">
        <p className="text-sm text-ink-700 mb-3">Share this trip</p>
        <ShareButtons url={window.location.href} title={trip.title} />
      </div>
    </div>
  );
}

export default SharePage;
