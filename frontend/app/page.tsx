'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { INITIAL_SHOPS } from '@/lib/mockData';
import { getShops, joinShopQueue } from '@/lib/api';
import { getSession, requestSignIn } from '@/lib/auth';
import { Shop } from '@/lib/types';
import { SearchIcon, CompassIcon } from '@/components/ui/Icons';

export default function HomePage() {
  const [shops, setShops] = useState<Shop[]>(INITIAL_SHOPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'quick' | 'nearest' | 'top'>('all');
  const [shopType, setShopType] = useState<'all' | 'barber' | 'salon'>('all');
  const [bookingToast, setBookingToast] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getShops().then((liveData) => {
      if (active && liveData?.length) {
        setShops(liveData);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredShops = useMemo(() => {
    let result = [...shops];

    if (shopType !== 'all') {
      result = result.filter((s) => s.shopType === shopType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.services.some((srv) => srv.name.toLowerCase().includes(q))
      );
    }

    if (filter === 'quick') {
      result.sort((a, b) => a.estimatedWaitMinutes - b.estimatedWaitMinutes);
    } else if (filter === 'nearest') {
      result.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (filter === 'top') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [shops, searchQuery, filter, shopType]);

  const handleQuickJoin = async (shop: Shop) => {
    if (joiningId) return;
    const session = getSession();
    if (!session) {
      requestSignIn('Join the line with an account.');
      return;
    }
    setJoiningId(shop.id);
    try {
      const result = await joinShopQueue(shop.id, {
        serviceId: shop.services[0]?.id,
        customerName: session.profile.full_name,
      });
      setShops((prev) =>
        prev.map((s) =>
          s.id === shop.id
            ? {
                ...s,
                currentQueueCount: result.totalInQueue,
                estimatedWaitMinutes: result.estimatedTotalWait,
              }
            : s
        )
      );
      setBookingToast(`You're in line at ${shop.name}. Open Ticket to watch your turn.`);
      setTimeout(() => setBookingToast(null), 4500);
    } catch (err) {
      setBookingToast(err instanceof Error ? err.message : 'Could not join the line.');
      setTimeout(() => setBookingToast(null), 4500);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 980, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="page-header-row">
        <div>
          <div className="eyebrow">Downtown · Metro City</div>
          <h1 className="brand-hero" style={{ marginTop: 6 }}>
            Snapcut
          </h1>
          <p className="secondary home-lead" style={{ marginTop: 8, fontSize: 15, maxWidth: 420, lineHeight: 1.45 }}>
            See who&apos;s ahead, join when a chair opens, walk in when it&apos;s your turn.
          </p>
        </div>

        <Link href="/map" className="btn-secondary" style={{ fontSize: 13 }}>
          <CompassIcon size={15} />
          Nearby map
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="search-bar">
          <SearchIcon size={17} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search shops, barbers, or cuts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="filter-pills-row" role="tablist" aria-label="Shop type">
          {[
            { id: 'all', label: 'All' },
            { id: 'barber', label: 'Barber (men)' },
            { id: 'salon', label: 'Salon (women)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={shopType === item.id}
              className={`filter-seg ${shopType === item.id ? 'active' : ''}`}
              onClick={() => setShopType(item.id as typeof shopType)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="filter-pills-row" role="tablist" aria-label="Sort shops">
          {[
            { id: 'all', label: 'Any wait' },
            { id: 'quick', label: 'Shortest wait' },
            { id: 'nearest', label: 'Closest' },
            { id: 'top', label: 'Top rated' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={`filter-seg ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id as typeof filter)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="list-stack">
        {filteredShops.map((shop) => {
          const isZeroWait = shop.estimatedWaitMinutes === 0;
          const waitLabel = shop.isEmergency
            ? 'Shift delayed'
            : isZeroWait
            ? 'Chair open now'
            : `${shop.currentQueueCount} ahead · ~${shop.estimatedWaitMinutes} min`;

          const badgeClass = shop.isEmergency ? 'emergency' : isZeroWait ? 'open' : 'wait';

          return (
            <article key={shop.id} className="shop-row">
              <div className="shop-row-media">
                <img src={shop.coverImage} alt="" />
                <span className="shop-row-rating">★ {shop.rating}</span>
                <span className={`shop-row-badge ${badgeClass}`}>
                  <span className={`status-dot ${isZeroWait && !shop.isEmergency ? 'live' : ''}`} />
                  {waitLabel}
                </span>
              </div>

              <div className="shop-row-body">
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 600 }}>{shop.name}</h3>
                  <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
                    {shop.shopType === 'salon' ? 'Salon' : 'Barbershop'} · {shop.address} ·{' '}
                    {shop.distanceKm} km · {shop.reviewCount} reviews
                  </p>
                </div>

                {shop.isEmergency && shop.emergencyReason && (
                  <div className="alert-banner" style={{ marginTop: 2 }}>
                    {shop.emergencyReason}
                  </div>
                )}

                <div className="shop-row-chips">
                  {shop.services.slice(0, 3).map((srv) => (
                    <span key={srv.id} className="service-chip">
                      {srv.name} · GHS {srv.price}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shop-row-actions">
                <Link
                  href={`/shops/${shop.id}`}
                  className="btn-secondary"
                  style={{ fontSize: 13.5, width: '100%' }}
                >
                  See queue
                </Link>
                <button
                  type="button"
                  disabled={shop.isEmergency || joiningId === shop.id}
                  onClick={() => handleQuickJoin(shop)}
                  className="btn-primary"
                  style={{
                    fontSize: 13.5,
                    width: '100%',
                    opacity: shop.isEmergency ? 0.45 : 1,
                    cursor: shop.isEmergency ? 'not-allowed' : 'pointer',
                  }}
                >
                  {shop.isEmergency
                    ? 'Paused'
                    : joiningId === shop.id
                    ? 'Joining…'
                    : 'Join line'}
                </button>
              </div>
            </article>
          );
        })}

        {filteredShops.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No shops match that search.
          </div>
        )}
      </div>

      {bookingToast && (
        <div className="toast">
          <span className="status-dot" style={{ background: 'var(--brand-success)', width: 8, height: 8 }} />
          <div>
            <div style={{ fontWeight: 650, fontSize: 13.5 }}>You&apos;re in</div>
            <div className="secondary" style={{ fontSize: 12.5 }}>{bookingToast}</div>
          </div>
          <button
            type="button"
            onClick={() => setBookingToast(null)}
            style={{ background: 'transparent', color: 'var(--text-muted)', marginLeft: 4, fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
