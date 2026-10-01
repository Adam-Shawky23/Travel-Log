import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function CompassMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M15 8.5L12.8 12.8L9 15L11.2 10.7L15 8.5Z" fill="currentColor" />
    </svg>
  );
}

function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  const linkClasses =
    'text-sm font-medium text-paper-100/80 hover:text-paper-50 transition-colors';

  return (
    <nav className="bg-ink-900 px-6 py-4">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-semibold text-paper-50"
        >
          <span className="text-brass-500">
            <CompassMark />
          </span>
          Travel Log
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/explore" className={linkClasses}>
            Explore
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={linkClasses}>
                Dashboard
              </Link>
              <Link to="/map" className={linkClasses}>
                Map
              </Link>
              <button onClick={logout} className={linkClasses}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClasses}>
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-brass-500 text-ink-900 px-3.5 py-1.5 rounded-full hover:bg-brass-400 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
