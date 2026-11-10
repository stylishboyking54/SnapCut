'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createShop, getMyShop, updateShop } from '@/lib/api';
import { Shop } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';

export default function BarberShopSettingsPage() {
  const kind = useProKind();
  const copy = proCopy(kind);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Accra');
  const [phone, setPhone] = useState('');
  const [avgDuration, setAvgDuration] = useState(kind === 'salon' ? 45 : 30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await getMyShop();
        if (cancelled) return;
        setShop(mine);
        if (mine) {
          setName(mine.name);
          setTagline(mine.tagline || '');
          setAddress(mine.address);
          setCity(mine.city || 'Accra');
          setPhone(mine.phone || '');
          setAvgDuration(mine.avgDurationPerClient || (kind === 'salon' ? 45 : 30));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load shop');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        city: city.trim() || 'Accra',
        phone: phone.trim(),
        avg_service_duration: Number(avgDuration),
        shop_type: kind,
      };
      const next = shop
        ? await updateShop(shop.id, payload)
        : await createShop(payload);
      setShop(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (isSetup || !shop) {
        router.replace('/barber/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  const creating = !shop;

  return (
    <div className="page-enter" style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="page-header-row">
        <div>
          <div className="date-pill"><span className="status-dot live" />{todayLabel()}</div>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 10 }}>{timeGreeting(getSession()?.profile.full_name)}</h1>
          <p className="secondary" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45, maxWidth: 460 }}>
            {creating
              ? `Fill in the name, the street, and how long one visit takes. Then people can find your ${copy.shopTitle.toLowerCase()}.`
              : `This is what people see when they look for your ${copy.shopTitle.toLowerCase()}. Change it, then tap Save.`}
          </p>
        </div>
        {!creating && (
          <Link href="/barber/dashboard" className="btn-secondary" style={{ fontSize: 12.5 }}>
            {copy.backQueue}
          </Link>
        )}
      </div>

      {error && (
        <div className="alert-banner" style={{ background: 'var(--brand-danger-soft)', color: 'var(--brand-danger)' }}>
          {error}
        </div>
      )}

      {saved && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-success-soft)',
            color: 'var(--brand-success)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {copy.shopSaved}
        </div>
      )}

      <form onSubmit={handleSave} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="field">
          <label>{copy.shopNameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'salon' ? 'e.g. Glow Studio' : 'e.g. Fade House'}
            required
          />
        </div>

        <div className="field">
          <label>Short line under the name</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder={kind === 'salon' ? 'Braids, wash & style' : 'Fades and clean cuts'}
          />
        </div>

        <div className="field">
          <label>City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>

        <div className="field">
          <label>Street address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>

        <div className="field">
          <label>Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </div>

        <div className="field">
          <label>{copy.avgLabel}</label>
          <input
            type="number"
            min={10}
            max={180}
            value={avgDuration}
            onChange={(e) => setAvgDuration(Number(e.target.value))}
          />
          <span className="muted" style={{ fontSize: 12 }}>People see a wait based on this. A haircut is often 30 minutes.</span>
        </div>

        <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? 'Saving…' : creating ? 'Save and open my line' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
