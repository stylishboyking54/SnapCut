'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  shopName: string;
  shopAddress?: string;
  shopLat?: number;
  shopLng?: number;
  height?: number | string;
  autoLocate?: boolean;
}

export default function RouteMap({
  shopName,
  shopAddress,
  shopLat,
  shopLng,
  height = 280,
  autoLocate = true,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const shopMarkerRef = useRef<any>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMins, setDurationMins] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const targetLat = shopLat || 5.6037;
  const targetLng = shopLng || -0.1870;
  const hasCoordinates = Boolean(shopLat && shopLng);

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainer.current || mapInstance.current) return;

      const map = L.map(mapContainer.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([targetLat, targetLng], 14);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Shop Marker
      const shopIcon = L.divIcon({
        className: 'route-shop-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="
              background: #141416;
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 99px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
              margin-bottom: 3px;
              border: 1px solid rgba(255,255,255,0.25);
            ">
              ${shopName}
            </div>
            <div style="
              background: #f0412b;
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

      const sMarker = L.marker([targetLat, targetLng], { icon: shopIcon }).addTo(map);
      shopMarkerRef.current = sMarker;
    });

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [targetLat, targetLng, shopName]);

  // Request user location and draw route
  const requestRoute = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocateError('Geolocation not supported by this browser');
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });
        setLocating(false);

        // Calculate direct Haversine distance
        const R = 6371; // km
        const dLat = ((targetLat - uLat) * Math.PI) / 180;
        const dLng = ((targetLng - uLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((uLat * Math.PI) / 180) *
            Math.cos((targetLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const directDist = R * c;
        setDistanceKm(Math.round(directDist * 10) / 10);
        setDurationMins(Math.max(2, Math.round((directDist / 25) * 60))); // ~25 km/h urban speed

        const L = await import('leaflet');
        if (!mapInstance.current) return;
        const map = mapInstance.current;

        // User Marker
        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current);
        }

        const userIcon = L.divIcon({
          className: 'route-user-pin',
          html: `
            <div style="position: relative; width: 22px; height: 22px;">
              <span style="
                position: absolute;
                inset: -6px;
                border-radius: 999px;
                background: rgba(37,99,235,0.3);
                animation: pulse 2s infinite;
              "></span>
              <span style="
                display: block;
                width: 22px;
                height: 22px;
                border-radius: 999px;
                background: #2563eb;
                border: 3px solid #fff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              "></span>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon })
          .bindPopup('<b>Your Location</b>')
          .addTo(map);

        // Try OSRM route for real street path
        try {
          const osrmRes = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${uLng},${uLat};${targetLng},${targetLat}?overview=full&geometries=geojson`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (osrmRes.ok) {
            const osrmData = await osrmRes.json();
            if (osrmData.routes && osrmData.routes[0]) {
              const route = osrmData.routes[0];
              const coords = route.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]);
              const roadDistKm = Math.round((route.distance / 1000) * 10) / 10;
              const roadDurMin = Math.max(1, Math.round(route.duration / 60));
              setDistanceKm(roadDistKm);
              setDurationMins(roadDurMin);

              if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
              routeLayerRef.current = L.polyline(coords, {
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }).addTo(map);

              map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
              return;
            }
          }
        } catch {
          // OSRM network timeout or offline - fall through to direct dashed line
        }

        // Fallback: direct route line
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.polyline(
          [
            [uLat, uLng],
            [targetLat, targetLng],
          ],
          {
            color: '#f0412b',
            weight: 4,
            opacity: 0.8,
            dashArray: '6, 8',
          }
        ).addTo(map);

        map.fitBounds(
          [
            [uLat, uLng],
            [targetLat, targetLng],
          ],
          { padding: [50, 50] }
        );
      },
      (err) => {
        setLocating(false);
        setLocateError('Could not get your location. Tap below to navigate via Google Maps.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (autoLocate) {
      requestRoute();
    }
  }, [autoLocate, targetLat, targetLng]);

  const navUrl = hasCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${shopName}, ${shopAddress || ''}`
      )}`;

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md, 12px)',
        overflow: 'hidden',
        border: '1px solid var(--bg-border, #e5e7eb)',
        background: 'var(--bg-surface, #ffffff)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Route Header Info */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: 'var(--bg-elevated, #f9fafb)',
          borderBottom: '1px solid var(--bg-border, #e5e7eb)',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍 Route to {shopName}</span>
            {distanceKm !== null && (
              <span
                style={{
                  background: 'var(--brand-primary, #f0412b)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 99,
                }}
              >
                {distanceKm} km · ~{durationMins} min
              </span>
            )}
          </div>
          {shopAddress && (
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0 0' }}>
              {shopAddress}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!userCoords && (
            <button
              type="button"
              onClick={requestRoute}
              disabled={locating}
              className="btn-secondary"
              style={{ fontSize: 12, minHeight: 32, padding: '4px 10px' }}
            >
              {locating ? 'Finding you…' : '📍 Show my route'}
            </button>
          )}

          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              fontSize: 12,
              minHeight: 32,
              padding: '6px 12px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Open in Google Maps ↗
          </a>
        </div>
      </div>

      {locateError && (
        <div
          style={{
            fontSize: 11.5,
            padding: '6px 14px',
            background: 'var(--brand-danger-soft, #fee2e2)',
            color: 'var(--brand-danger, #b91c1c)',
            borderBottom: '1px solid var(--bg-border, #e5e7eb)',
          }}
        >
          {locateError}
        </div>
      )}

      {/* Embedded Map Canvas */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          background: '#f3f4f6',
          position: 'relative',
        }}
      />
    </div>
  );
}
