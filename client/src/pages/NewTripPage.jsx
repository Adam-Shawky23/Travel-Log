import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TripForm from '../components/TripForm.jsx';
import { createTrip } from '../api/trips.js';

function NewTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(`/trips/${trip._id}`);
    },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-sm text-brass-600 font-medium mb-1">New entry</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-6">New trip</h1>
      <TripForm onSubmit={(formData) => mutation.mutate(formData)} submitLabel="Create trip" />
      {mutation.isError && (
        <p className="text-oxblood-500 mt-3">
          {mutation.error?.response?.data?.error || 'Failed to create trip.'}
        </p>
      )}
    </div>
  );
}

export default NewTripPage;
