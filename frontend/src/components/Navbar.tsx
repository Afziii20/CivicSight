import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const close = () => setIsOpen(false);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={close}>
          <Leaf size={24} />
          CivicSight
        </Link>

        {/* Desktop */}
        <div className="nav-links">
          {!user ? (
            <>
              <Link to="/auth" className="nav-link">Log in</Link>
              <Link to="/auth?mode=signup" className="btn btn-primary btn-sm">Get Started</Link>
              <Link to="/admin-login" className="nav-link" style={{ fontSize: '0.85rem', opacity: 0.8, marginLeft: '8px' }}>Staff Portal</Link>
            </>
          ) : (
            <>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'var(--bg-warm)', padding: '4px 10px', 
              borderRadius: 'var(--radius-full)', fontSize: '0.8rem', 
              fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px'
            }}>
              {user.role === 'admin' || user.role === 'staff' ? '🛡️ Staff' : '👤 Citizen'}
            </div>
            {(user.role === 'admin' || user.role === 'staff') ? (
              <Link to="/admin" className="nav-link">Command Center</Link>
            ) : (
              <>
                <Link to="/dashboard" className="nav-link">My Reports</Link>
                <Link to="/report" className="btn btn-primary btn-sm">Report Issue</Link>
              </>
            )}
            <button type="button" onClick={handleLogout} className="btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Log out</button>
          </>
          )}
        </div>

        {/* Mobile */}
        <button type="button" className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div className="mobile-menu animate-in">
          {!user ? (
            <>
              <Link to="/auth" className="nav-link" onClick={close}>Log in</Link>
              <Link to="/auth?mode=signup" className="btn btn-primary" onClick={close}>Get Started</Link>
              <Link to="/admin-login" className="nav-link" onClick={close} style={{ opacity: 0.8, fontSize: '0.9rem' }}>Staff Portal</Link>
            </>
          ) : (
            <>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'var(--bg-warm)', padding: '6px 12px', 
              borderRadius: 'var(--radius-full)', fontSize: '0.9rem', 
              fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', justifyContent: 'center'
            }}>
              {user.role === 'admin' || user.role === 'staff' ? '🛡️ Staff Member' : '👤 Citizen'}
            </div>
            {(user.role === 'admin' || user.role === 'staff') ? (
              <Link to="/admin" className="nav-link" onClick={close}>Command Center</Link>
            ) : (
              <>
                <Link to="/dashboard" className="nav-link" onClick={close}>My Reports</Link>
                <Link to="/report" className="btn btn-primary" onClick={close}>Report Issue</Link>
              </>
            )}
            <button type="button" onClick={handleLogout} className="nav-link" style={{ color: 'var(--danger)', textAlign: 'center' }}>Log out</button>
          </>
          )}
        </div>
      )}
    </nav>
  );
};
