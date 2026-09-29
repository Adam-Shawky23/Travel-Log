import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TripForm from '../components/TripForm.jsx';

vi.mock('../components/MapPicker.jsx', () => ({
  default: ({ onPick }) => <button onClick={() => onPick({ lat: 10, lng: 20 })}>Mock Map</button>,
}));

describe('TripForm', () => {
  it('shows a validation error when submitting without a title or pin', () => {
    const onSubmit = vi.fn();
    render(<TripForm onSubmit={onSubmit} submitLabel="Create trip" />);

    fireEvent.click(screen.getByText('Create trip'));

    expect(screen.getByText('Title and a map location are required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits form data once title and location are set', () => {
    const onSubmit = vi.fn();
    render(<TripForm onSubmit={onSubmit} submitLabel="Create trip" />);

    fireEvent.change(screen.getByPlaceholderText('Trip title'), {
      target: { value: 'Lisbon Trip' },
    });
    fireEvent.click(screen.getByText('Mock Map'));
    fireEvent.click(screen.getByText('Create trip'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const formData = onSubmit.mock.calls[0][0];
    expect(formData.get('title')).toBe('Lisbon Trip');
    expect(formData.get('lat')).toBe('10');
  });

  it('omits the photo input when allowPhotoUpload is false', () => {
    render(<TripForm onSubmit={vi.fn()} submitLabel="Save changes" allowPhotoUpload={false} />);
    expect(screen.queryByLabelText(/photos/i)).not.toBeInTheDocument();
  });
});
