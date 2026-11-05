-- ============================================================
-- Snapcut — Supabase Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer'
              CHECK (role IN ('customer', 'barber', 'salon', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SHOPS
-- ============================================================
CREATE TABLE shops (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  tagline              TEXT,
  description          TEXT,
  address              TEXT NOT NULL,
  city                 TEXT NOT NULL,
  lat                  FLOAT,
  lng                  FLOAT,
  phone                TEXT,
  cover_image_url      TEXT,
  rating               NUMERIC(2,1) DEFAULT 5.0,
  review_count         INT DEFAULT 0,
  is_open              BOOLEAN DEFAULT TRUE,
  is_emergency         BOOLEAN DEFAULT FALSE,
  emergency_reason     TEXT,
  is_verified          BOOLEAN DEFAULT FALSE,
  avg_service_duration INT DEFAULT 30,  -- minutes
  shop_type            TEXT NOT NULL DEFAULT 'barber'
                       CHECK (shop_type IN ('barber', 'salon')),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICES (haircut types per shop)
-- ============================================================
CREATE TABLE services (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  duration   INT NOT NULL DEFAULT 30,  -- minutes
  price      DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKING HOURS (weekly schedule)
-- ============================================================
CREATE TABLE working_hours (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  UNIQUE(shop_id, day_of_week)
);

-- ============================================================
-- BREAKS / REST BLOCKS
-- ============================================================
CREATE TABLE breaks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  start_datetime   TIMESTAMPTZ NOT NULL,
  end_datetime     TIMESTAMPTZ NOT NULL,
  reason           TEXT,
  is_recurring     BOOLEAN DEFAULT FALSE,
  recurrence_rule  TEXT,  -- e.g. 'DAILY', 'WEEKLY'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id                 UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id              UUID REFERENCES services(id) ON DELETE SET NULL,
  scheduled_at            TIMESTAMPTZ NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN (
                            'pending', 'confirmed', 'in_progress',
                            'completed', 'cancelled', 'rescheduled'
                          )),
  queue_position          INT,
  estimated_wait_minutes  INT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent double-booking same slot
CREATE UNIQUE INDEX unique_active_booking_slot
  ON bookings(shop_id, scheduled_at)
  WHERE status IN ('pending', 'confirmed');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type        TEXT NOT NULL
              CHECK (type IN ('queue_update', 'emergency', 'reschedule', 'reminder', 'general')),
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GEO FUNCTION: find shops within radius (km)
-- ============================================================
CREATE OR REPLACE FUNCTION shops_within_radius(p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT)
RETURNS TABLE(
  id UUID, name TEXT, address TEXT, city TEXT,
  lat FLOAT, lng FLOAT, cover_image_url TEXT,
  is_open BOOLEAN, is_emergency BOOLEAN,
  avg_service_duration INT, distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.address, s.city,
    s.lat, s.lng, s.cover_image_url,
    s.is_open, s.is_emergency,
    s.avg_service_duration,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(s.lat)) *
        cos(radians(s.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(s.lat))
      )
    )::FLOAT AS distance_km
  FROM shops s
  WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(s.lat)) *
        cos(radians(s.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(s.lat))
      )
    ) <= p_radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles: public read, own write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Own profile write" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Shops: public read, owner write
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shops" ON shops FOR SELECT USING (TRUE);
CREATE POLICY "Owner insert shop" ON shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update shop" ON shops FOR UPDATE USING (auth.uid() = owner_id);

-- Services: public read, shop owner write
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read services" ON services FOR SELECT USING (TRUE);
CREATE POLICY "Owner manage services" ON services FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = shop_id));

-- Working hours: public read, shop owner write
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hours" ON working_hours FOR SELECT USING (TRUE);
CREATE POLICY "Owner manage hours" ON working_hours FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = shop_id));

-- Breaks: public read, shop owner write
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read breaks" ON breaks FOR SELECT USING (TRUE);
CREATE POLICY "Owner manage breaks" ON breaks FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = shop_id));

-- Bookings: own read (customer), shop read (barber)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer read own bookings" ON bookings FOR SELECT
  USING (auth.uid() = customer_id);
CREATE POLICY "Barber read shop bookings" ON bookings FOR SELECT
  USING (auth.uid() = (SELECT owner_id FROM shops WHERE id = shop_id));
CREATE POLICY "Customer insert booking" ON bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer/Barber update booking" ON bookings FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = (SELECT owner_id FROM shops WHERE id = shop_id));

-- Notifications: own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: enable tables for live subscriptions
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE shops;
