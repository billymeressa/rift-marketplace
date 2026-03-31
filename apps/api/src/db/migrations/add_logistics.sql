CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  make VARCHAR(50),
  model VARCHAR(50),
  capacity_kg DECIMAL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  license_number VARCHAR(50),
  truck_id UUID REFERENCES trucks(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_truck_id UUID REFERENCES trucks(id),
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS seal_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS seal_photos JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_photos JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS seal_intact VARCHAR(10);
