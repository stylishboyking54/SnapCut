'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBookingRows, getMyBookings, getShops, joinShopQueue } from '@/lib/api';
import { getSession, requestSignIn } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { summarizeWeek, WeekSummary } from '@/lib/weekStats';
import WeekCard from '@/components/ui/WeekCard';
import ShopFilm from '@/components/ui/ShopFilm';
import JoinLineModal from '@/components/ui/JoinLineModal';
import { Shop } from '@/lib/types';
import { SearchIcon, CompassIcon } from '@/components/ui/Icons';
import CountUp from '@/components/ui/CountUp';

export default function HomePage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'quick' | 'nearest' | 'top'>('all');
  const [shopType, setShopType] = useState<'all' | 'barber' | 'salon'>('all');
  const [bookingToast, setBookingToast] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedShopId, setJoinedShopId] = useState<string | null>(null);
  const [modalShop, setModalShop] = useState<Shop | null>(null);
  const [hello, setHello] = useState('Good evening');
  const [when, setWhen] = useState('');
  const [week, setWeek] = useState<WeekSummary | null>(null);

  useEffect(() => {
    const syncHello = () => {
      const session = getSession();
      setHello(timeGreeting(session?.profile.full_name));
      setWhen(todayLabel());
      if (!session) {
        setWeek(null);
        setJoinedShopId(null);
        return;
      }
      getBookingRows().then((rows) => setWeek(summarizeWeek(rows))).catch(() => setWeek(null));
      getMyBookings()
        .then((rows) => setJoinedShopId(rows[0]?.shopId || null))
        .catch(() => setJoinedShopId(null));
    };
    syncHello();
    if (window.location.hash === '#shop-search') {
      document.getElementById('shop-search')?.focus();
    }
    window.addEventListener('snapcut-auth', syncHello);
    return () => window.removeEventListener('snapcut-auth', syncHello);
  }, []);

  useEffect(() => {
    let active = true;
    getShops()
      .then((liveData) => {
        if (!active) return;
        setShops(Array.isArray(liveData) ? liveData : []);
      })
      .catch(() => {
        if (active) setShops([]);
      })
      .finally(() => {
        if (active) setShopsLoading(false);
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
      setJoinedShopId(shop.id);
      setBookingToast(`You're in line at ${shop.name}. Open Ticket to watch your turn.`);
      setTimeout(() => setBookingToast(null), 4500);
    } catch (err) {
      setBookingToast(err instanceof Error ? err.message : 'Could not join the line.');
      setTimeout(() => setBookingToast(null), 4500);
    } finally {
      setJoiningId(null);
    }
  };

  const openShops = shops.filter((s) => s.isOpen && !s.isEmergency);
  const shortest = openShops.length
    ? Math.min(...openShops.map((s) => s.estimatedWaitMinutes))
    : 0;
  const peopleAhead = shops.reduce((sum, s) => sum + (s.currentQueueCount || 0), 0);

  return (
    <div className="page-enter" style={{ maxWidth: 1120, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill">
            <span className="status-dot live" />
            {when || 'Today'}
          </div>
          <h1 className="brand-hero" style={{ marginTop: 10 }}>
            {hello}
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

      {!shopsLoading && shops.length > 0 && (
        <div className="stat-row">
          <div className="stat-chip hot">
            <span className="stat-orb">✂</span>
            <div>
              <b><CountUp value={shortest} /> min</b>
              <small>Shortest wait</small>
            </div>
          </div>
          <div className="stat-chip">
            <span className="stat-orb quiet"><CountUp value={openShops.length} /></span>
            <div>
              <b><CountUp value={openShops.length} /></b>
              <small>Shops open</small>
            </div>
          </div>
          <div className="stat-chip">
            <span className="stat-orb quiet">#</span>
            <div>
              <b><CountUp value={peopleAhead} /></b>
              <small>People in line</small>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="search-bar">
          <SearchIcon size={17} color="var(--text-muted)" />
          <input
            id="shop-search"
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

      {week && (
        <WeekCard
          title="Your week"
          subtitle="Chairs you joined in the last 7 days."
          totalLabel="Visits"
          total={week.visits}
          unit="stops"
          asideLabel="Time in the chair"
          aside={week.visits ? `${week.minutes} min · GHS ${Math.round(week.spend)}` : 'Nothing booked yet'}
          days={week.days}
        />
      )}

      <div className="shop-grid">
        {shopsLoading && (
          <div className="panel" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Finding shops nearby…
          </div>
        )}
        {!shopsLoading && filteredShops.map((shop) => {
          const isZeroWait = shop.estimatedWaitMinutes === 0;
          const waitLabel = shop.isEmergency
            ? 'Shift delayed'
            : isZeroWait
            ? 'Chair open now'
            : null;

          const badgeClass = shop.isEmergency ? 'emergency' : isZeroWait ? 'open' : 'wait';

          return (
            <article key={shop.id} className="shop-row">
              <div className="shop-row-media">
                <ShopFilm photos={shop.photos?.length ? shop.photos : shop.coverImage ? [shop.coverImage] : []} />
                <span className="shop-row-rating">★ {shop.rating}</span>
                <span className={`shop-row-badge ${badgeClass}`}>
                  <span className={`status-dot ${isZeroWait && !shop.isEmergency ? 'live' : ''}`} />
                  {waitLabel ?? (
                    <>
                      <CountUp value={shop.currentQueueCount} /> ahead · ~
                      <CountUp value={shop.estimatedWaitMinutes} /> min
                    </>
                  )}
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
                  disabled={shop.isEmergency}
                  onClick={() => {
                    if (joinedShopId === shop.id) {
                      router.push('/bookings');
                      return;
                    }
                    const session = getSession();
                    if (!session) {
                      requestSignIn(`Sign in to join the line at ${shop.name}`);
                      return;
                    }
                    setModalShop(shop);
                  }}
                  className={joinedShopId === shop.id ? 'btn-secondary' : 'btn-primary'}
                  style={{
                    fontSize: 13.5,
                    width: '100%',
                    opacity: shop.isEmergency ? 0.45 : 1,
                    cursor: shop.isEmergency ? 'default' : 'pointer',
                  }}
                >
                  {shop.isEmergency
                    ? 'Paused'
                    : joinedShopId === shop.id
                    ? 'View ticket'
                    : 'Join line'}
                </button>
              </div>
            </article>
          );
        })}

        {!shopsLoading && filteredShops.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 650 }}>
              {shops.length === 0 ? 'No shops live yet' : 'No shops match that search'}
            </div>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.45, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
              {shops.length === 0
                ? 'Barbers and salons show up here once they open a SnapCut line. Check back soon, or clear filters if you had any on.'
                : 'Try another name, clear filters, or switch Barber / Salon.'}
            </p>
            {(searchQuery || filter !== 'all' || shopType !== 'all') && (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 14, fontSize: 12.5 }}
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  setShopType('all');
                }}
              >
                Clear filters
              </button>
            )}
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
      <JoinLineModal
        shop={modalShop}
        isOpen={!!modalShop}
        onClose={() => setModalShop(null)}
        onSuccess={(shopId, result) => {
          setShops((prev) =>
            prev.map((s) =>
              s.id === shopId
                ? {
                    ...s,
                    currentQueueCount: result.totalInQueue,
                    estimatedWaitMinutes: result.estimatedTotalWait,
                  }
                : s
            )
          );
          setJoinedShopId(shopId);
        }}
      />
    </div>
  );
}
