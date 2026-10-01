import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TripForm from '../components/TripForm.jsx';
import { fetchTrip, updateTrip } from '../api/trips.js';

function EditTripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => fetchTrip(id),
  });

  const mutation = useMutation({
    mutationFn: (formData) => updateTrip(id, Object.fromEntries(formData.entries())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
      navigate(`/trips/${id}`);
    },
  });

  if (isLoading) return <p className="px-6 py-10 text-ink-700">Loading...</p>;
  if (isError) return <p className="px-6 py-10 text-oxblood-500">Failed to load trip.</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-sm text-brass-600 font-medium mb-1">Editing</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-6">Edit trip</h1>
      <TripForm
        initialValues={trip}
        onSubmit={(formData) => mutation.mutate(formData)}
        submitLabel="Save changes"
        allowPhotoUpload={false}
      />
      {mutation.isError && (
        <p className="text-oxblood-500 mt-3">
          {mutation.error?.response?.data?.error || 'Failed to save changes.'}
        </p>
      )}
    </div>
  );
}

export default EditTripPage;
