import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function TripsMap({ trips }) {
  const navigate = useNavigate();
  const center = trips.length > 0 ? [trips[0].location.lat, trips[0].location.lng] : [20, 0];
  const zoom = trips.length > 0 ? 3 : 2;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trips.map((trip) => (
        <Marker
          key={trip._id}
          position={[trip.location.lat, trip.location.lng]}
          icon={markerIcon}
          eventHandlers={{ click: () => navigate(`/trips/${trip._id}`) }}
        >
          <Popup>{trip.title}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default TripsMap;
