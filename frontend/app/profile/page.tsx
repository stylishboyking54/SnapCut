'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSession, getSession, logout, requestSignIn, updateMyAvatar, updateMyProfile } from '@/lib/auth';
import { UserIcon } from '@/components/ui/Icons';
import { getBookingRows } from '@/lib/api';
import { summarizeWeek } from '@/lib/weekStats';
import CountUp from '@/components/ui/CountUp';

function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const scale = Math.min(size / img.width, size / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare that photo'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('That file is not a photo'));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [visits, setVisits] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const next = getSession();
      setSession(next);
      setName(next?.profile.full_name || '');
      setPhone(next?.profile.phone || '');
      setReady(true);
    };
    sync();
    window.addEventListener('snapcut-auth', sync);
    return () => window.removeEventListener('snapcut-auth', sync);
  }, []);

  useEffect(() => {
    if (!session) return;
    getBookingRows()
      .then((rows) => {
        const week = summarizeWeek(rows);
        setVisits(week.visits);
        setMinutes(week.minutes);
      })
      .catch(() => undefined);
  }, [session]);

  const handlePhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('Choose a photo, not a document.');
      return;
    }
    setPhotoBusy(true);
    setNotice(null);
    try {
      const image = await shrinkPhoto(file);
      await updateMyAvatar(image);
      setNotice('Photo saved. It shows in the header now.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save the photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    setNotice(null);
    try {
      await updateMyAvatar('');
      setNotice('Photo removed.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not remove the photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotice('Add your name so shops know who joined.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await updateMyProfile({ full_name: name.trim(), phone: phone.trim() });
      setNotice('Saved. Shops will see this name.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
    router.replace('/');
  };

  if (!ready) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-enter" style={{ maxWidth: 640, width: '100%', margin: 0 }}>
        <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Profile</h1>
        <div className="panel profile-hero" style={{ marginTop: 16 }}>
          <span className="avatar-chip lg"><UserIcon size={32} /></span>
          <h2>Sign in to see your profile</h2>
          <p className="muted">Your name, phone, and visits show up here after you sign in.</p>
          <button type="button" className="btn-primary" style={{ marginTop: 8 }} onClick={() => requestSignIn('Sign in to see your profile.')}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const initials = session.profile.full_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = session.profile.role;
  const isPro = role === 'barber' || role === 'salon';

  return (
    <div className="page-enter" style={{ maxWidth: 1040, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em' }}>Profile</h1>

      <div className="profile-grid">
        <section className="panel profile-hero">
          <span className="avatar-chip lg">
            {session.profile.avatar_url ? <img src={session.profile.avatar_url} alt="" /> : initials || 'SC'}
          </span>
          <label className="btn-secondary" style={{ cursor: 'pointer' }}>
            {photoBusy ? 'Saving photo…' : 'Change photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={photoBusy}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                e.target.value = '';
                void handlePhoto(file);
              }}
            />
          </label>
          {session.profile.avatar_url && (
            <button type="button" className="btn-secondary" disabled={photoBusy} onClick={() => void handleRemovePhoto()}>
              Remove photo
            </button>
          )}
          <h2>{session.profile.full_name}</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>
            {session.email} · <span style={{ textTransform: 'capitalize' }}>{role}</span>
          </p>
          <div className="profile-stats">
            <div className="profile-stat">
              <b><CountUp value={visits} /></b>
              <span>Visits this week</span>
            </div>
            <div className="profile-stat">
              <b><CountUp value={minutes} /></b>
              <span>Minutes in a chair</span>
            </div>
            <div className="profile-stat">
              <b style={{ fontSize: 16 }}>{role === 'barber' ? 'Barber' : role === 'salon' ? 'Salon' : role === 'admin' ? 'Admin' : 'Customer'}</b>
              <span>You are</span>
            </div>
          </div>
        </section>

        <form className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleSave}>
          <div>
            <h2 className="panel-title">About you</h2>
            <p className="panel-sub">Change your name or phone, then tap Save. Shops see this when you join a line.</p>
          </div>
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input readOnly value={session.email} />
            <span className="muted" style={{ fontSize: 12 }}>This is the email you use to sign in.</span>
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" inputMode="tel" />
          </div>
          {notice && <p style={{ fontSize: 13.5, fontWeight: 650 }}>{notice}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            {isPro ? (
              <Link href="/barber/shop" className="btn-secondary">Edit my shop</Link>
            ) : (
              <Link href="/bookings" className="btn-secondary">See my ticket</Link>
            )}
            <button type="button" className="btn-secondary" onClick={handleLogout}>Sign out</button>
          </div>
        </form>
      </div>
    </div>
  );
}
