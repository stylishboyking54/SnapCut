'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addShopPhoto, addShopService, createShop, getMyShop, removeShopPhoto, removeShopService, updateShop, updateShopService } from '@/lib/api';
import { Service, Shop } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';
import HoursEditor from '@/components/barber/HoursEditor';

function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 960;
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

function ServiceEditor({
  services,
  busy,
  newService,
  newPrice,
  newMinutes,
  onNewService,
  onNewPrice,
  onNewMinutes,
  onAdd,
  onSave,
  onRemove,
}: {
  services: Service[];
  busy: boolean;
  newService: string;
  newPrice: string;
  newMinutes: string;
  onNewService: (value: string) => void;
  onNewPrice: (value: string) => void;
  onNewMinutes: (value: string) => void;
  onAdd: () => void;
  onSave: (id: string, name: string, price: string, minutes: string) => void;
  onRemove: (id: string) => void;
}) {
  const [rows, setRows] = React.useState(services);
  useEffect(() => {
    setRows(services);
  }, [services]);

  return (
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h2 className="panel-title">Services and prices</h2>
        <p className="panel-sub">Add each cut or treatment. The amount is in Ghana cedis (GHS). People see it on your card.</p>
      </div>
      {rows.map((service) => (
        <div key={service.id} className="service-edit-row">
          <input
            type="text"
            value={service.name}
            aria-label="Service name"
            onChange={(e) => setRows((prev) => prev.map((row) => row.id === service.id ? { ...row, name: e.target.value } : row))}
          />
          <input
            type="number"
            min={0}
            step="1"
            value={service.price}
            aria-label="Price in GHS"
            onChange={(e) => setRows((prev) => prev.map((row) => row.id === service.id ? { ...row, price: Number(e.target.value) } : row))}
          />
          <input
            type="number"
            min={5}
            max={240}
            value={service.duration}
            aria-label="Minutes"
            onChange={(e) => setRows((prev) => prev.map((row) => row.id === service.id ? { ...row, duration: Number(e.target.value) } : row))}
          />
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => onSave(service.id, service.name, String(service.price), String(service.duration))}>
            Save
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => onRemove(service.id)}>
            Remove
          </button>
        </div>
      ))}
      <div className="service-edit-row">
        <input type="text" placeholder="New service, e.g. Fade" value={newService} onChange={(e) => onNewService(e.target.value)} />
        <input type="number" min={0} step="1" placeholder="GHS" value={newPrice} onChange={(e) => onNewPrice(e.target.value)} />
        <input type="number" min={5} max={240} placeholder="Min" value={newMinutes} onChange={(e) => onNewMinutes(e.target.value)} />
        <button type="button" className="btn-primary" disabled={busy || !newService.trim() || newPrice === ''} onClick={onAdd}>
          {busy ? 'Saving…' : 'Add'}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Name, price in GHS, then how many minutes it takes.</p>
    </section>
  );
}

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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [newService, setNewService] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newMinutes, setNewMinutes] = useState('30');
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

  const handleAddPhoto = async (file: File | null) => {
    if (!shop || !file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a photo, not a document.');
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const image = await shrinkPhoto(file);
      const next = await addShopPhoto(shop.id, image);
      setShop(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async (url: string) => {
    if (!shop) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const next = await removeShopPhoto(shop.id, url);
      setShop(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleAddService = async () => {
    if (!shop) return;
    setServiceBusy(true);
    setError(null);
    try {
      const next = await addShopService(shop.id, {
        name: newService.trim(),
        price: Number(newPrice),
        duration: Number(newMinutes) || 30,
      });
      setShop(next);
      setNewService('');
      setNewPrice('');
      setNewMinutes('30');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that service');
    } finally {
      setServiceBusy(false);
    }
  };

  const handleSaveService = async (serviceId: string, serviceName: string, price: string, minutes: string) => {
    if (!shop) return;
    setServiceBusy(true);
    setError(null);
    try {
      const next = await updateShopService(shop.id, serviceId, {
        name: serviceName.trim(),
        price: Number(price),
        duration: Number(minutes) || 30,
      });
      setShop(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that price');
    } finally {
      setServiceBusy(false);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!shop) return;
    setServiceBusy(true);
    setError(null);
    try {
      setShop(await removeShopService(shop.id, serviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that service');
    } finally {
      setServiceBusy(false);
    }
  };

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

      {shop && (
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 className="panel-title">Shop photos</h2>
            <p className="panel-sub">
              Add up to 8 photos. They automatically scroll on your shop card so customers can see your space.
              {shop.photos && shop.photos.length > 0 && (
                <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                  {' '}{shop.photos.length}/8 added
                </span>
              )}
            </p>
          </div>

          {/* Photo grid preview */}
          {(shop.photos?.length ? shop.photos : shop.coverImage ? [shop.coverImage] : []).length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 8,
              }}
            >
              {(shop.photos?.length ? shop.photos : shop.coverImage ? [shop.coverImage] : []).map((src, idx) => (
                <div
                  key={src}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <img
                    src={src}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Order badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 99,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => void handleRemovePhoto(src)}
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      background: 'rgba(220,38,38,0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 7px',
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo button */}
          {(!shop.photos || shop.photos.length < 8) && (
            <label
              className="btn-secondary"
              style={{ width: 'fit-content', cursor: 'pointer' }}
            >
              {photoBusy ? 'Uploading…' : '+ Add a photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={photoBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  e.target.value = '';
                  void handleAddPhoto(file);
                }}
              />
            </label>
          )}

          <p className="muted" style={{ fontSize: 12 }}>
            First photo appears first in the scroll. Max 8 photos, each under 1.5 MB.
          </p>
        </section>
      )}

      {shop && (
        <ServiceEditor
          services={shop.services}
          busy={serviceBusy}
          newService={newService}
          newPrice={newPrice}
          newMinutes={newMinutes}
          onNewService={setNewService}
          onNewPrice={setNewPrice}
          onNewMinutes={setNewMinutes}
          onAdd={() => void handleAddService()}
          onSave={(id, serviceName, price, minutes) => void handleSaveService(id, serviceName, price, minutes)}
          onRemove={(id) => void handleRemoveService(id)}
        />
      )}

      {shop && (
        <HoursEditor
          shopId={shop.id}
          initialHours={shop.workingHours}
          onSaved={() => void getMyShop().then((s) => s && setShop(s))}
        />
      )}

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
