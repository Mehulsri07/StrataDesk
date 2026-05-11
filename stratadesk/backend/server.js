require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── DB ───────────────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'db',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'stratadesk',
  user:     process.env.DB_USER     || 'stratadesk',
  password: process.env.DB_PASSWORD || 'stratadesk',
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Schema bootstrap ─────────────────────────────────────────────────────────
async function initSchema() {
  await pool.query(`
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
  `);
  console.log('Schema ready');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function rowToBorewell(row, layers = []) {
  return {
    id:                      row.id,
    name:                    row.name,
    location:                row.location || '',
    latitude:                parseFloat(row.latitude)    || 0,
    longitude:               parseFloat(row.longitude)   || 0,
    diameter:                parseInt(row.diameter)      || 8,
    totalDepth:              parseFloat(row.total_depth) || 0,
    waterLevel:              row.water_level != null ? parseFloat(row.water_level) : null,
    notes:                   row.notes || '',
    selectedForCrossSection: row.selected_for_cross_section || false,
    createdAt:               row.created_at,
    updatedAt:               row.updated_at,
    layers:                  layers.map(layerRowToLayer),
  };
}

function layerRowToLayer(r) {
  return {
    id:         r.id,
    startDepth: parseFloat(r.start_depth),
    endDepth:   parseFloat(r.end_depth),
    material:   r.material,
    color:      r.color,
  };
}

async function fetchBorewellWithLayers(client, id) {
  const bw  = await client.query('SELECT * FROM borewells WHERE id = $1', [id]);
  if (!bw.rows.length) return null;
  const lyr = await client.query(
    'SELECT * FROM layers WHERE borewell_id = $1 ORDER BY sort_order, start_depth',
    [id]
  );
  return rowToBorewell(bw.rows[0], lyr.rows);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/borewells
app.get('/api/borewells', async (req, res) => {
  try {
    const bws  = await pool.query('SELECT * FROM borewells ORDER BY created_at');
    const lyrs = await pool.query('SELECT * FROM layers ORDER BY sort_order, start_depth');
    const layerMap = {};
    lyrs.rows.forEach(l => {
      (layerMap[l.borewell_id] = layerMap[l.borewell_id] || []).push(l);
    });
    res.json(bws.rows.map(b => rowToBorewell(b, layerMap[b.id] || [])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/borewells/:id
app.get('/api/borewells/:id', async (req, res) => {
  try {
    const bw = await fetchBorewellWithLayers(pool, req.params.id);
    if (!bw) return res.status(404).json({ error: 'Not found' });
    res.json(bw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/borewells
app.post('/api/borewells', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;
    await client.query(
      `INSERT INTO borewells
         (id,name,location,latitude,longitude,diameter,
          total_depth,water_level,notes,selected_for_cross_section,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        b.id, b.name, b.location || '',
        b.latitude || 0, b.longitude || 0,
        b.diameter || 8, b.totalDepth || 0,
        b.waterLevel ?? null, b.notes || '',
        b.selectedForCrossSection || false,
        b.createdAt || new Date().toISOString(),
        b.updatedAt || new Date().toISOString(),
      ]
    );
    for (let i = 0; i < (b.layers || []).length; i++) {
      const l = b.layers[i];
      await client.query(
        `INSERT INTO layers (id,borewell_id,start_depth,end_depth,material,color,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [l.id, b.id, l.startDepth, l.endDepth, l.material, l.color || '#78909C', i]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(await fetchBorewellWithLayers(client, b.id));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/borewells/:id  — full replace
app.put('/api/borewells/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const b = req.body;
    const exists = await client.query('SELECT id FROM borewells WHERE id=$1', [id]);
    if (!exists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    await client.query(
      `UPDATE borewells SET
         name=$1,location=$2,latitude=$3,longitude=$4,
         diameter=$5,total_depth=$6,water_level=$7,notes=$8,
         selected_for_cross_section=$9,updated_at=$10
       WHERE id=$11`,
      [
        b.name, b.location || '',
        b.latitude || 0, b.longitude || 0,
        b.diameter || 8, b.totalDepth || 0,
        b.waterLevel ?? null, b.notes || '',
        b.selectedForCrossSection || false,
        new Date().toISOString(), id,
      ]
    );
    await client.query('DELETE FROM layers WHERE borewell_id=$1', [id]);
    for (let i = 0; i < (b.layers || []).length; i++) {
      const l = b.layers[i];
      await client.query(
        `INSERT INTO layers (id,borewell_id,start_depth,end_depth,material,color,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [l.id, id, l.startDepth, l.endDepth, l.material, l.color || '#78909C', i]
      );
    }
    await client.query('COMMIT');
    res.json(await fetchBorewellWithLayers(client, id));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/borewells/:id  — partial update
app.patch('/api/borewells/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;
    const fields = [];
    const vals   = [];
    let   n      = 1;

    const add = (col, val) => { fields.push(`${col}=$${n++}`); vals.push(val); };

    if (b.selectedForCrossSection !== undefined) add('selected_for_cross_section', b.selectedForCrossSection);
    if (b.name       !== undefined) add('name',        b.name);
    if (b.location   !== undefined) add('location',    b.location);
    if (b.latitude   !== undefined) add('latitude',    b.latitude);
    if (b.longitude  !== undefined) add('longitude',   b.longitude);
    if (b.totalDepth !== undefined) add('total_depth', b.totalDepth);
    if (b.waterLevel !== undefined) add('water_level', b.waterLevel);
    if (b.notes      !== undefined) add('notes',       b.notes);

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    add('updated_at', new Date().toISOString());
    vals.push(id);

    await pool.query(
      `UPDATE borewells SET ${fields.join(', ')} WHERE id=$${n}`,
      vals
    );
    const updated = await fetchBorewellWithLayers(pool, id);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/borewells/:id
app.delete('/api/borewells/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM borewells WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
initSchema()
  .then(() => app.listen(PORT, () => console.log(`API listening on :${PORT}`)))
  .catch(err => { console.error('Schema init failed:', err); process.exit(1); });
