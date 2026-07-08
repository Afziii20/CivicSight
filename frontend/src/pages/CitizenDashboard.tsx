import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../api';
import { MapPin, Clock, Plus, Inbox } from 'lucide-react';

interface Report {
  id: string;
  citizen_description: string | null;
  address: string | null;
  image_url: string;
  status: string;
  priority: string | null;
  category: string | null;
  created_at: string;
}

export const CitizenDashboard = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await fetchApi('/reports/my');
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading your reports...</p>
      </div>
    );
  }

  return (
    <div className="container animate-in" style={{ padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>My Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{reports.length} issue{reports.length !== 1 ? 's' : ''} reported</p>
        </div>
        <Link to="/report" className="btn btn-primary btn-sm">
          <Plus size={16} /> New report
        </Link>
      </div>
      
      {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

      {reports.length === 0 && !error ? (
        <div className="card empty-state">
          <Inbox size={48} />
          <h3 style={{ marginBottom: '8px' }}>No reports yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>When you report an issue, it will show up here.</p>
          <Link to="/report" className="btn btn-primary btn-sm">Report your first issue</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {reports.map((report, i) => (
            <div 
              key={report.id} 
              className="card card-interactive animate-in" 
              style={{ overflow: 'hidden', animationDelay: `${i * 0.05}s`, opacity: 0 }}
            >
              <img 
                src={report.image_url} alt="Issue photo" 
                style={{ width: '100%', height: '180px', objectFit: 'cover' }} 
              />
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge badge-${report.status}`}>{report.status.replace(/_/g, ' ')}</span>
                  {report.priority && <span className={`badge badge-priority priority-${report.priority}`}>{report.priority}</span>}
                </div>
                
                {report.category && (
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary)' }}>{report.category}</h4>
                )}

                {report.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <MapPin size={14} /> 
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.address}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Clock size={14} /> {formatDate(report.created_at)}
                </div>
                
                {report.citizen_description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {report.citizen_description.length > 100 
                      ? report.citizen_description.substring(0, 100) + '...' 
                      : report.citizen_description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
