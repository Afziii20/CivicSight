import { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import { MapPin, ArrowRight, Clock, Inbox } from 'lucide-react';

interface Report {
  id: string;
  citizen_description: string | null;
  address: string | null;
  image_url: string;
  status: string;
  priority: string | null;
  category: string | null;
  zone: number | null;
  ward: number | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

const STATUS_FLOW: Record<string, { next: string; label: string; }[]> = {
  'needs_review': [
    { next: 'assigned', label: 'Assign' },
    { next: 'rejected', label: 'Reject' }
  ],
  'assigned': [
    { next: 'in_progress', label: 'Start Work' },
    { next: 'rejected', label: 'Reject' }
  ],
  'in_progress': [
    { next: 'resolved', label: 'Mark Resolved' },
    { next: 'escalated', label: 'Escalate' }
  ],
  'escalated': [
    { next: 'in_progress', label: 'Resume Work' },
    { next: 'assigned', label: 'Reassign' }
  ],
};

export const AdminDashboard = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const data = await fetchApi('/reports/');
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetchApi(`/admin/reports/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ new_status: newStatus })
      });
      setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const filtered = filterStatus === 'all' ? reports : reports.filter(r => r.status === filterStatus);
  const statuses = ['all', 'needs_review', 'assigned', 'in_progress', 'escalated', 'resolved', 'rejected'];

  if (loading) return <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div className="container animate-in" style={{ padding: '40px 20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2>Command Center</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{reports.length} total reports across the city</p>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px' }}>
        {statuses.map(s => (
          <button 
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 500,
              background: filterStatus === s ? 'var(--primary)' : 'var(--bg-warm)',
              color: filterStatus === s ? '#fff' : 'var(--text-secondary)',
              border: '1px solid ' + (filterStatus === s ? 'var(--primary)' : 'var(--border)'),
              whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <Inbox size={48} />
          <h3>No reports match this filter</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((report, i) => (
            <div key={report.id} className="card animate-in" style={{ 
              display: 'flex', flexDirection: 'row', overflow: 'hidden',
              animationDelay: `${i * 0.03}s`, opacity: 0
            }}>
              <img 
                src={report.image_url} alt="Issue"
                style={{ width: '140px', minHeight: '140px', objectFit: 'cover', flexShrink: 0 }} 
              />
              <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge badge-${report.status}`}>{report.status.replace(/_/g, ' ')}</span>
                  {report.priority && <span className={`badge badge-priority priority-${report.priority}`}>{report.priority}</span>}
                  {report.category && <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{report.category}</span>}
                </div>

                {report.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <MapPin size={14} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.address}</span>
                    {report.lat && report.lng && (
                      <a 
                        href={`https://maps.google.com/?q=${report.lat},${report.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 500, marginLeft: '4px', textDecoration: 'none' }}
                      >
                        (View on Map)
                      </a>
                    )}
                  </div>
                )}

                {(report.zone || report.ward) && (
                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {report.zone && <span className="badge" style={{ background: 'var(--bg-warm)' }}>Zone {report.zone}</span>}
                    {report.ward && <span className="badge" style={{ background: 'var(--bg-warm)' }}>Ward {report.ward}</span>}
                  </div>
                )}

                {report.citizen_description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {report.citizen_description.length > 120 ? report.citizen_description.substring(0, 120) + '...' : report.citizen_description}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto' }}>
                  <Clock size={12} /> {formatDate(report.created_at)}
                </div>

                {/* Status actions */}
                {STATUS_FLOW[report.status] && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {STATUS_FLOW[report.status].map(action => (
                      <button 
                        key={action.next}
                        className={action.next === 'rejected' ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
                        style={action.next === 'rejected' ? { background: 'var(--danger-faint)', color: 'var(--danger)' } : {}}
                        onClick={() => updateStatus(report.id, action.next)}
                      >
                        {action.label} <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
