import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, CheckCircle2, Navigation, Loader2 } from 'lucide-react';
import { fetchApi } from '../api';
import {
  WARD_ZONE_MAP,
  WARD_NAMES,
  getZoneForWard,
  getWardsForZone,
  getAllZones,
  lookupWardZoneFromAddress,
} from '../raipurWardZoneData';

/** Compress an image file using canvas. Returns a smaller JPEG blob. */
const compressImage = (file: File, maxDim = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than maxDim
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'));
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/** Format bytes to human-readable string */
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ReportIssue = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('');
  const [ward, setWard] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [isCompressing, setIsCompressing] = useState(false);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const navigate = useNavigate();

  // Get filtered ward list based on selected zone
  const getAvailableWards = (): number[] => {
    if (zone) {
      return getWardsForZone(Number(zone));
    }
    // Return all wards sorted
    return Object.keys(WARD_ZONE_MAP).map(Number).sort((a, b) => a - b);
  };

  const handleZoneChange = (newZone: string) => {
    setZone(newZone);
    // If current ward doesn't belong to new zone, clear it
    if (ward && newZone) {
      const zoneForWard = getZoneForWard(Number(ward));
      if (zoneForWard !== Number(newZone)) {
        setWard('');
      }
    }
  };

  const handleWardChange = (newWard: string) => {
    setWard(newWard);
    // Auto-select the zone for this ward
    if (newWard) {
      const wardZone = getZoneForWard(Number(newWard));
      if (wardZone) {
        setZone(String(wardZone));
      }
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
        {
          headers: {
            'User-Agent': 'CivicSight/1.0 (civic-issue-reporting)',
          },
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setGpsStatus('detecting');
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLng(longitude);

        // Reverse geocode to get address
        const geoData = await reverseGeocode(latitude, longitude);

        if (geoData && geoData.display_name) {
          // Build a clean address from the components
          const addr = geoData.address || {};
          const parts = [
            addr.road || addr.pedestrian || addr.footway,
            addr.neighbourhood || addr.suburb || addr.hamlet,
            addr.city_district || addr.county,
            addr.city || addr.town || addr.village,
          ].filter(Boolean);

          const cleanAddress = parts.length > 0 
            ? parts.join(', ')
            : geoData.display_name.split(',').slice(0, 3).join(', ');

          setAddress(cleanAddress);

          // Try to auto-detect ward and zone from the address
          const wardZone = lookupWardZoneFromAddress(geoData.display_name);
          if (wardZone) {
            setWard(String(wardZone.ward));
            setZone(String(wardZone.zone));
          } else {
            // Try with individual address components
            const searchParts = [
              addr.neighbourhood,
              addr.suburb,
              addr.city_district,
              addr.road,
            ].filter(Boolean);

            for (const part of searchParts) {
              const result = lookupWardZoneFromAddress(part);
              if (result) {
                setWard(String(result.ward));
                setZone(String(result.zone));
                break;
              }
            }
          }

          setGpsStatus('found');
        } else {
          // Fallback to coordinate display
          setAddress(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setGpsStatus('found');
        }

        setIsLocating(false);
      },
      (_err) => {
        setError('Unable to retrieve your location. Please check browser permissions.');
        setIsLocating(false);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setOriginalSize(selected.size);
      setIsCompressing(true);
      setCompressedSize(null);

      try {
        const compressed = await compressImage(selected);
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
        setCompressedSize(compressed.size);
      } catch {
        // Fallback: use original if compression fails
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setCompressedSize(selected.size);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a photo of the issue.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) formData.append('citizen_description', description);
      if (address) formData.append('address', address);
      if (zone) formData.append('zone', zone);
      if (ward) formData.append('ward', ward);
      if (lat !== null) formData.append('lat', lat.toString());
      if (lng !== null) formData.append('lng', lng.toString());

      await fetchApi('/reports/', { method: 'POST', body: formData });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container animate-in" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', minHeight: '60dvh', textAlign: 'center', padding: '40px 20px'
      }}>
        <div style={{ 
          width: '72px', height: '72px', borderRadius: '50%', 
          background: 'var(--success-faint)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
        }}>
          <CheckCircle2 size={36} color="var(--success)" />
        </div>
        <h2 style={{ marginBottom: '8px' }}>Report submitted!</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
          Our AI is classifying the issue and routing it to the right department. You'll be redirected to your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="container animate-in" style={{ maxWidth: '560px', padding: '40px 20px' }}>
      <h2 style={{ marginBottom: '4px' }}>Report an issue</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Help your neighborhood by sharing what you see.</p>
      
      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div className="error-msg">{error}</div>}
        
        {/* Photo Upload */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Photo</label>
          <div style={{ 
            border: preview ? 'none' : '2px dashed var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            background: preview ? 'transparent' : 'var(--bg-warm)'
          }}>
            {preview ? (
              <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block', borderRadius: 'var(--radius-lg)' }} />
            ) : (
              <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Camera size={36} color="var(--text-muted)" />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tap to take a photo</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or select from your gallery</p>
              </div>
            )}
            {isCompressing && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 2,
                borderRadius: 'var(--radius-lg)'
              }}>
                <Loader2 size={28} className="spin-icon" color="var(--primary)" />
                <p style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Compressing image…</p>
              </div>
            )}
            <input 
              type="file" accept="image/*" capture="environment"
              onChange={handleFileChange}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
            />
          </div>
          {originalSize !== null && compressedSize !== null && !isCompressing && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', marginTop: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--success-faint)', color: 'var(--success)',
              fontSize: '0.82rem', fontWeight: 500
            }}>
              <CheckCircle2 size={14} />
              Compressed: {formatBytes(originalSize)} → {formatBytes(compressedSize)}
              {originalSize > compressedSize && (
                <span style={{ opacity: 0.8 }}>
                  ({Math.round((1 - compressedSize / originalSize) * 100)}% smaller)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Location & GPS */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Where is this?</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input 
                type="text" value={address} onChange={(e) => setAddress(e.target.value)} required
                placeholder="e.g. Shankar Nagar, Raipur"
                style={{ paddingLeft: '42px', width: '100%' }}
              />
            </div>
            <button 
              type="button" 
              onClick={handleGetLocation} 
              disabled={isLocating}
              className="btn btn-outline"
              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isLocating ? (
                <><Loader2 size={16} className="spin-icon" /> Detecting...</>
              ) : (
                <><Navigation size={16} /> Use GPS</>
              )}
            </button>
          </div>

          {/* GPS Status message */}
          {gpsStatus === 'found' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', marginBottom: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--success-faint)', color: 'var(--success)',
              fontSize: '0.85rem', fontWeight: 500
            }}>
              <CheckCircle2 size={14} />
              📍 Address detected{ward ? ` · Ward ${ward} · Zone ${zone}` : ' · Select ward below'}
            </div>
          )}

          {/* OSM Attribution */}
          {(gpsStatus === 'found' || gpsStatus === 'detecting') && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Address data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>OpenStreetMap</a> contributors
            </p>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>RMC Zone</label>
              <select value={zone} onChange={(e) => handleZoneChange(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select Zone</option>
                {getAllZones().map(z => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.85rem' }}>Ward No.</label>
              <select value={ward} onChange={(e) => handleWardChange(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select Ward</option>
                {getAvailableWards().map(w => (
                  <option key={w} value={w}>
                    {w} — {WARD_NAMES[w] || `Ward ${w}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
            What's the problem? <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <textarea 
            value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Any extra details that might help..."
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={isLoading}>
          {isLoading ? 'Analyzing with AI...' : 'Submit report'}
        </button>
      </form>
    </div>
  );
};
