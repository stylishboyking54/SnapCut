/**
 * Seeds SnapCut demo shops + services into Supabase.
 * Loads keys from backend/.env (never hardcodes secrets).
 *
 * Usage: node scripts/seed-supabase.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

function loadEnv(path) {
  const map = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    map[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return map;
}

const env = loadEnv(envPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key.includes('REPLACE') || key.includes('placeholder')) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = 'barber@snapcut.app';
const DEMO_PASSWORD = 'SnapcutBarber1!';

const SHOPS = [
  {
    name: 'Blade & Fade Studio',
    tagline: 'Precision fades & classic beard grooming',
    shop_type: 'barber',
    address: '142 Market St, Downtown',
    city: 'Metro City',
    lat: 40.7128,
    lng: -74.006,
    phone: '+1 (555) 234-5678',
    cover_image_url:
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    review_count: 142,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 25,
    services: [
      { name: 'Signature Skin Fade', duration: 30, price: 35 },
      { name: 'Beard Sculpt & Hot Towel', duration: 20, price: 25 },
      { name: 'Full Combo (Cut + Beard + Wash)', duration: 45, price: 55 },
      { name: 'Junior Cut (< 12 yrs)', duration: 20, price: 22 },
    ],
  },
  {
    name: 'Apex Grooming Lounge',
    tagline: 'Modern styling & luxury lounge atmosphere',
    shop_type: 'barber',
    address: '88 Kingfisher Ave, Westside',
    city: 'Metro City',
    lat: 40.7182,
    lng: -74.015,
    phone: '+1 (555) 876-5432',
    cover_image_url:
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    review_count: 98,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 30,
    services: [
      { name: 'Executive Taper Cut', duration: 30, price: 40 },
      { name: 'Razor Shave with Aloe', duration: 25, price: 30 },
      { name: 'Hair Color Treatment', duration: 50, price: 70 },
    ],
  },
  {
    name: 'Iron & Oak Barbers',
    tagline: 'Fast turnaround, zero-nonsense classic cuts',
    shop_type: 'barber',
    address: '304 Elmwood Blvd',
    city: 'Metro City',
    lat: 40.725,
    lng: -73.998,
    phone: '+1 (555) 432-1098',
    cover_image_url:
      'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    review_count: 215,
    is_open: true,
    is_emergency: true,
    emergency_reason: 'Barber chair hydraulic replacement in progress',
    avg_service_duration: 20,
    services: [
      { name: 'Classic Crew Cut', duration: 20, price: 28 },
      { name: 'Moustache Groom & Wax', duration: 15, price: 18 },
    ],
  },
  {
    name: 'Crown Heritage Salon',
    tagline: 'Women’s cuts, color, and finish — walk-ins welcome',
    shop_type: 'salon',
    address: '512 Oakridge Parkway',
    city: 'Metro City',
    lat: 40.705,
    lng: -74.02,
    phone: '+1 (555) 999-1122',
    cover_image_url:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    review_count: 76,
    is_open: true,
    is_emergency: false,
    avg_service_duration: 45,
    services: [
      { name: 'Silk Blowout', duration: 40, price: 45 },
      { name: 'Cut & Style', duration: 50, price: 70 },
      { name: 'Color Refresh', duration: 90, price: 120 },
    ],
  },
];

async function ensureBarber() {
  const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listErr) {
    console.warn('listUsers failed:', listErr.message);
  } else {
    const existing =
      listed.users.find((u) => u.email === DEMO_EMAIL) ||
      listed.users.find((u) => (u.user_metadata?.role || '') === 'barber') ||
      listed.users[0];
    if (existing) {
      await supabase.from('profiles').upsert({
        id: existing.id,
        full_name: existing.user_metadata?.full_name || 'Marcus Vance',
        role: 'barber',
      });
      console.log('Using existing user as barber owner:', existing.id, existing.email);
      return existing.id;
    }
  }

  // Prefer minimal metadata — the profiles trigger can fail on bad role values
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Marcus Vance' },
  });
  if (error) {
    console.error('createUser failed:', error.message, error);
    throw error;
  }

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name: 'Marcus Vance',
    role: 'barber',
  });
  if (profileErr) console.warn('profile upsert:', profileErr.message);

  console.log('Created barber user:', data.user.id);
  return data.user.id;
}

async function seed() {
  // Sanity: shops table must exist
  const { error: probeErr } = await supabase.from('shops').select('id').limit(1);
  if (probeErr) {
    console.error('shops table not ready:', probeErr.message);
    process.exit(1);
  }

  const ownerId = await ensureBarber();

  const { count } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true });

  if ((count || 0) > 0) {
    console.log(`Shops already present (${count}). Skipping insert.`);
    return;
  }

  for (const shop of SHOPS) {
    const { services, ...shopRow } = shop;
    const { data: created, error } = await supabase
      .from('shops')
      .insert({ ...shopRow, owner_id: ownerId })
      .select('id, name')
      .single();
    if (error) throw error;

    const serviceRows = services.map((s) => ({ ...s, shop_id: created.id }));
    const { error: svcErr } = await supabase.from('services').insert(serviceRows);
    if (svcErr) throw svcErr;
    console.log('Seeded shop:', created.name);
  }

  console.log('Done. Demo barber login:', DEMO_EMAIL, '/', DEMO_PASSWORD);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
