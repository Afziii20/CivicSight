import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const AdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await login(email, password);
      if (profile && profile.role !== 'admin' && profile.role !== 'staff') {
        logout();
        throw new Error('Access Denied: This portal is for authorized staff only.');
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-auth-wrapper">
      {/* Floating grid pattern background */}
      <div className="admin-auth-bg-pattern" />

      <div className="admin-auth-card animate-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="admin-auth-icon">
            <Shield size={28} />
          </div>
          <h2 className="admin-auth-title">Staff Portal</h2>
          <p className="admin-auth-subtitle">Authorized personnel only</p>
        </div>

        {error && (
          <div className="admin-auth-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="admin-auth-label">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="staff@civicsight.gov.in"
              className="admin-auth-input"
            />
          </div>

          <div>
            <label className="admin-auth-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="admin-auth-input"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', color: '#7a8ba8', padding: '4px', cursor: 'pointer',
                  border: 'none'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-auth-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Access Command Center'}
          </button>
        </form>

        <div className="admin-auth-footer">
          <p>
            Not a staff member?{' '}
            <a href="/auth" className="admin-auth-link">
              Citizen login →
            </a>
          </p>
        </div>

        {/* Security note */}
        <div className="admin-auth-security-note">
          <Shield size={12} />
          <span>Secured connection · All sessions are monitored</span>
        </div>
      </div>
    </div>
  );
};
