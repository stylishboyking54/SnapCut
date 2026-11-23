'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  getAdminUsers,
  updateAdminUserRole,
  toggleAdminUserBan,
  deleteAdminUser,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { AlertTriangleIcon } from '@/components/ui/Icons';

type FilterType = 'all' | 'admin' | 'barbers' | 'customer' | 'banned';

function roleBadge(role?: string, isBanned?: boolean) {
  if (isBanned) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          background: 'rgba(239, 68, 68, 0.16)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.35)',
        }}
      >
        <span>🚫</span> Suspended
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 650,
          background: 'rgba(234, 179, 8, 0.16)',
          color: '#eab308',
          border: '1px solid rgba(234, 179, 8, 0.35)',
        }}
      >
        <span>🛡️</span> Admin
      </span>
    );
  }
  if (role === 'barber' || role === 'salon') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          background: 'rgba(59, 130, 246, 0.14)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <span>✂️</span> {role === 'salon' ? 'Salon' : 'Barber'}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.06))',
        color: 'var(--text-secondary, #94a3b8)',
        border: '1px solid var(--bg-border-subtle, rgba(255, 255, 255, 0.1))',
      }}
    >
      <span>👤</span> Customer
    </span>
  );
}

export default function AdminPeoplePage() {
  const [people, setPeople] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<FilterType>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ person: any; targetRole: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const currentUserId = getSession()?.profile?.id;

  const load = () => {
    setLoading(true);
    getAdminUsers()
      .then(setPeople)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: people.length,
      admin: people.filter((p) => p.role === 'admin').length,
      barbers: people.filter((p) => p.role === 'barber' || p.role === 'salon').length,
      customer: people.filter((p) => p.role !== 'admin' && p.role !== 'barber' && p.role !== 'salon').length,
      banned: people.filter((p) => p.is_banned).length,
    };
  }, [people]);

  const filtered = useMemo(() => {
    return people.filter((person) => {
      const q = search.toLowerCase().trim();
      const name = (person.full_name || '').toLowerCase();
      const email = (person.email || '').toLowerCase();
      const phone = (person.phone || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || phone.includes(q);

      if (!matchesSearch) return false;

      if (filterRole === 'banned') return person.is_banned;
      if (filterRole === 'admin') return person.role === 'admin';
      if (filterRole === 'barbers') return person.role === 'barber' || person.role === 'salon';
      if (filterRole === 'customer') return person.role !== 'admin' && person.role !== 'barber' && person.role !== 'salon';
      return true;
    });
  }, [people, search, filterRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setBusyId(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      await updateAdminUserRole(userId, newRole);
      setPeople((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p)),
      );
      setSuccessMsg(`Successfully updated role to ${newRole.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setConfirmTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBan = async (person: any) => {
    const nextBan = !person.is_banned;
    setBusyId(person.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await toggleAdminUserBan(person.id, nextBan);
      setPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, is_banned: nextBan } : p)),
      );
      setSuccessMsg(
        nextBan
          ? `Suspended account for "${person.full_name || person.email}".`
          : `Restored account for "${person.full_name || person.email}".`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle account suspension');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await deleteAdminUser(deleteTarget.id);
      setPeople((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSuccessMsg(`Permanently deleted account for "${deleteTarget.full_name || deleteTarget.email}".`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>{timeGreeting(getSession()?.profile?.full_name)} · Member Directory</h1>
          <p className="secondary" style={{ marginTop: 6, fontSize: 14, maxWidth: 520, lineHeight: 1.45 }}>
            Moderate users, suspend abusive accounts, and assign Super Admin access across the SnapCut platform.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">← Admin Overview</Link>
      </div>

      {error && <div className="alert-banner">{error}</div>}
      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#4ade80',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 13.5,
          fontWeight: 600,
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Metric Chips */}
      <div className="stat-row">
        <div className="stat-chip" onClick={() => setFilterRole('all')} style={{ cursor: 'pointer' }}>
          <div><b>{loading ? '…' : counts.all}</b><small>Total Members</small></div>
        </div>
        <div className="stat-chip" onClick={() => setFilterRole('admin')} style={{ cursor: 'pointer' }}>
          <div><b style={{ color: '#eab308' }}>{loading ? '…' : counts.admin}</b><small>Super Admins</small></div>
        </div>
        <div className="stat-chip" onClick={() => setFilterRole('barbers')} style={{ cursor: 'pointer' }}>
          <div><b style={{ color: '#60a5fa' }}>{loading ? '…' : counts.barbers}</b><small>Barbers / Salons</small></div>
        </div>
        <div className="stat-chip" onClick={() => setFilterRole('customer')} style={{ cursor: 'pointer' }}>
          <div><b>{loading ? '…' : counts.customer}</b><small>Customers</small></div>
        </div>
        <div className="stat-chip" onClick={() => setFilterRole('banned')} style={{ cursor: 'pointer' }}>
          <div><b style={{ color: '#ef4444' }}>{loading ? '…' : counts.banned}</b><small>Suspended</small></div>
        </div>
      </div>

      <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Controls: Search and Filter Tabs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={filterRole === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, minHeight: 32, padding: '0 12px' }}
              onClick={() => setFilterRole('all')}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={filterRole === 'admin' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, minHeight: 32, padding: '0 12px' }}
              onClick={() => setFilterRole('admin')}
            >
              Admins ({counts.admin})
            </button>
            <button
              type="button"
              className={filterRole === 'barbers' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, minHeight: 32, padding: '0 12px' }}
              onClick={() => setFilterRole('barbers')}
            >
              Barbers ({counts.barbers})
            </button>
            <button
              type="button"
              className={filterRole === 'customer' ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: 13, minHeight: 32, padding: '0 12px' }}
              onClick={() => setFilterRole('customer')}
            >
              Customers ({counts.customer})
            </button>
            <button
              type="button"
              className={filterRole === 'banned' ? 'btn-primary' : 'btn-secondary'}
              style={{
                fontSize: 13,
                minHeight: 32,
                padding: '0 12px',
                color: filterRole === 'banned' ? undefined : '#ef4444',
                borderColor: counts.banned > 0 ? '#ef4444' : undefined,
              }}
              onClick={() => setFilterRole('banned')}
            >
              🚫 Suspended ({counts.banned})
            </button>
          </div>

          <div style={{ minWidth: 240 }}>
            <input
              type="search"
              placeholder="Search by name, email, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
                border: '1px solid var(--bg-border-subtle, rgba(255, 255, 255, 0.12))',
                color: 'inherit',
              }}
            />
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>Loading user directory…</p>
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No members match your criteria.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((person) => {
              const isMe = person.id === currentUserId;
              const isAdmin = person.role === 'admin';
              const isBanned = Boolean(person.is_banned);
              const isBusy = busyId === person.id;

              return (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--bg-border-subtle, rgba(255,255,255,0.06))',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: isBanned
                          ? 'rgba(239, 68, 68, 0.2)'
                          : isAdmin
                          ? 'rgba(234, 179, 8, 0.2)'
                          : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        color: isBanned ? '#ef4444' : isAdmin ? '#eab308' : 'inherit',
                      }}
                    >
                      {(person.full_name || person.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 650, fontSize: 14.5 }}>
                          {person.full_name || 'Unnamed Account'}
                        </span>
                        {isMe && (
                          <span style={{ fontSize: 11, color: '#eab308', background: 'rgba(234, 179, 8, 0.12)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                            You (Super Admin)
                          </span>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {person.email || person.phone || 'No direct contact info'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {roleBadge(person.role, isBanned)}

                    {/* Suspension / Ban Toggle */}
                    {!isMe && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={isBusy}
                        onClick={() => void handleToggleBan(person)}
                        style={{
                          fontSize: 12,
                          minHeight: 30,
                          padding: '0 10px',
                          color: isBanned ? '#4ade80' : '#ef4444',
                          borderColor: isBanned ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {isBusy ? 'Saving…' : isBanned ? 'Unban Account' : 'Suspend / Ban'}
                      </button>
                    )}

                    {/* Role Delegation Controls */}
                    {!isMe && (
                      <div>
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 12,
                              minHeight: 30,
                              color: '#ef4444',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                            }}
                            disabled={isBusy}
                            onClick={() => setConfirmTarget({ person, targetRole: 'customer' })}
                          >
                            Revoke Admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              fontSize: 12,
                              minHeight: 30,
                              color: '#eab308',
                              borderColor: 'rgba(234, 179, 8, 0.35)',
                              background: 'rgba(234, 179, 8, 0.08)',
                            }}
                            disabled={isBusy}
                            onClick={() => setConfirmTarget({ person, targetRole: 'admin' })}
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    )}

                    {/* Delete Account Button */}
                    {!isMe && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(person)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '4px 6px',
                          textDecoration: 'underline',
                          opacity: 0.8,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Role Confirmation Modal */}
      {confirmTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => !busyId && setConfirmTarget(null)}
        >
          <div
            className="panel"
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'var(--bg-card, #121218)',
              border: '1px solid var(--bg-border-subtle, rgba(255,255,255,0.15))',
              borderRadius: 14,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              {confirmTarget.targetRole === 'admin' ? '🛡️ Assign Administrator Role?' : '⚠️ Revoke Administrator Privileges?'}
            </h3>
            <p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
              {confirmTarget.targetRole === 'admin'
                ? `You are about to promote "${confirmTarget.person.full_name || confirmTarget.person.email}" to Super Admin. They will have full access to view and manage all stores, line queues, and member accounts across SnapCut.`
                : `Are you sure you want to revoke Admin rights from "${confirmTarget.person.full_name || confirmTarget.person.email}"? They will lose access to the /admin control center.`}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={busyId !== null}
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: confirmTarget.targetRole === 'admin' ? '#eab308' : '#ef4444',
                  color: '#000',
                  fontWeight: 650,
                }}
                disabled={busyId !== null}
                onClick={() => handleRoleChange(confirmTarget.person.id, confirmTarget.targetRole)}
              >
                {busyId ? 'Processing…' : confirmTarget.targetRole === 'admin' ? 'Confirm Promotion' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => !busyId && setDeleteTarget(null)}
        >
          <div
            className="panel"
            style={{
              maxWidth: 440,
              width: '100%',
              background: 'var(--bg-card, #121218)',
              border: '1px solid var(--bg-border-subtle, rgba(255,255,255,0.15))',
              borderRadius: 14,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', marginBottom: 12 }}>
              <AlertTriangleIcon size={24} color="#ef4444" />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Delete User Account?
              </h3>
            </div>
            <p className="secondary" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to permanently delete the account for <strong>&quot;{deleteTarget.full_name || deleteTarget.email}&quot;</strong>? They will be removed from authentication and the database.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={busyId !== null}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 650,
                }}
                disabled={busyId !== null}
                onClick={() => void handleDeleteUser()}
              >
                {busyId ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
