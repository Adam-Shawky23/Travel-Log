import { useState, useEffect } from 'react';
import MapPicker from './MapPicker.jsx';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB, matches server/src/middleware/upload.js MAX_SIZE

function TripForm({ initialValues, onSubmit, submitLabel, allowPhotoUpload = true }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [startDate, setStartDate] = useState(initialValues?.startDate?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(initialValues?.endDate?.slice(0, 10) || '');
  const [locationName, setLocationName] = useState(initialValues?.location?.name || '');
  const [lat, setLat] = useState(initialValues?.location?.lat ?? null);
  const [lng, setLng] = useState(initialValues?.location?.lng ?? null);
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const previews = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  function handlePick(latlng) {
    setLat(latlng.lat);
    setLng(latlng.lng);
  }

  function handlePhotosChange(e) {
    const files = Array.from(e.target.files);
    const invalidFile = files.find(
      (file) => !ALLOWED_PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_SIZE
    );
    if (invalidFile) {
      setError('Photos must be JPEG, PNG, or WebP and no larger than 5MB.');
      return;
    }
    setError('');
    setPhotos(files);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title || lat === null || lng === null) {
      setError('Title and a map location are required.');
      return;
    }
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('locationName', locationName);
    formData.append('lat', lat);
    formData.append('lng', lng);
    if (allowPhotoUpload) {
      photos.forEach((file) => formData.append('photos', file));
    }

    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <input
        type="text"
        placeholder="Trip title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border rounded px-3 py-2"
        rows={4}
      />
      <div className="flex gap-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>
      <input
        type="text"
        placeholder="Location name (e.g. Lisbon, Portugal)"
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
        className="w-full border rounded px-3 py-2"
      />
      <p className="text-sm text-gray-600">Click the map to drop a pin:</p>
      <MapPicker lat={lat} lng={lng} onPick={handlePick} />
      {allowPhotoUpload && (
        <div>
          <input
            aria-label="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotosChange}
          />
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photoPreviews.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={`Selected photo ${index + 1}`}
                  className="w-20 h-20 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2">
        {submitLabel}
      </button>
    </form>
  );
}

export default TripForm;
