import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function NavBar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="border-b px-6 py-4 flex justify-between items-center">
      <Link to="/" className="font-bold text-xl">
        Travel Log
      </Link>
      <div className="space-x-4">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/map">Map</Link>
            <button onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
