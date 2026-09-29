import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import * as authApi from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../api/auth.js');
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  it('shows an error message when login fails', async () => {
    useAuth.mockReturnValue({ loginWithToken: vi.fn() });
    authApi.login.mockRejectedValue({
      response: { data: { error: 'Invalid email or password' } },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('calls loginWithToken and navigates on success', async () => {
    const loginWithToken = vi.fn();
    useAuth.mockReturnValue({ loginWithToken });
    authApi.login.mockResolvedValue({ token: 'fake-token' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await waitFor(() => {
      expect(loginWithToken).toHaveBeenCalledWith('fake-token');
    });
  });
});
