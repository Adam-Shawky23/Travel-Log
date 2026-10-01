import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function formatCoord(value, positiveLabel, negativeLabel) {
  const label = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(2)}°${label}`;
}

function ExploreTripCard({ trip }) {
  const hasCoords = typeof trip.location?.lat === 'number' && typeof trip.location?.lng === 'number';

  return (
    <Link
      to={`/share/${trip._id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-lifted transition-shadow duration-200"
    >
      {trip.photos.length > 0 ? (
        <img
          src={`${API_URL}${trip.photos[0]}`}
          alt={trip.title}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-ink-900 flex items-center justify-center">
          <span className="text-paper-50/40 text-xs tracking-wide">No photo</span>
        </div>
      )}

      <div className="relative px-4 pt-4 pb-3 border-t border-dashed border-paper-200">
        <span
          className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-paper-50"
          aria-hidden="true"
        />
        <h3 className="font-display text-lg font-semibold text-ink-900 group-hover:text-ink-700">
          {trip.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-ink-700">{trip.location.name}</p>
          {hasCoords && (
            <span className="text-[11px] tabular-nums text-brass-600 whitespace-nowrap ml-2">
              {formatCoord(trip.location.lat, 'N', 'S')} {formatCoord(trip.location.lng, 'E', 'W')}
            </span>
          )}
        </div>
        {trip.owner?.name && (
          <p className="text-xs text-ink-400 mt-2">By {trip.owner.name}</p>
        )}
      </div>
    </Link>
  );
}

export default ExploreTripCard;
