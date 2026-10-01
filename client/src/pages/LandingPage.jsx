import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GlobeIllustration from '../components/GlobeIllustration.jsx';

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-sm font-medium text-brass-600 mb-4">A private log, open when you choose</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink-900 leading-tight mb-5">
          Travel Log
        </h1>
        <p className="text-ink-700 text-lg leading-relaxed max-w-md mb-8">
          Pin the place. Note the moment. Keep a written record of everywhere you've been, and
          share the trips worth telling.
        </p>
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            className="inline-block bg-ink-900 text-paper-50 px-6 py-3 rounded-full font-medium hover:bg-ink-800 transition-colors"
          >
            Go to your dashboard
          </Link>
        ) : (
          <Link
            to="/register"
            className="inline-block bg-brass-500 text-ink-900 px-6 py-3 rounded-full font-medium hover:bg-brass-400 transition-colors"
          >
            Start your first entry
          </Link>
        )}
      </div>
      <div className="flex justify-center md:justify-end">
        <GlobeIllustration className="w-full max-w-sm" />
      </div>
    </div>
  );
}

export default LandingPage;
