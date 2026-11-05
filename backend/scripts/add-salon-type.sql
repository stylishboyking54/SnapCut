-- Snapcut: add salon role + shop type (barber = men, salon = women)
-- Run in Supabase SQL Editor

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'barber', 'salon', 'admin'));

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS shop_type TEXT NOT NULL DEFAULT 'barber';

ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_shop_type_check;
ALTER TABLE shops
  ADD CONSTRAINT shops_shop_type_check
  CHECK (shop_type IN ('barber', 'salon'));

-- Existing shops stay barbershops (men) by default
UPDATE shops SET shop_type = 'barber' WHERE shop_type IS NULL OR shop_type = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Snapcut User'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('customer', 'barber', 'salon', 'admin')
        THEN NEW.raw_user_meta_data->>'role'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
