import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">Travel Log</h1>
      <p className="text-gray-600 max-w-md mb-8">
        Keep a map of everywhere you've been. Log trips with photos and notes, pin them on a map,
        and share your favorites with anyone.
      </p>
      {isAuthenticated ? (
        <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded">
          Go to your dashboard
        </Link>
      ) : (
        <Link to="/register" className="bg-blue-600 text-white px-6 py-3 rounded">
          Get started
        </Link>
      )}
    </div>
  );
}

export default LandingPage;
