import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token } = await login({ email, password });
      loginWithToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-6">
      <h1 className="font-display text-2xl font-semibold text-ink-900 mb-6">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow-card p-6">
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
          className="w-full bg-ink-900 text-paper-50 rounded-lg py-2.5 font-medium hover:bg-ink-800 transition-colors"
        >
          Log in
        </button>
      </form>
      <p className="mt-5 text-sm text-ink-700 text-center">
        No account?{' '}
        <Link to="/register" className="text-brass-600 font-medium hover:text-brass-500">
          Register
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
