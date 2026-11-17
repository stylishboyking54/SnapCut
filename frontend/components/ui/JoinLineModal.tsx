'use client';

import React, { useState, useEffect } from 'react';
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

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrowIsoDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultTime(targetDateIso: string, shop: Shop): string {
  const todayIso = getTodayIsoDate();
  const isToday = targetDateIso === todayIso;
  const now = new Date();

  const [y, m, d] = targetDateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  const hours = shop.workingHours?.find((h) => h.dayOfWeek === dayOfWeek);
  const startTime = (hours?.startTime || '09:00').slice(0, 5);
  const endTime = (hours?.endTime || '18:00').slice(0, 5);

  if (!isToday) {
    return startTime;
  }

  const currentTotalMins = now.getHours() * 60 + now.getMinutes() + (shop.estimatedWaitMinutes || 0);
  const roundedMins = Math.ceil(currentTotalMins / 5) * 5;
  const h = Math.floor(roundedMins / 60);
  const min = roundedMins % 60;
  const roundedTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

  if (roundedTime < startTime) return startTime;
  if (roundedTime > endTime) return endTime;
  return roundedTime;
}

function validateSelection(
  dateIso: string,
  timeStr: string,
  shop: Shop,
): { valid: boolean; error: string | null; hoursText?: string; dayName: string; isOpenDay: boolean } {
  if (!dateIso) {
    return { valid: false, error: 'Please choose a date.', dayName: '', isOpenDay: false };
  }

  const [y, m, d] = dateIso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayName = dateObj.toLocaleDateString([], { weekday: 'long' });

  let hours = shop.workingHours?.find((h) => h.dayOfWeek === dayOfWeek);
  if (!shop.workingHours || shop.workingHours.length === 0) {
    if (dayOfWeek === 0) {
      return { valid: false, error: 'The shop is closed on Sundays.', dayName, isOpenDay: false };
    }
    hours = {
      dayOfWeek,
      dayName,
      startTime: '09:00',
      endTime: '18:00',
      isOpen: true,
    };
  } else if (!hours || !hours.isOpen) {
    return { valid: false, error: `The shop is closed on ${dayName}s.`, dayName, isOpenDay: false };
  }

  const startTime = (hours.startTime || '09:00').slice(0, 5);
  const endTime = (hours.endTime || '18:00').slice(0, 5);

  if (!timeStr) {
    return { valid: false, error: 'Please choose a time.', hoursText: `${startTime} – ${endTime}`, dayName, isOpenDay: true };
  }

  const [th, tm] = timeStr.split(':').map(Number);
  const timeMins = th * 60 + (tm || 0);

  const [sh, sm] = startTime.split(':').map(Number);
  const startMins = sh * 60 + (sm || 0);

  const [eh, em] = endTime.split(':').map(Number);
  const endMins = eh * 60 + (em || 0);

  if (timeMins < startMins) {
    return {
      valid: false,
      error: `Barber starts at ${startTime} on ${dayName}s. Chosen time is before working hours.`,
      hoursText: `${startTime} – ${endTime}`,
      dayName,
      isOpenDay: true,
    };
  }

  if (timeMins >= endMins) {
    return {
      valid: false,
      error: `Barber closes at ${endTime} on ${dayName}s. Chosen time is after working hours.`,
      hoursText: `${startTime} – ${endTime}`,
      dayName,
      isOpenDay: true,
    };
  }

  // If today: check if time has already passed
  const todayIso = getTodayIsoDate();
  if (dateIso === todayIso) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    if (timeMins < currentMins) {
      return {
        valid: false,
        error: 'That time has already passed today. Please pick an upcoming time.',
        hoursText: `${startTime} – ${endTime}`,
        dayName,
        isOpenDay: true,
      };
    }
  }

  // Check breaks
  if (shop.breaks?.length) {
    for (const b of shop.breaks) {
      const bStart = (b.startTime || '').slice(0, 5);
      const bEnd = (b.endTime || '').slice(0, 5);
      if (bStart && bEnd) {
        const [bsh, bsm] = bStart.split(':').map(Number);
        const [beh, bem] = bEnd.split(':').map(Number);
        const bsMins = bsh * 60 + (bsm || 0);
        const beMins = beh * 60 + (bem || 0);
        if (timeMins >= bsMins && timeMins < beMins) {
          return {
            valid: false,
            error: `Barber is on break from ${bStart} to ${bEnd}${b.reason ? ` (${b.reason})` : ''}.`,
            hoursText: `${startTime} – ${endTime}`,
            dayName,
            isOpenDay: true,
          };
        }
      }
    }
  }

  return {
    valid: true,
    error: null,
    hoursText: `${startTime} – ${endTime}`,
    dayName,
    isOpenDay: true,
  };
}

export default function JoinLineModal({
  shop,
  isOpen,
  onClose,
  onSuccess,
}: JoinLineModalProps) {
  const router = useRouter();

  const todayIso = getTodayIsoDate();
  const tomorrowIso = getTomorrowIsoDate();

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedTime, setSelectedTime] = useState<string>('10:00');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset date & time when shop opens
  useEffect(() => {
    if (shop && isOpen) {
      const initialDate = getTodayIsoDate();
      setSelectedDate(initialDate);
      setSelectedTime(getDefaultTime(initialDate, shop));
      setError(null);
    }
  }, [shop, isOpen]);

  // When date changes, update default time if needed
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (shop) {
      setSelectedTime(getDefaultTime(newDate, shop));
    }
  };

  // Safe early exit: all hooks are declared above, NO hooks after this line
  if (!isOpen || !shop) return null;

  const services = shop.services?.length
    ? shop.services
    : [{ id: 'default', name: 'Standard Cut', price: 40, duration: 30 }];

  const currentServiceId = selectedServiceId || services[0]?.id || '';
  const selectedService = services.find((s) => s.id === currentServiceId) || services[0];

  const validation = validateSelection(selectedDate, selectedTime, shop);

  // Generate quick time chips based on working hours (simple calculation, no conditional hook)
  const quickTimeSlots: string[] = (() => {
    if (!validation.isOpenDay) return [];
    const hours = shop.workingHours?.find((h) => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return h.dayOfWeek === new Date(y, m - 1, d).getDay();
    });
    const startH = parseInt((hours?.startTime || '09:00').slice(0, 2), 10) || 9;
    const endH = parseInt((hours?.endTime || '18:00').slice(0, 2), 10) || 18;

    const slots: string[] = [];
    for (let h = startH; h < endH; h += 2) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    const openClock = (hours?.startTime || '09:00').slice(0, 5);
    if (!slots.includes(openClock)) {
      slots.unshift(openClock);
    }
    return slots.slice(0, 5);
  })();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.valid) {
      setError(validation.error || 'Please select a valid working time.');
      return;
    }

    const session = getSession();
    if (!session) {
      onClose();
      requestSignIn(`Sign in to join the line at ${shop.name}`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledDate = new Date(y, m - 1, d, hour, minute, 0);

      const result = await joinShopQueue(shop.id, {
        serviceId: selectedService?.id,
        customerName: session.profile.full_name,
        notes: notes.trim() || undefined,
        scheduledAt: scheduledDate.toISOString(),
      });

      if (onSuccess) {
        onSuccess(shop.id, result);
      }
      onClose();
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
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 22px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
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
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>
              Join line at {shop.name}
            </h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {shop.address || 'Select day, time & service to secure your spot'}
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
          {/* Day & Date Picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Select Day
              </label>
              <span className="muted" style={{ fontSize: 12 }}>
                {selectedDate === todayIso ? 'Default: Today' : validation.dayName}
              </span>
            </div>

            {/* Quick date pills + Date input */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDateChange(todayIso)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedDate === todayIso ? '1.5px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                  background: selectedDate === todayIso ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                  color: selectedDate === todayIso ? '#fff' : 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => handleDateChange(tomorrowIso)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedDate === tomorrowIso ? '1.5px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                  background: selectedDate === tomorrowIso ? 'var(--brand-accent)' : 'var(--bg-elevated)',
                  color: selectedDate === tomorrowIso ? '#fff' : 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Tomorrow
              </button>

              <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
                <input
                  type="date"
                  min={todayIso}
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={busy}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--bg-border)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Day schedule status pill */}
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: validation.isOpenDay ? 'var(--text-muted)' : 'var(--brand-danger)',
                fontWeight: validation.isOpenDay ? 500 : 650,
              }}
            >
              {validation.isOpenDay ? (
                <>🕒 {validation.dayName} hours: <strong>{validation.hoursText || '09:00 – 18:00'}</strong></>
              ) : (
                <>🚫 Closed on {validation.dayName}s. Please pick another day.</>
              )}
            </div>
          </div>

          {/* Time Picker */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Set Time
              </label>
              {validation.hoursText && (
                <span className="muted" style={{ fontSize: 11.5 }}>
                  Working: {validation.hoursText}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={busy || !validation.isOpenDay}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: !validation.valid && validation.error?.includes('working hours') || !validation.valid && validation.error?.includes('passed')
                    ? '1.5px solid var(--brand-danger)'
                    : '1px solid var(--bg-border)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: 120,
                }}
              />

              {/* Quick slots */}
              {quickTimeSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--brand-accent)' : '1px solid var(--bg-border)',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      color: isSelected ? 'var(--brand-accent)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            {/* Inline validation status banner */}
            <div style={{ marginTop: 7 }}>
              {!validation.valid ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--brand-danger-soft)',
                    color: 'var(--brand-danger)',
                    fontSize: 12,
                    fontWeight: 650,
                  }}
                >
                  <span>⚠️</span> {validation.error}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-xs)',
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span>✓</span> Time fits barber&apos;s working hours ({validation.hoursText})
                </div>
              )}
            </div>
          </div>

          {/* Services list with prices attached */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Choose service & price
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 200, overflowY: 'auto' }}>
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
                      padding: '10px 12px',
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
                          width: 17,
                          height: 17,
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--brand-accent)' : '2px solid var(--bg-border)',
                          background: isSelected ? '#fff' : 'transparent',
                          flexShrink: 0,
                          display: 'inline-block',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: isSelected ? 700 : 600, color: 'var(--text-primary)' }}>
                          {service.name}
                        </div>
                        <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                          ⏱ {service.duration || 30} minutes
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 14.5,
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
                padding: '9px 12px',
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
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
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
              disabled={busy || !validation.valid}
              className="btn-primary"
              style={{
                flex: 2,
                minHeight: 44,
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                background: !validation.valid ? 'var(--bg-elevated)' : 'var(--brand-accent)',
                color: !validation.valid ? 'var(--text-muted)' : '#fff',
                border: !validation.valid ? '1px solid var(--bg-border)' : 'none',
                cursor: !validation.valid || busy ? 'not-allowed' : 'pointer',
                opacity: !validation.valid ? 0.65 : 1,
                transition: 'all 0.18s ease',
              }}
            >
              {busy
                ? 'Securing your spot…'
                : !validation.valid
                ? (validation.error?.includes('closed') ? 'Shop Closed on this day' : 'Barber Off at this time')
                : `Confirm · GHS ${selectedService ? selectedService.price : ''}`}
            </button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
            By joining, you agree to SnapCut&apos;s{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>
              Terms &amp; Conditions
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
