'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  lat?: number | null;
  lng?: number | null;
  onChange: (coords: { lat: number; lng: number; city?: string; address?: string }) => void;
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  // Default to Accra, Ghana or provided coordinates
  const initialLat = typeof lat === 'number' && !isNaN(lat) && lat !== 0 ? lat : 5.6037;
  const initialLng = typeof lng === 'number' && !isNaN(lng) && lng !== 0 ? lng : -0.1870;

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [detecting, setDetecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet so it never executes during SSR
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainer.current || mapInstance.current) return;

      // Fix default marker icon assets in bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainer.current).setView([initialLat, initialLng], 14);
      mapInstance.current = map;

      // Clean OpenStreetMap tiles
      // Authentic Google Maps Roadmap tiles
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      }).addTo(map);

      // Custom draggable red pin
      const customPin = L.divIcon({
        className: 'custom-shop-pin',
        html: `
          <div style="
            background: #f0412b;
            color: #fff;
            width: 34px;
            height: 34px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          ">
            <span style="transform: rotate(45deg); font-size: 15px;">✂</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: customPin,
      }).addTo(map);
      markerInstance.current = marker;

      const updatePos = async (newLat: number, newLng: number) => {
        setCurrentCoords({ lat: newLat, lng: newLng });
        onChange({ lat: newLat, lng: newLng });

        // Optional reverse geocoding to help the owner with address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.suburb ||
              data.address?.state;
            const road = data.address?.road;
            if (city || road) {
              onChange({ lat: newLat, lng: newLng, city, address: road });
            }
          }
        } catch {
          /* ignore geocode failure */
        }
      };

      // On marker drag
      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        updatePos(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
      });

      // On map click
      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        updatePos(Number(clickLat.toFixed(5)), Number(clickLng.toFixed(5)));
      });
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Use current GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setStatusMsg('Detecting your GPS location…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(5));
        const userLng = Number(pos.coords.longitude.toFixed(5));

        setCurrentCoords({ lat: userLat, lng: userLng });
        onChange({ lat: userLat, lng: userLng });

        if (mapInstance.current && markerInstance.current) {
          mapInstance.current.setView([userLat, userLng], 16);
          markerInstance.current.setLatLng([userLat, userLng]);
        }

        setDetecting(false);
        setStatusMsg('✓ Pinned to your current location!');
        setTimeout(() => setStatusMsg(null), 4000);
      },
      (err) => {
        setDetecting(false);
        setStatusMsg('Could not detect location. Please tap directly on the map to pin.');
        setTimeout(() => setStatusMsg(null), 4500);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            📍 Exact Store Location on Map
          </span>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Tap the button or tap anywhere on the map to set your store's exact pin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={detecting}
          className="btn-secondary"
          style={{
            fontSize: 12.5,
            padding: '6px 14px',
            minHeight: 36,
            background: 'var(--brand-accent)',
            color: '#fff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📍</span>
          {detecting ? 'Getting GPS…' : 'Use my current location'}
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: statusMsg.startsWith('✓') ? 'var(--brand-success-soft)' : 'var(--brand-danger-soft)',
            color: statusMsg.startsWith('✓') ? 'var(--brand-success)' : 'var(--brand-danger)',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {statusMsg}
        </div>
      )}

      {/* Interactive Map Canvas */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: 300,
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--border)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
        <span>Coordinates: {currentCoords.lat}, {currentCoords.lng}</span>
        <span>Drag the pin or click anywhere to adjust</span>
      </div>
    </div>
  );
}

