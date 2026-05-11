-- StrataDesk — initial schema
-- Runs automatically when the postgres container starts for the first time.
-- The API also runs CREATE TABLE IF NOT EXISTS on boot, so this is a
-- belt-and-suspenders guarantee that the schema exists before the API connects.

CREATE TABLE IF NOT EXISTS borewells (
  id                         TEXT PRIMARY KEY,
  name                       TEXT NOT NULL,
  location                   TEXT,
  latitude                   DOUBLE PRECISION DEFAULT 0,
  longitude                  DOUBLE PRECISION DEFAULT 0,
  diameter                   INTEGER DEFAULT 8,
  total_depth                DOUBLE PRECISION DEFAULT 0,
  water_level                DOUBLE PRECISION,
  notes                      TEXT,
  selected_for_cross_section BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS layers (
  id           TEXT PRIMARY KEY,
  borewell_id  TEXT NOT NULL REFERENCES borewells(id) ON DELETE CASCADE,
  start_depth  DOUBLE PRECISION NOT NULL,
  end_depth    DOUBLE PRECISION NOT NULL,
  material     TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#78909C',
  sort_order   INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_layers_borewell ON layers(borewell_id);
