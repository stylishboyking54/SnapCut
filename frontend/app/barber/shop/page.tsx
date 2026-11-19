'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addShopPhoto, addShopService, createShop, deleteShop, getMyShop, removeShopPhoto, removeShopService, updateShop, updateShopService } from '@/lib/api';
import { Service, Shop } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { timeGreeting, todayLabel } from '@/lib/greeting';
import { proCopy, useProKind } from '@/lib/proRole';
import HoursEditor from '@/components/barber/HoursEditor';

const LocationPicker = dynamic(() => import('@/components/map/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 260, borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Loading map picker…
    </div>
  ),
});

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
    <section className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="panel-title">Services, prices & duration</h2>
        <p className="panel-sub">
          List each service you offer. Customers see the price in Ghana Cedis (GHS) and estimated duration.
        </p>
      </div>

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Column Header */}
          <div className="service-table-header">
            <span>Service name</span>
            <span>Price (Cedis)</span>
            <span>Duration</span>
            <span style={{ textAlign: 'center' }}>Save</span>
            <span style={{ textAlign: 'center' }}>Remove</span>
          </div>

          {/* Service Rows */}
          {rows.map((service) => (
            <div key={service.id} className="service-table-row">
              <input
                type="text"
                value={service.name}
                placeholder="e.g. Fade"
                aria-label="Service name"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((row) => (row.id === service.id ? { ...row, name: e.target.value } : row))
                  )
                }
              />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  GHS
                </span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={service.price}
                  style={{ paddingLeft: 46 }}
                  aria-label="Price in Ghana Cedis"
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((row) => (row.id === service.id ? { ...row, price: Number(e.target.value) } : row))
                    )
                  }
                />
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={service.duration}
                  style={{ paddingRight: 42 }}
                  aria-label="Minutes duration"
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((row) => (row.id === service.id ? { ...row, duration: Number(e.target.value) } : row))
                    )
                  }
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  min
                </span>
              </div>

              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => onSave(service.id, service.name, String(service.price), String(service.duration))}
                style={{ fontSize: 13, minHeight: 38, padding: '4px 10px' }}
              >
                Save
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => onRemove(service.id)}
                style={{
                  fontSize: 13,
                  minHeight: 38,
                  padding: '4px 10px',
                  color: 'var(--brand-danger)',
                  borderColor: 'rgba(220, 38, 38, 0.25)',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Service Card with distinct labels */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-2, rgba(0,0,0,0.02))',
          border: '1.5px dashed var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
          + Add a new service
        </span>

        <div className="service-add-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Service Name
            </label>
            <input
              type="text"
              placeholder="e.g. Skin Fade"
              value={newService}
              onChange={(e) => onNewService(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Price (Cedis)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                GHS
              </span>
              <input
                type="number"
                min={0}
                step="1"
                placeholder="40"
                value={newPrice}
                style={{ paddingLeft: 46 }}
                onChange={(e) => onNewPrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              How many minutes?
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                min={5}
                max={240}
                placeholder="30"
                value={newMinutes}
                style={{ paddingRight: 42 }}
                onChange={(e) => onNewMinutes(e.target.value)}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              >
                min
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            disabled={busy || !newService.trim() || newPrice === ''}
            onClick={onAdd}
            style={{ minHeight: 42, padding: '0 20px', whiteSpace: 'nowrap' }}
          >
            {busy ? 'Saving…' : '+ Add'}
          </button>
        </div>
      </div>
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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [avgDuration, setAvgDuration] = useState(kind === 'salon' ? 45 : 30);
  const [chairCount, setChairCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
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
          setChairCount(mine.chairCount || 1);
          setLat(mine.lat ?? null);
          setLng(mine.lng ?? null);
        } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLat(Number(pos.coords.latitude.toFixed(5)));
              setLng(Number(pos.coords.longitude.toFixed(5)));
            },
            () => {},
            { timeout: 8000 }
          );
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
        chair_count: Math.max(1, Math.min(20, Number(chairCount) || 1)),
        shop_type: kind,
        lat: lat,
        lng: lng,
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

  const handleDeleteShop = async () => {
    if (!shop || deleteBusy) return;
    const confirmName = window.prompt(
      `Are you sure you want to permanently delete "${shop.name}"?\n\nType the shop name to confirm:`,
    );
    if (!confirmName || confirmName.trim().toLowerCase() !== shop.name.trim().toLowerCase()) {
      if (confirmName !== null) {
        alert('Shop name did not match. Store deletion cancelled.');
      }
      return;
    }

    setDeleteBusy(true);
    setError(null);
    try {
      await deleteShop(shop.id);
      setShop(null);
      setName('');
      setTagline('');
      setAddress('');
      setPhone('');
      alert(`"${shop.name}" has been permanently deleted.`);
      router.push('/barber/shop?setup=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete shop');
      setDeleteBusy(false);
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
    <div className="page-enter" style={{ maxWidth: 1120, width: '100%', margin: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
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
                    background: 'var(--bg-elevated)',
                  }}
                >
                  <img
                    src={src}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
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
        <div>
          <h2 className="panel-title">Shop details</h2>
          <p className="panel-sub">Name, location, and contact information displayed on your shop card.</p>
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div className="field">
            <label>City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>

          <div className="field">
            <label>Street address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
        </div>

        {/* Store GPS & Map Location Picker */}
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2, rgba(0,0,0,0.02))', border: '1px solid var(--border)' }}>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={({ lat: newLat, lng: newLng, city: newCity, address: newAddr }) => {
              setLat(newLat);
              setLng(newLng);
              if (newCity && !city) setCity(newCity);
              if (newAddr && !address) setAddress(newAddr);
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
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

          <div className="field">
            <label>Active Chairs / Stylists (Capacity)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={chairCount}
              onChange={(e) => setChairCount(Math.max(1, Number(e.target.value)))}
            />
            <span className="muted" style={{ fontSize: 12 }}>
              How many clients can be served simultaneously (e.g. 1 for solo, 2 or more if you have apprentices/staff). Up to this many customers can book the same time slot.
            </span>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={busy} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          {busy ? 'Saving…' : creating ? 'Save and open my line' : 'Save changes'}
        </button>
      </form>

      {/* Danger Zone: Delete Store */}
      {!creating && shop && (
        <section
          className="panel"
          style={{
            border: '1.5px solid rgba(220, 38, 38, 0.35)',
            background: 'var(--brand-danger-soft, rgba(220, 38, 38, 0.04))',
            padding: '24px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--brand-danger)' }}>
              Danger Zone: Delete this {copy.shopTitle}
            </h2>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Permanently remove <strong>{shop.name}</strong> from SnapCut. All active line spots, services, schedule hours, and photos will be deleted. This action is permanent and cannot be undone.
          </p>

          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={handleDeleteShop}
              disabled={deleteBusy}
              className="btn-secondary"
              style={{
                borderColor: 'var(--brand-danger)',
                color: 'var(--brand-danger)',
                background: 'var(--bg-surface)',
                fontWeight: 700,
                fontSize: 13,
                minHeight: 40,
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              {deleteBusy ? 'Deleting store…' : `🗑️ Permanently Delete ${shop.name}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}