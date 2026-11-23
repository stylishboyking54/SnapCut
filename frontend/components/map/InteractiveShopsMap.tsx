'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shop } from '@/lib/types';
import 'leaflet/dist/leaflet.css';
import './InteractiveShopsMap.css';

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
  const router = useRouter();
  const selectedShopRef = useRef<Shop | null>(selectedShop);
  useEffect(() => {
    selectedShopRef.current = selectedShop;
  }, [selectedShop]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // 1. Initialize map instance ONCE on mount
  useEffect(() => {
    let isMounted = true;
    let resizeTimer: any = null;

    import('leaflet')
      .then((leafletModule) => {
        if (!isMounted || !mapContainer.current) return;
        const L = (leafletModule as any).default || leafletModule;

        // Clean up any stale map or leaflet ID on this DOM node
        if (mapInstance.current) {
          try {
            mapInstance.current.remove();
          } catch {
            /* ignore */
          }
          mapInstance.current = null;
        }
        if ((mapContainer.current as any)._leaflet_id) {
          delete (mapContainer.current as any)._leaflet_id;
        }

        // Center on Accra, Ghana default (5.6037, -0.1870)
        const map = L.map(mapContainer.current, {
          zoomControl: true,
        }).setView([5.6037, -0.1870], 12);
        mapInstance.current = map;

        // OpenStreetMap tile layer (reliable, fast, no API key needed, never 403s)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        }).addTo(map);

        // Force container bounds recalculation after CSS layout finishes
        resizeTimer = setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
          }
        }, 200);

        if (isMounted) {
          setMapReady(true);
        }
      })
      .catch((err) => {
        console.error('[SnapCut Map] Error initializing map:', err);
      });

    return () => {
      isMounted = false;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch {
          /* ignore */
        }
        mapInstance.current = null;
      }
    };
  }, []);

  // 2. Render and synchronize shop pins whenever shops change
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    import('leaflet')
      .then((leafletModule) => {
        if (!mapInstance.current) return;
        const L = (leafletModule as any).default || leafletModule;
        const map = mapInstance.current;

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          try {
            map.removeLayer(marker);
          } catch {
            /* ignore */
          }
        });
        markersRef.current.clear();

        const validShops = shops.filter((s) => Number(s.lat) && Number(s.lng));

        // Pan to first shop or selected shop
        if (validShops.length > 0) {
          const target = selectedShopRef.current || validShops[0];
          if (target && Number(target.lat) && Number(target.lng)) {
            map.setView([Number(target.lat), Number(target.lng)], 13);
          }
        }

        // Add pins for all valid shops
        validShops.forEach((shop) => {
          const sLat = Number(shop.lat);
          const sLng = Number(shop.lng);

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

          const marker = L.marker([sLat, sLng], { icon: customIcon }).addTo(map);

          // Hover tooltip
          marker.bindTooltip(
            `
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-weight: 700; font-size: 13px; color: #fff;">${shop.name}</div>
                <div style="font-size: 11px; color: #d4d4d8; display: flex; align-items: center; gap: 6px;">
                  <span>★ ${shop.rating || 5}</span>
                  <span>·</span>
                  <span style="color: ${isEmergency ? '#f87171' : '#4ade80'}; font-weight: 600;">${waitText}</span>
                </div>
                <div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">
                  Click to select · Click again to open
                </div>
              </div>
            `,
            {
              direction: 'top',
              offset: [0, -48],
              className: 'shop-hover-tooltip',
              opacity: 1,
            }
          );

          // Popup with direct shop link
          marker.bindPopup(
            `
              <div style="font-family: inherit; padding: 4px; min-width: 175px;">
                <div style="font-size: 14px; font-weight: 700; color: #141416; margin-bottom: 2px;">
                  ${shop.name}
                </div>
                <div style="font-size: 11.5px; color: #666; margin-bottom: 8px;">
                  ${shop.address || shop.city} · ★ ${shop.rating || 5}
                </div>
                <a href="/shops/${shop.id}" style="
                  display: block;
                  width: 100%;
                  text-align: center;
                  background: #f0412b;
                  color: #fff;
                  font-size: 12px;
                  font-weight: 600;
                  padding: 7px 12px;
                  border-radius: 6px;
                  text-decoration: none;
                  box-sizing: border-box;
                ">
                  Open Store Page →
                </a>
              </div>
            `,
            {
              offset: [0, -42],
              closeButton: true,
            }
          );

          marker.on('click', () => {
            const isAlreadySelected = selectedShopRef.current?.id === shop.id;
            onSelectShop(shop);
            marker.openPopup();
            if (isAlreadySelected) {
              router.push(`/shops/${shop.id}`);
            }
          });

          markersRef.current.set(shop.id, marker);
        });
      })
      .catch((err) => {
        console.error('[SnapCut Map] Error updating markers:', err);
      });
  }, [shops, mapReady]);

  // 3. Pan or draw route when selected shop changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !selectedShop?.lat || !selectedShop?.lng) return;

    import('leaflet')
      .then((leafletModule) => {
        if (!mapInstance.current) return;
        const L = (leafletModule as any).default || leafletModule;

        if (routeLayerRef.current) {
          try {
            mapInstance.current.removeLayer(routeLayerRef.current);
          } catch {
            /* ignore */
          }
          routeLayerRef.current = null;
        }

        const sLat = Number(selectedShop.lat);
        const sLng = Number(selectedShop.lng);
        if (!sLat || !sLng || isNaN(sLat) || isNaN(sLng)) return;

        if (userCoords) {
          routeLayerRef.current = L.polyline(
            [
              [userCoords.lat, userCoords.lng],
              [sLat, sLng],
            ],
            {
              color: '#2563eb',
              weight: 4,
              opacity: 0.85,
              dashArray: '6, 8',
            }
          ).addTo(mapInstance.current);

          mapInstance.current.fitBounds(
            [
              [userCoords.lat, userCoords.lng],
              [sLat, sLng],
            ],
            { padding: [60, 60], maxZoom: 16 }
          );
        } else {
          mapInstance.current.flyTo([sLat, sLng], 15, { duration: 1.2 });
        }
      })
      .catch(console.error);
  }, [selectedShop, userCoords, mapReady]);

  // User location request
  const handleLocateUser = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });
        setLocating(false);

        import('leaflet')
          .then((leafletModule) => {
            if (!mapInstance.current) return;
            const L = (leafletModule as any).default || leafletModule;
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
              userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(
                mapInstance.current
              );
            } else {
              userMarkerRef.current.setLatLng([uLat, uLng]);
            }
          })
          .catch(console.error);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Map Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Showing <strong>{shops.length}</strong> {shops.length === 1 ? 'shop' : 'shops'} on the live map
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

      {/* Interactive Map Box — always in the DOM, never unmounted */}
      <div
        ref={mapContainer}
        className="map-container"
        style={{
          width: '100%',
          height: 480,
          minHeight: 480,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />

      {/* Selected Shop Details Card */}
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
                    background: selectedShop.isEmergency
                      ? 'var(--brand-danger-soft)'
                      : 'var(--brand-success-soft)',
                    color: selectedShop.isEmergency ? 'var(--brand-danger)' : 'var(--brand-success)',
                  }}
                >
                  {selectedShop.isEmergency
                    ? 'Paused'
                    : `~${selectedShop.estimatedWaitMinutes}m wait`}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {selectedShop.address} · {selectedShop.city} · ★ {selectedShop.rating || 5}
              </p>
              <span className="muted" style={{ fontSize: 12 }}>
                {selectedShop.currentQueueCount} people waiting in line
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  selectedShop.name + ' ' + selectedShop.address
                )}`}
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

      <style jsx global>{`
        .leaflet-tooltip.shop-hover-tooltip {
          background: rgba(20, 20, 22, 0.95);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 10px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          font-family: inherit;
        }
        .leaflet-tooltip.shop-hover-tooltip::before {
          border-top-color: rgba(20, 20, 22, 0.95);
        }
      `}</style>
    </div>
  );
}
