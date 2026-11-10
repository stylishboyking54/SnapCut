'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Shop } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

interface InteractiveShopsMapProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
}

export default function InteractiveShopsMap({
  shops,
  selectedShop,
  onSelectShop,
}: InteractiveShopsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainer.current || mapInstance.current) return;

      // Default center: first shop, or user coords, or Accra, Ghana
      const validShop = shops.find((s) => s.lat && s.lng);
      const centerLat = selectedShop?.lat || validShop?.lat || 5.6037;
      const centerLng = selectedShop?.lng || validShop?.lng || -0.1870;

      const map = L.map(mapContainer.current, {
        zoomControl: true,
      }).setView([centerLat, centerLng], 13);
      mapInstance.current = map;

      // Beautiful clean OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Render pins for all shops
      shops.forEach((shop) => {
        if (!shop.lat || !shop.lng) return;

        const isBarber = shop.shopType === 'barber';
        const isEmergency = shop.isEmergency;
        const waitText = isEmergency
          ? 'Paused'
          : shop.estimatedWaitMinutes === 0
          ? 'Open'
          : `~${shop.estimatedWaitMinutes}m`;

        const pinColor = isEmergency ? '#c02a17' : isBarber ? '#f0412b' : '#9333ea';

        const customIcon = L.divIcon({
          className: `shop-map-pin-${shop.id}`,
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <!-- Wait Badge -->
              <span style="
                background: #141416;
                color: #fff;
                font-size: 10.5px;
                font-weight: 700;
                padding: 2px 7px;
                border-radius: 99px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                white-space: nowrap;
                margin-bottom: 2px;
                border: 1px solid rgba(255,255,255,0.2);
              ">
                ${waitText}
              </span>
              <!-- Pin Head -->
              <div style="
                background: ${pinColor};
                color: #fff;
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #fff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              ">
                <span style="transform: rotate(45deg); font-size: 14px;">✂</span>
              </div>
            </div>
          `,
          iconSize: [46, 52],
          iconAnchor: [23, 52],
        });

        const marker = L.marker([shop.lat, shop.lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          onSelectShop(shop);
        });

        markersRef.current.set(shop.id, marker);
      });
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [shops]);

  // When selected shop changes, smoothly pan to it
  useEffect(() => {
    if (!mapInstance.current || !selectedShop?.lat || !selectedShop?.lng) return;
    mapInstance.current.flyTo([selectedShop.lat, selectedShop.lng], 15, { duration: 1.2 });
  }, [selectedShop]);

  // User location request
  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });
        setLocating(false);

        import('leaflet').then((L) => {
          if (!mapInstance.current) return;
          mapInstance.current.flyTo([uLat, uLng], 14, { duration: 1.2 });

          if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
              className: 'user-pulse-dot',
              html: `
                <div style="
                  width: 18px;
                  height: 18px;
                  background: #2563eb;
                  border: 3px solid #fff;
                  border-radius: 50%;
                  box-shadow: 0 0 0 6px rgba(37,99,235,0.35);
                "></div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(mapInstance.current);
          } else {
            userMarkerRef.current.setLatLng([uLat, uLng]);
          }
        });
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Map Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong>{shops.length}</strong> shops on the live map
        </span>

        <button
          type="button"
          onClick={handleLocateUser}
          disabled={locating}
          className="btn-secondary"
          style={{
            fontSize: 12.5,
            padding: '6px 14px',
            minHeight: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📍</span>
          {locating ? 'Locating you…' : 'Shops near my location'}
        </button>
      </div>

      {/* Interactive Map Box */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: 480,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />

      {/* Selected Shop Floating / Details Card with Google Maps Navigation */}
      {selectedShop && (
        <div
          className="panel"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            borderLeft: '4px solid var(--brand-accent)',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {selectedShop.coverImage ? (
              <img
                src={selectedShop.coverImage}
                alt=""
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : null}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedShop.name}</h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: selectedShop.isEmergency ? 'var(--brand-danger-soft)' : 'var(--brand-success-soft)',
                    color: selectedShop.isEmergency ? 'var(--brand-danger)' : 'var(--brand-success)',
                  }}
                >
                  {selectedShop.isEmergency ? 'Paused' : `~${selectedShop.estimatedWaitMinutes}m wait`}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {selectedShop.address} · {selectedShop.city} · ★ {selectedShop.rating}
              </p>
              <span className="muted" style={{ fontSize: 12 }}>
                {selectedShop.currentQueueCount} people waiting in line
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Free Google Maps Navigation button */}
            {selectedShop.lat && selectedShop.lng ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShop.lat},${selectedShop.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <span>🗺️</span>
                Open in Google Maps
              </a>
            ) : (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedShop.name + ' ' + selectedShop.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  textDecoration: 'none',
                }}
              >
                <span>🗺️</span>
                Search in Google Maps
              </a>
            )}

            {/* Direct Join Line button */}
            <Link
              href={`/shops/${selectedShop.id}`}
              className="btn-primary"
              style={{ fontSize: 13, textDecoration: 'none' }}
            >
              Join line
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

