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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New trip</h1>
      <TripForm onSubmit={(formData) => mutation.mutate(formData)} submitLabel="Create trip" />
      {mutation.isError && (
        <p className="text-red-600 mt-2">
          {mutation.error?.response?.data?.error || 'Failed to create trip.'}
        </p>
      )}
    </div>
  );
}

export default NewTripPage;
