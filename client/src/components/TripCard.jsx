import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TripCard({ trip }) {
  return (
    <Link
      to={`/trips/${trip._id}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md transition"
    >
      {trip.photos.length > 0 && (
        <img
          src={`${API_URL}${trip.photos[0]}`}
          alt={trip.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-lg">{trip.title}</h3>
        <p className="text-sm text-gray-600">{trip.location.name}</p>
      </div>
    </Link>
  );
}

export default TripCard;
