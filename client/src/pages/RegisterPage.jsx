import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token } = await register({ name, email, password });
      loginWithToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-6">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-card p-6">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-paper-200 rounded-lg px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 outline-none transition-colors"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-paper-200 rounded-lg px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 outline-none transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-paper-200 rounded-lg px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 focus:border-brass-500 focus:ring-1 focus:ring-brass-500 outline-none transition-colors"
          required
        />
        {error && <p className="text-oxblood-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-brass-500 text-ink-900 rounded-lg py-2.5 font-medium hover:bg-brass-400 transition-colors"
        >
          Create account
        </button>
      </form>
      <p className="mt-5 text-sm text-ink-700 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-brass-600 font-medium hover:text-brass-500">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
