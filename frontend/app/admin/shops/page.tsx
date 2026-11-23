'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  getAdminShops,
  verifyAdminShop,
  unverifyAdminShop,
  deleteAdminShop,
  toggleAdminShopEmergency,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { AlertTriangleIcon } from '@/components/ui/Icons';

type TabKey = 'all' | 'pending' | 'verified' | 'paused';

export default function AdminShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmShop, setDeleteConfirmShop] = useState<any | null>(null);
  const [deleteInputName, setDeleteInputName] = useState('');

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const load = () => {
    setLoading(true);
    getAdminShops()
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load shops'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: shops.length,
      pending: shops.filter((s) => !s.is_verified).length,
      verified: shops.filter((s) => s.is_verified).length,
      paused: shops.filter((s) => s.is_emergency).length,
    };
  }, [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      // Tab filter
      if (activeTab === 'pending' && s.is_verified) return false;
      if (activeTab === 'verified' && !s.is_verified) return false;
      if (activeTab === 'paused' && !s.is_emergency) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchCity = (s.city || '').toLowerCase().includes(q);
      const matchAddress = (s.address || '').toLowerCase().includes(q);
      const matchOwner = (s.profiles?.full_name || '').toLowerCase().includes(q);
      return matchName || matchCity || matchAddress || matchOwner;
    });
  }, [shops, activeTab, searchQuery]);

  const handleVerify = async (shop: any) => {
    setBusyId(shop.id);
    setError(null);
    try {
      await verifyAdminShop(shop.id);
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, is_verified: true } : s)),
      );
      showNotification(`"${shop.name}" is now verified & published.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify shop');
    } finally {
      setBusyId(null);
    }
  };

  const handleUnverify = async (shop: any) => {
    if (!window.confirm(`Revoke verification for "${shop.name}"? It will be hidden from customer search until re-approved.`)) {
      return;
    }
    setBusyId(shop.id);
    setError(null);
    try {
      await unverifyAdminShop(shop.id);
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, is_verified: false } : s)),
      );
      showNotification(`"${shop.name}" returned to pending review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unverify shop');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleEmergency = async (shop: any) => {
    const nextState = !shop.is_emergency;
    setBusyId(shop.id);
    setError(null);
    try {
      await toggleAdminShopEmergency(
        shop.id,
        nextState,
        nextState ? 'Line paused by Administrator' : undefined,
      );
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, is_emergency: nextState } : s)),
      );
      showNotification(
        nextState
          ? `Force-paused queue for "${shop.name}".`
          : `Resumed queue for "${shop.name}".`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update queue pause state');
    } finally {
      setBusyId(null);
    }
  };

  const executeDeleteShop = async () => {
    if (!deleteConfirmShop) return;
    if (deleteInputName.trim().toLowerCase() !== deleteConfirmShop.name.trim().toLowerCase()) {
      alert('The shop name you entered does not match. Deletion cancelled.');
      return;
    }

    setBusyId(deleteConfirmShop.id);
    setError(null);
    try {
      await deleteAdminShop(deleteConfirmShop.id);
      setShops((prev) => prev.filter((s) => s.id !== deleteConfirmShop.id));
      showNotification(`"${deleteConfirmShop.name}" and all records permanently deleted.`);
      setDeleteConfirmShop(null);
      setDeleteInputName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete shop');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="page-enter"
      style={{
        maxWidth: 1040,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <div className="date-pill">
            <span className="status-dot live" />
            {todayLabel()}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>
            {timeGreeting(getSession()?.profile.full_name)} · Shop Moderation
          </h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 540, lineHeight: 1.5 }}>
            Review, verify, and moderate stores on SnapCut. Unverified stores stay pending and remain hidden from customers until approved.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link href="/admin" className="btn-secondary">
            ← Admin Overview
          </Link>
        </div>
      </div>

      {error && <div className="alert-banner">{error}</div>}
      {notice && (
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--brand-success-soft)',
            color: 'var(--brand-success)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          {notice}
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('all')}
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            All Shops ({counts.all})
          </button>
          <button
            type="button"
            className={activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('pending')}
            style={{
              fontSize: 13,
              padding: '7px 14px',
              position: 'relative',
              borderColor: counts.pending > 0 ? '#eab308' : undefined,
              color: activeTab === 'pending' ? undefined : counts.pending > 0 ? '#ca8a04' : undefined,
            }}
          >
            ⏳ Pending Review ({counts.pending})
          </button>
          <button
            type="button"
            className={activeTab === 'verified' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('verified')}
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            ✓ Verified ({counts.verified})
          </button>
          <button
            type="button"
            className={activeTab === 'paused' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab('paused')}
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            ⚠️ Paused ({counts.paused})
          </button>
        </div>

        {/* Live Search */}
        <div style={{ minWidth: 260, flex: 1, maxWidth: 360 }}>
          <input
            type="search"
            placeholder="Search by shop, city, or owner…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--bg-border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Main Shops Panel */}
      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
            Loading shops from database…
          </p>
        ) : filteredShops.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center' }}>
            <p className="muted" style={{ fontSize: 14 }}>
              {searchQuery
                ? 'No shops matched your search query.'
                : activeTab === 'pending'
                ? '🎉 All caught up! No shops are currently awaiting verification.'
                : 'No shops in this category.'}
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => {
            const isBusy = busyId === shop.id;
            const isVerified = Boolean(shop.is_verified);
            const isEmergency = Boolean(shop.is_emergency);
            const cleanPhone = (shop.phone || '').replace(/\D/g, '');

            return (
              <div
                key={shop.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 0',
                  borderBottom: '1px solid var(--bg-border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                {/* Shop Information */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {shop.name}
                    </span>

                    {/* Shop Type Badge */}
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontWeight: 600,
                        background: shop.shop_type === 'salon' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                        color: shop.shop_type === 'salon' ? '#ec4899' : '#3b82f6',
                      }}
                    >
                      {shop.shop_type === 'salon' ? '💇‍♀️ Salon' : '✂️ Barber'}
                    </span>

                    {/* Verification Status Badge */}
                    {isVerified ? (
                      <span
                        style={{
                          fontSize: 11.5,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 700,
                          background: 'var(--brand-success-soft)',
                          color: 'var(--brand-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ✓ Verified &amp; Live
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11.5,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 700,
                          background: 'rgba(234, 179, 8, 0.18)',
                          color: '#ca8a04',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ⏳ Pending Approval
                      </span>
                    )}

                    {/* Queue Status Badge */}
                    {isEmergency && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 600,
                          background: 'var(--brand-danger-soft)',
                          color: 'var(--brand-danger)',
                        }}
                      >
                        ⚠️ Line Paused
                      </span>
                    )}
                  </div>

                  <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    <strong>Owner:</strong> {shop.profiles?.full_name || 'Not set'}
                    {shop.phone && <span> · <strong>Tel:</strong> {shop.phone}</span>}
                    <span> · <strong>Location:</strong> {shop.city || 'Accra'}, {shop.address}</span>
                  </div>

                  <div className="muted" style={{ fontSize: 12 }}>
                    Created on {new Date(shop.created_at).toLocaleDateString()}
                    {shop.services?.length ? ` · ${shop.services.length} services` : ' · No services added yet'}
                    {shop.rating ? ` · ★ ${shop.rating}` : ''}
                  </div>
                </div>

                {/* Admin Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Approve / Verify Button */}
                  {!isVerified ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleVerify(shop)}
                      className="btn-primary"
                      style={{
                        background: 'var(--brand-success)',
                        color: '#ffffff',
                        fontSize: 12.5,
                        padding: '6px 14px',
                      }}
                    >
                      {isBusy ? 'Saving…' : 'Approve & Publish'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleUnverify(shop)}
                      className="btn-secondary"
                      style={{ fontSize: 12.5, padding: '6px 12px' }}
                    >
                      {isBusy ? 'Saving…' : 'Unverify'}
                    </button>
                  )}

                  {/* Pause / Resume Line Toggle */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleToggleEmergency(shop)}
                    className="btn-secondary"
                    style={{
                      fontSize: 12.5,
                      padding: '6px 12px',
                      color: isEmergency ? 'var(--brand-success)' : 'var(--brand-danger)',
                    }}
                    title={isEmergency ? 'Resume line for customers' : 'Remotely pause line in emergency'}
                  >
                    {isEmergency ? 'Resume Line' : 'Pause Line'}
                  </button>

                  {/* Contact Owner Link (WhatsApp or Call) */}
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: 12.5, padding: '6px 10px', textDecoration: 'none' }}
                      title="Contact owner on WhatsApp"
                    >
                      💬 WhatsApp
                    </a>
                  )}

                  {/* Open Public Page */}
                  <Link
                    href={`/shops/${shop.id}`}
                    className="btn-secondary"
                    style={{ fontSize: 12.5, padding: '6px 12px', textDecoration: 'none' }}
                  >
                    View
                  </Link>

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setDeleteConfirmShop(shop);
                      setDeleteInputName('');
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    title="Permanently delete shop and records"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirmShop && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--brand-danger)' }}>
              <AlertTriangleIcon size={24} color="var(--brand-danger)" />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Permanently Delete Store?
              </h2>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              You are about to delete <strong>&quot;{deleteConfirmShop.name}&quot;</strong>. This will permanently remove its bookings, working hours, services, and queue records. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Type &quot;{deleteConfirmShop.name}&quot; below to confirm:
              </label>
              <input
                type="text"
                placeholder={deleteConfirmShop.name}
                value={deleteInputName}
                onChange={(e) => setDeleteInputName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDeleteConfirmShop(null);
                  setDeleteInputName('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeDeleteShop()}
                disabled={
                  deleteInputName.trim().toLowerCase() !== deleteConfirmShop.name.trim().toLowerCase() ||
                  busyId === deleteConfirmShop.id
                }
                style={{
                  background: 'var(--brand-danger)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: 'pointer',
                  opacity:
                    deleteInputName.trim().toLowerCase() !== deleteConfirmShop.name.trim().toLowerCase()
                      ? 0.45
                      : 1,
                }}
              >
                {busyId === deleteConfirmShop.id ? 'Deleting…' : 'Delete Store'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
