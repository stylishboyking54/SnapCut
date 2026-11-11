'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shop, Service } from '@/lib/types';
import { joinShopQueue } from '@/lib/api';
import { getSession, requestSignIn } from '@/lib/auth';

interface JoinLineModalProps {
  shop: Shop | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shopId: string, result: any) => void;
}

export default function JoinLineModal({
  shop,
  isOpen,
  onClose,
  onSuccess,
}: JoinLineModalProps) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !shop) return null;

  const services = shop.services?.length
    ? shop.services
    : [{ id: 'default', name: 'Standard Cut', price: 40, duration: 30 }];

  const currentServiceId = selectedServiceId || services[0]?.id || '';
  const selectedService = services.find((s) => s.id === currentServiceId) || services[0];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = getSession();
    if (!session) {
      onClose();
      requestSignIn(`Sign in to join the line at ${shop.name}`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await joinShopQueue(shop.id, {
        serviceId: selectedService?.id,
        customerName: session.profile.full_name,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(shop.id, result);
      }
      onClose();
      // Navigate to tickets page so the customer sees their live spot immediately
      router.push('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join line');
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 22px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div className="date-pill" style={{ marginBottom: 6 }}>
              <span className="status-dot live" />
              {shop.estimatedWaitMinutes === 0 ? 'Chair open now' : `~${shop.estimatedWaitMinutes} min wait`} · {shop.currentQueueCount} ahead
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
              Join line at {shop.name}
            </h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {shop.address || 'Select a service to secure your spot'}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            style={{
              background: 'var(--bg-elevated)',
              border: 'none',
              color: 'var(--text-muted)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              fontSize: 15,
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-danger-soft)',
              color: 'var(--brand-danger)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Services list with prices attached */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Choose service & price
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {services.map((service) => {
                const isSelected = service.id === currentServiceId;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                      border: isSelected ? '2px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--brand-accent)' : '2px solid var(--bg-border)',
                          background: isSelected ? '#fff' : 'transparent',
                          flexShrink: 0,
                          display: 'inline-block',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: isSelected ? 700 : 600, color: 'var(--text-primary)' }}>
                          {service.name}
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          ⏱ {service.duration || 30} minutes
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 750,
                          color: isSelected ? 'var(--brand-accent)' : 'var(--text-primary)',
                        }}
                      >
                        GHS {service.price}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional notes */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Special request or preference <span className="muted" style={{ fontWeight: 500 }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Skin fade with razor finish, quiet session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1, minHeight: 44, justifyContent: 'center', fontSize: 13.5 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className="btn-primary"
              style={{
                flex: 2,
                minHeight: 44,
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                background: 'var(--brand-accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {busy ? 'Securing your spot…' : `Confirm · GHS ${selectedService ? selectedService.price : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
