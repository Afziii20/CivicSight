import { Link } from 'react-router-dom';
import { Camera, BarChart3, HeartHandshake, ArrowRight, Leaf, Shield } from 'lucide-react';
import { useAuth } from '../AuthContext';

export const Landing = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Hero */}
      <section style={{ 
        padding: '80px 0 60px', 
        background: 'linear-gradient(165deg, var(--primary-faint) 0%, var(--bg) 50%, var(--accent-faint) 100%)'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '720px' }}>
          <div className="animate-in" style={{ marginBottom: '24px' }}>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: 'var(--radius-full)',
              background: 'var(--primary-faint)', color: 'var(--primary)',
              fontSize: '0.85rem', fontWeight: 600
            }}>
              <Leaf size={14} /> Powering smarter cities — starting with Raipur
            </span>
          </div>
          
          <h1 className="animate-in" style={{ 
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', 
            marginBottom: '20px',
            letterSpacing: '-0.02em'
          }}>
            Your city listens<br />when you speak up.
          </h1>
          
          <p className="animate-in animate-in-delay-1" style={{ 
            fontSize: 'clamp(1rem, 3vw, 1.15rem)', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.7,
            marginBottom: '36px',
            maxWidth: '540px',
            margin: '0 auto 36px'
          }}>
            See a broken sidewalk? A fallen tree? A flickering streetlight? 
            Snap a photo, and CivicSight's AI will handle the rest — classifying, routing, and tracking the fix.
          </p>

          <div className="animate-in animate-in-delay-2" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/report" className="btn btn-primary">
                Report an issue <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/auth?mode=signup" className="btn btn-primary">
                  Get started — it's free <ArrowRight size={18} />
                </Link>
                <Link to="/auth" className="btn btn-outline">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <h2 className="animate-in" style={{ textAlign: 'center', marginBottom: '12px' }}>How it works</h2>
          <p className="animate-in" style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '48px' }}>Three steps. That's all it takes.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div className="card card-interactive animate-in animate-in-delay-1" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'var(--primary-faint)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <Camera size={26} color="var(--primary)" />
              </div>
              <h4 style={{ marginBottom: '8px' }}>1. Snap a photo</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Take a picture of any civic issue in your neighborhood. Your phone camera is all you need to help keep Raipur clean and safe.
              </p>
            </div>

            <div className="card card-interactive animate-in animate-in-delay-2" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'var(--accent-faint)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <BarChart3 size={26} color="var(--accent)" />
              </div>
              <h4 style={{ marginBottom: '8px' }}>2. AI classifies it</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Our AI instantly analyzes the image, detects your location, and routes it directly to the appropriate RMC ward office.
              </p>
            </div>

            <div className="card card-interactive animate-in animate-in-delay-3" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'var(--success-faint)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <HeartHandshake size={26} color="var(--success)" />
              </div>
              <h4 style={{ marginBottom: '8px' }}>3. Your city acts</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                City officials receive your report, track their progress, and you get to watch it move from "submitted" to "resolved."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border)', 
        padding: '32px 0', 
        textAlign: 'center', 
        color: 'var(--text-muted)', 
        fontSize: '0.875rem' 
      }}>
        <div className="container">
          <div style={{ marginBottom: '6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            CivicSight
          </div>
          <div style={{ marginBottom: '10px' }}>
            Built with ❤️ for the people of Raipur. &copy; {new Date().getFullYear()} CivicSight.
          </div>
          <Link 
            to="/admin-login"
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              color: 'var(--text-muted)', fontSize: '0.8rem',
              textDecoration: 'none', opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <Shield size={12} /> Staff Login
          </Link>
        </div>
      </footer>
    </>
  );
};
