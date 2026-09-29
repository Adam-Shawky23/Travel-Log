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

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">Failed to load trip.</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit trip</h1>
      <TripForm
        initialValues={trip}
        onSubmit={(formData) => mutation.mutate(formData)}
        submitLabel="Save changes"
        allowPhotoUpload={false}
      />
      {mutation.isError && (
        <p className="text-red-600 mt-2">
          {mutation.error?.response?.data?.error || 'Failed to save changes.'}
        </p>
      )}
    </div>
  );
}

export default EditTripPage;
