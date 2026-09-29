import { useAuth } from '../context/AuthContext.jsx';

function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.name}` : ''}</h1>
      <button onClick={logout} className="text-gray-600 mt-4">
        Log out
      </button>
    </div>
  );
}

export default DashboardPage;
