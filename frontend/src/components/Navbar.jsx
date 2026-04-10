import { Link } from 'react-router-dom';
import { Bot, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon"><Bot size={20} /></span>
        InterviewIQ.AI
      </Link>
      <div className="navbar-right">
        {isLoggedIn ? (
          <>
            <div className="navbar-user-info">
              {user?.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt="" 
                  className="navbar-user-photo" 
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="navbar-user-name">
                {user?.displayName?.split(' ')[0] || 'User'}
              </span>
            </div>
            <div className="user-avatar" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </div>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
