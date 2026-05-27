require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── DB Connection ─────────────────────────────────────────────────────────────
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host:     process.env.DB_HOST     || 'postgres',
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME     || 'stratadesk',
        user:     process.env.DB_USER     || 'stratadesk',
        password: process.env.DB_PASSWORD || 'stratadesk',
      }
);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Morgan request logging (Method URL Status Duration - IP)
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));

// Metrics collection store
const metrics = {
  requestsTotal: {}, // "method:route:status" -> count
  activeRequests: 0,
  requestDurationSum: 0,
  requestDurationCount: 0,
  errorRequestsTotal: 0,
};

// Route normalizer to prevent cardinality explosion
function normalizeRoute(path) {
  const segments = path.split('/');
  const normalized = segments.map((segment, idx) => {
    if (idx > 0 && segments[idx - 1] === 'borewells') {
      if (segment && segment !== 'metrics' && segment !== 'health') {
        return ':id';
      }
    }
    return segment;
  });
  return normalized.join('/');
}

// Custom metrics middleware
app.use((req, res, next) => {
  if (req.path === '/api/metrics') {
    return next();
  }

  metrics.activeRequests++;
  const start = performance.now();
  let finished = false;

  const decrementActive = () => {
    if (!finished) {
      metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
      finished = true;
    }
  };

  res.on('finish', () => {
    decrementActive();
    const duration = performance.now() - start;
    metrics.requestDurationSum += duration;
    metrics.requestDurationCount++;

    const method = req.method;
    const route = normalizeRoute(req.path);
    const status = res.statusCode;
    const key = `${method}:${route}:${status}`;
    metrics.requestsTotal[key] = (metrics.requestsTotal[key] || 0) + 1;

    if (status >= 400) {
      metrics.errorRequestsTotal++;
    }
  });

  res.on('close', () => {
    decrementActive();
  });

  next();
});

const API_TOKEN = process.env.API_TOKEN || 'dev-token';

if (
  process.env.NODE_ENV === 'production' &&
  API_TOKEN === 'dev-token'
) {
  throw new Error(
    'Refusing to start with dev-token in production'
  );
}

if (API_TOKEN === 'dev-token') {
  console.warn(
    '[WARN] API_TOKEN not set — using insecure default'
  );
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || token !== API_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  next();
}

// ── Schema bootstrap ──────────────────────────────────────────────────────────
async function initSchema(retries = 10) {
  while (retries > 0) {
    try {
      console.log(`Attempting DB connection... (${11 - retries}/10)`);

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
          ground_elevation_msl       DOUBLE PRECISION,
          notes                      TEXT,
          selected_for_cross_section BOOLEAN DEFAULT FALSE,
          created_at                 TIMESTAMPTZ DEFAULT NOW(),
          updated_at                 TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Add ground_elevation_msl to existing deployments that don't have it yet
      await pool.query(`
        ALTER TABLE borewells
        ADD COLUMN IF NOT EXISTS ground_elevation_msl DOUBLE PRECISION;
      `);

      await pool.query(`
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

      console.log('Schema ready ✅');
      return;

    } catch (err) {
      console.error('Database connection failed:');
      console.error(err.message);

      retries--;

      if (retries === 0) throw err;

      console.log('Waiting 5 seconds before retrying...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rowToBorewell(row, layers = []) {
  return {
    id:                      row.id,
    name:                    row.name,
    location:                row.location || '',
    latitude:                parseFloat(row.latitude)    || 0,
    longitude:               parseFloat(row.longitude)   || 0,
    diameter:                parseInt(row.diameter)      || 8,
    totalDepth:              parseFloat(row.total_depth) || 0,
    waterLevel:              row.water_level         != null ? parseFloat(row.water_level)         : null,
    groundElevationMSL:      row.ground_elevation_msl != null ? parseFloat(row.ground_elevation_msl) : null,
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
  const bw = await client.query('SELECT * FROM borewells WHERE id = $1', [id]);
  if (!bw.rows.length) return null;
  const lyr = await client.query(
    'SELECT * FROM layers WHERE borewell_id = $1 ORDER BY sort_order, start_depth',
    [id]
  );
  return rowToBorewell(bw.rows[0], lyr.rows);
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.send('StrataDesk API Running'));

// GET /api/health
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok' })
);

// GET /api/metrics (Prometheus compatible text format)
app.get('/api/metrics', (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  let body = '';

  body += '# HELP stratadesk_requests_total Total number of HTTP requests\n';
  body += '# TYPE stratadesk_requests_total counter\n';
  Object.entries(metrics.requestsTotal).forEach(([key, count]) => {
    const firstColon = key.indexOf(':');
    const lastColon = key.lastIndexOf(':');
    const method = key.substring(0, firstColon);
    const route = key.substring(firstColon + 1, lastColon);
    const status = key.substring(lastColon + 1);
    body += `stratadesk_requests_total{method="${method}",route="${route}",status="${status}"} ${count}\n`;
  });
  body += '\n';

  body += '# HELP stratadesk_active_requests Number of currently active HTTP requests\n';
  body += '# TYPE stratadesk_active_requests gauge\n';
  body += `stratadesk_active_requests ${metrics.activeRequests}\n\n`;

  body += '# HELP stratadesk_request_duration_ms_sum Cumulative request duration in milliseconds\n';
  body += '# TYPE stratadesk_request_duration_ms_sum counter\n';
  body += `stratadesk_request_duration_ms_sum ${metrics.requestDurationSum}\n\n`;

  body += '# HELP stratadesk_request_duration_ms_count Cumulative request count for duration\n';
  body += '# TYPE stratadesk_request_duration_ms_count counter\n';
  body += `stratadesk_request_duration_ms_count ${metrics.requestDurationCount}\n\n`;

  body += '# HELP stratadesk_request_errors_total Total number of HTTP requests returning status code >= 400\n';
  body += '# TYPE stratadesk_request_errors_total counter\n';
  body += `stratadesk_request_errors_total ${metrics.errorRequestsTotal}\n\n`;

  // DB Pool metrics (Change #1 — pool often dies before DB itself)
  const poolTotal = pool.totalCount || 0;
  const poolIdle = pool.idleCount || 0;
  const poolWaiting = pool.waitingCount || 0;
  const poolActive = poolTotal - poolIdle;

  body += '# HELP stratadesk_db_pool_total Total number of clients in the pool\n';
  body += '# TYPE stratadesk_db_pool_total gauge\n';
  body += `stratadesk_db_pool_total ${poolTotal}\n\n`;

  body += '# HELP stratadesk_db_pool_idle Number of idle clients in the pool\n';
  body += '# TYPE stratadesk_db_pool_idle gauge\n';
  body += `stratadesk_db_pool_idle ${poolIdle}\n\n`;

  body += '# HELP stratadesk_db_pool_waiting Number of queued requests waiting for a client\n';
  body += '# TYPE stratadesk_db_pool_waiting gauge\n';
  body += `stratadesk_db_pool_waiting ${poolWaiting}\n\n`;

  body += '# HELP stratadesk_db_pool_active Number of clients currently checked out and in use\n';
  body += '# TYPE stratadesk_db_pool_active gauge\n';
  body += `stratadesk_db_pool_active ${poolActive}\n\n`;

  body += '# HELP stratadesk_memory_usage_bytes Node process memory usage in bytes\n';
  body += '# TYPE stratadesk_memory_usage_bytes gauge\n';
  body += `stratadesk_memory_usage_bytes{type="rss"} ${mem.rss}\n`;
  body += `stratadesk_memory_usage_bytes{type="heapTotal"} ${mem.heapTotal}\n`;
  body += `stratadesk_memory_usage_bytes{type="heapUsed"} ${mem.heapUsed}\n`;
  body += `stratadesk_memory_usage_bytes{type="external"} ${mem.external}\n\n`;

  body += '# HELP stratadesk_uptime_seconds Node process uptime in seconds\n';
  body += '# TYPE stratadesk_uptime_seconds gauge\n';
  body += `stratadesk_uptime_seconds ${uptime}\n`;

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.end(body);
});

// GET /api/borewells
app.get('/api/borewells', requireAuth, async (req, res) => {
  try {
    console.log('Fetching borewells...');
    const bws  = await pool.query('SELECT * FROM borewells ORDER BY created_at DESC');

    console.log('Fetching layers...');
    const lyrs = await pool.query('SELECT * FROM layers ORDER BY sort_order, start_depth');

    console.log('Queries successful');

    const layerMap = {};
    lyrs.rows.forEach(l => {
      (layerMap[l.borewell_id] = layerMap[l.borewell_id] || []).push(l);
    });

    res.json(bws.rows.map(b => rowToBorewell(b, layerMap[b.id] || [])));
  } catch (err) {
    console.error('FULL DATABASE ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/borewells/:id
app.get('/api/borewells/:id', requireAuth, async (req, res) => {
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
app.post('/api/borewells', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body;

    await client.query(
      `INSERT INTO borewells
         (id, name, location, latitude, longitude, diameter,
          total_depth, water_level, ground_elevation_msl,
          notes, selected_for_cross_section, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        b.id,
        b.name,
        b.location              || '',
        b.latitude              || 0,
        b.longitude             || 0,
        b.diameter              || 8,
        b.totalDepth            || 0,
        b.waterLevel            ?? null,
        b.groundElevationMSL    ?? null,
        b.notes                 || '',
        b.selectedForCrossSection || false,
        b.createdAt             || new Date().toISOString(),
        b.updatedAt             || new Date().toISOString(),
      ]
    );

    for (let i = 0; i < (b.layers || []).length; i++) {
      const l = b.layers[i];
      await client.query(
        `INSERT INTO layers (id, borewell_id, start_depth, end_depth, material, color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [l.id, b.id, l.startDepth, l.endDepth, l.material, l.color || '#78909C', i]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(await fetchBorewellWithLayers(client, b.id));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create borewell' });
  } finally {
    client.release();
  }
});

// PUT /api/borewells/:id — full replace
app.put('/api/borewells/:id', requireAuth, async (req, res) => {
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
         name=$1, location=$2, latitude=$3, longitude=$4,
         diameter=$5, total_depth=$6, water_level=$7,
         ground_elevation_msl=$8, notes=$9,
         selected_for_cross_section=$10, updated_at=$11
       WHERE id=$12`,
      [
        b.name,
        b.location              || '',
        b.latitude              || 0,
        b.longitude             || 0,
        b.diameter              || 8,
        b.totalDepth            || 0,
        b.waterLevel            ?? null,
        b.groundElevationMSL    ?? null,
        b.notes                 || '',
        b.selectedForCrossSection || false,
        new Date().toISOString(),
        id,
      ]
    );

    await client.query('DELETE FROM layers WHERE borewell_id=$1', [id]);

    for (let i = 0; i < (b.layers || []).length; i++) {
      const l = b.layers[i];
      await client.query(
        `INSERT INTO layers (id, borewell_id, start_depth, end_depth, material, color, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [l.id, id, l.startDepth, l.endDepth, l.material, l.color || '#78909C', i]
      );
    }

    await client.query('COMMIT');
    res.json(await fetchBorewellWithLayers(client, id));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update borewell' });
  } finally {
    client.release();
  }
});

// PATCH /api/borewells/:id — partial update
app.patch('/api/borewells/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const b = req.body;

    const exists = await client.query('SELECT id FROM borewells WHERE id=$1', [id]);
    if (!exists.rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }

    const fields = [];
    const vals   = [];
    let   n      = 1;

    const add = (col, val) => { fields.push(`${col}=$${n++}`); vals.push(val); };

    if (b.name                    !== undefined) add('name',                       b.name);
    if (b.location                !== undefined) add('location',                   b.location);
    if (b.latitude                !== undefined) add('latitude',                   b.latitude);
    if (b.longitude               !== undefined) add('longitude',                  b.longitude);
    if (b.totalDepth              !== undefined) add('total_depth',                b.totalDepth);
    if (b.waterLevel              !== undefined) add('water_level',                b.waterLevel);
    if (b.groundElevationMSL      !== undefined) add('ground_elevation_msl',       b.groundElevationMSL);
    if (b.notes                   !== undefined) add('notes',                      b.notes);
    if (b.selectedForCrossSection !== undefined) add('selected_for_cross_section', b.selectedForCrossSection);

    if (fields.length === 0 && b.layers === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    await client.query('BEGIN');

    if (fields.length > 0) {
      add('updated_at', new Date().toISOString());
      vals.push(id);
      await client.query(
        `UPDATE borewells SET ${fields.join(', ')} WHERE id=$${n}`,
        vals
      );
    } else {
      await client.query(
        `UPDATE borewells SET updated_at=$1 WHERE id=$2`,
        [new Date().toISOString(), id]
      );
    }

    if (b.layers !== undefined) {
      await client.query('DELETE FROM layers WHERE borewell_id=$1', [id]);
      for (let i = 0; i < (b.layers || []).length; i++) {
        const l = b.layers[i];
        await client.query(
          `INSERT INTO layers (id, borewell_id, start_depth, end_depth, material, color, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [l.id, id, l.startDepth, l.endDepth, l.material, l.color || '#78909C', i]
        );
      }
    }

    await client.query('COMMIT');

    const updated = await fetchBorewellWithLayers(pool, id);
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK').catch(e => console.error('Rollback failed:', e));
    console.error('PATCH error:', err);
    res.status(500).json({ error: 'Failed to patch borewell' });
  } finally {
    client.release();
  }
});

// DELETE /api/borewells/:id
app.delete('/api/borewells/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM borewells WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete borewell' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initSchema()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });