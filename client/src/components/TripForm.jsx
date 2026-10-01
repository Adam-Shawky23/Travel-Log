import { useState, useEffect } from 'react';
import MapPicker from './MapPicker.jsx';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB, matches server/src/middleware/upload.js MAX_SIZE

const fieldClasses =
  'w-full border border-paper-200 rounded-lg px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 outline-none transition-colors bg-white';

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
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Title</label>
        <input
          type="text"
          placeholder="Trip title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClasses}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Description</label>
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldClasses}
          rows={4}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={fieldClasses}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink-700 mb-1.5">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={fieldClasses}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1.5">Location name</label>
        <input
          type="text"
          placeholder="Location name (e.g. Lisbon, Portugal)"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          className={fieldClasses}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-ink-700 mb-1.5">Click the map to drop a pin</p>
        <div className="rounded-xl overflow-hidden border border-paper-200">
          <MapPicker lat={lat} lng={lng} onPick={handlePick} />
        </div>
      </div>

      {allowPhotoUpload && (
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Photos</label>
          <input
            aria-label="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotosChange}
            className="text-sm text-ink-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-ink-900 file:text-paper-50 file:text-sm file:font-medium hover:file:bg-ink-800 file:cursor-pointer cursor-pointer"
          />
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {photoPreviews.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={`Selected photo ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-paper-200"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-oxblood-500 text-sm">{error}</p>}

      <button
        type="submit"
        className="bg-brass-500 text-ink-900 rounded-full px-6 py-2.5 font-medium hover:bg-brass-400 transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  );
}

export default TripForm;
