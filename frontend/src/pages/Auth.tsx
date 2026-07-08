import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sync form mode when URL query params change (navbar Login ↔ Get Started)
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode !== 'signup');
    setError('');
  }, [searchParams]);
  
  const { login, signup, confirmSignup, isLocalAuth, user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'staff') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (needsConfirmation) {
        await confirmSignup(email, code);
        const profile = await login(email, password);
        if (profile && (profile.role === 'admin' || profile.role === 'staff')) {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      } else if (isLogin) {
        const profile = await login(email, password);
        if (profile && (profile.role === 'admin' || profile.role === 'staff')) {
          logout();
          throw new Error('Please use the Staff Portal to log in.');
        }
        navigate('/dashboard');
      } else {
        await signup(email, password, name);
        if (isLocalAuth) {
          const profile = await login(email, password);
          if (profile && (profile.role === 'admin' || profile.role === 'staff')) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          setNeedsConfirmation(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: 'calc(100dvh - 65px)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      background: 'linear-gradient(165deg, var(--primary-faint) 0%, var(--bg) 60%)'
    }}>
      <div className="card animate-in" style={{ width: '100%', maxWidth: '420px', padding: '40px 32px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Leaf size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>
            {needsConfirmation ? 'Check your email' : isLogin ? 'Welcome back' : 'Join CivicSight'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {needsConfirmation 
              ? `We sent a 6-digit code to ${email}`
              : isLogin 
                ? 'Log in to track your reports' 
                : 'Start making your city better today'}
          </p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {needsConfirmation ? (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Verification code</label>
              <input 
                type="text" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                required 
                placeholder="123456"
                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>
          ) : (
            <>
              {!isLogin && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Your name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="How should we address you?"
                  />
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  placeholder="you@example.com"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder={isLogin ? '••••••••' : 'Min 8 chars, 1 uppercase, 1 number'}
                    style={{ paddingRight: '48px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', color: 'var(--text-muted)', padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '8px', padding: '14px' }} 
            disabled={isLoading}
          >
            {isLoading 
              ? 'Please wait...' 
              : needsConfirmation 
                ? 'Verify & log in' 
                : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        {!needsConfirmation && (
          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ 
                background: 'none', color: 'var(--primary)', 
                fontWeight: 600, textDecoration: 'underline',
                textUnderlineOffset: '2px', border: 'none', cursor: 'pointer'
              }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        )}

        {/* Staff portal link */}
        <div style={{ 
          textAlign: 'center', marginTop: '16px', paddingTop: '16px',
          borderTop: '1px solid var(--border-light)'
        }}>
          <Link 
            to="/admin-login" 
            style={{ 
              color: 'var(--text-muted)', fontSize: '0.85rem', 
              textDecoration: 'none', transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Staff member? Log in here →
          </Link>
        </div>
      </div>
    </div>
  );
};
