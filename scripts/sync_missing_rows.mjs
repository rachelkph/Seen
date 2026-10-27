const PROD_ID = 'hsuydsuebluhycdeqghv';
const DEV_ID = 'snrzwaqdhkqsnuwphxnz';
// Supabase personal access token: never hard-code it. Run with
//   SUPABASE_ACCESS_TOKEN=... node scripts/sync_missing_rows.mjs
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) throw new Error('Set SUPABASE_ACCESS_TOKEN (Supabase → Account → Access Tokens).');
const API = 'https://api.supabase.com/v1/projects';
const BATCH_SIZE = 20;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function dbQuery(projectId, query, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${API}/${projectId}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (res.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 2000;
      console.log(`    Rate limited, waiting ${wait/1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DB query failed (${res.status}): ${text}\nQuery snippet: ${query.substring(0, 300)}`);
    }
    return res.json();
  }
  throw new Error('Max retries exceeded due to rate limiting');
}

async function getColumns(table) {
  const rows = await dbQuery(PROD_ID,
    `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' ORDER BY ordinal_position`
  );
  return rows;
}

function formatValue(val, colInfo) {
  if (val === null || val === undefined) return 'NULL';

  const { data_type, udt_name } = colInfo;

  if (data_type === 'ARRAY') {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        if (udt_name === '_uuid') return "'{}'::uuid[]";
        if (udt_name === '_int4') return "'{}'::int[]";
        if (udt_name === '_int8') return "'{}'::bigint[]";
        return "'{}'::text[]";
      }
      const elements = val.map(v => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
      if (udt_name === '_uuid') return `'{${elements}}'::uuid[]`;
      if (udt_name === '_int4') return `'{${elements}}'::int[]`;
      if (udt_name === '_int8') return `'{${elements}}'::bigint[]`;
      return `'{${elements}}'::text[]`;
    }
    return `'${String(val).replace(/'/g, "''")}'`;
  }

  if (data_type === 'jsonb' || data_type === 'json') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }

  if (data_type === 'boolean') return val ? 'TRUE' : 'FALSE';

  if (['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision'].includes(data_type)) {
    return String(val);
  }

  const strVal = String(val).replace(/'/g, "''");
  return `'${strVal}'`;
}

async function insertBatch(table, columns, colMap, batch, batchNum, total) {
  const quotedCols = columns.map(c => `"${c}"`).join(', ');
  const valueRows = batch.map(row => {
    const vals = columns.map(col => formatValue(row[col], colMap[col]));
    return `(${vals.join(', ')})`;
  });
  const sql = `SET session_replication_role = replica;\nINSERT INTO public."${table}" (${quotedCols}) VALUES\n${valueRows.join(',\n')}\nON CONFLICT (id) DO NOTHING;\nSET session_replication_role = DEFAULT;`;

  try {
    await dbQuery(DEV_ID, sql);
    console.log(`  Batch ${batchNum}/${total} OK`);
  } catch (err) {
    console.error(`  ERROR batch ${batchNum}: ${err.message.substring(0, 200)}`);
    console.log(`  Retrying row-by-row...`);
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const vals = columns.map(col => formatValue(row[col], colMap[col]));
      const singleSql = `SET session_replication_role = replica;\nINSERT INTO public."${table}" (${quotedCols}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO NOTHING;\nSET session_replication_role = DEFAULT;`;
      try {
        await dbQuery(DEV_ID, singleSql);
      } catch (rowErr) {
        console.error(`    Row id=${row.id ?? j} failed: ${rowErr.message.substring(0, 150)}`);
      }
      await sleep(300);
    }
  }
  await sleep(1200);
}

// ─── CONTENT SYNC ────────────────────────────────────────────────────────────

async function syncContent() {
  console.log('\n=== STEP 1: Sync missing content rows ===');

  const missingIds = [75,86,97,103,108,117,126,130,132,143,153,162,167,176,180,194,196,229,240,247,249,265,282,283,297,300,309,508,509,511,512,513,514,515,516,517,518,520,521,522,523,524,525,526,527,528,529,530,531,532,533,534,574,575,576,577,578,579,580,581,582,609,610,611,612,613,614,615,636,637,638,639,640,657,658,659,660,661,880,881,882,883,884,885,886,887,888,890,896,897,898,899,901,902,904,906,907,912,913,918,919,920,921,922,923,1094,1095,1122,1124,1125,1126,1127,1128,1129,1130,1131,1132,1133,1134,1135,1136,1137,1138,1139,1140,1141,1142,1143,1144,1145,1146,1147,1148,1149,1150,1151,1152,1153,1154,1155];

  const cols = ['id','tmdb_id','content_type','title','poster_url','backdrop_url','release_year','runtime_minutes','director','total_seasons','total_episodes','genres','synopsis','popularity_score','collection_id','collection_name','created_at','episode_runtime','lead_actor'];

  // Get column metadata
  const columns = await getColumns('content');
  const colMap = {};
  columns.forEach(c => { colMap[c.column_name] = c; });

  // Fetch data in chunks of 40 IDs to avoid large queries
  const FETCH_CHUNK = 40;
  let allRows = [];
  for (let i = 0; i < missingIds.length; i += FETCH_CHUNK) {
    const chunk = missingIds.slice(i, i + FETCH_CHUNK);
    console.log(`  Fetching ids ${chunk[0]}..${chunk[chunk.length-1]} from prod...`);
    const result = await dbQuery(PROD_ID,
      `SELECT ${cols.join(',')} FROM content WHERE id IN (${chunk.join(',')}) ORDER BY id`
    );
    allRows = allRows.concat(result);
    await sleep(500);
  }
  console.log(`  Total rows fetched: ${allRows.length}`);

  // Insert in batches
  const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await insertBatch('content', cols, colMap, batch, Math.floor(i/BATCH_SIZE)+1, totalBatches);
  }

  // Verify
  const countResult = await dbQuery(DEV_ID, 'SELECT COUNT(*) as cnt FROM content');
  console.log(`  Dev content count after sync: ${countResult[0].cnt}`);

  // Reset sequence
  await dbQuery(DEV_ID, `SELECT setval(pg_get_serial_sequence('content', 'id'), (SELECT COALESCE(MAX(id), 1) FROM content));`);
  console.log('  Sequence reset OK');
}

// ─── MOVIES SYNC ─────────────────────────────────────────────────────────────

async function syncMovies() {
  console.log('\n=== STEP 2: Sync missing movies rows ===');

  // Get schema
  const columns = await getColumns('movies');
  const colNames = columns.map(c => c.column_name);
  const colMap = {};
  columns.forEach(c => { colMap[c.column_name] = c; });
  console.log(`  movies columns: ${colNames.join(', ')}`);

  // Find missing IDs
  const prodIds = await dbQuery(PROD_ID, 'SELECT id FROM movies ORDER BY id');
  const devIds = await dbQuery(DEV_ID, 'SELECT id FROM movies ORDER BY id');
  const devSet = new Set(devIds.map(r => r.id));
  const missing = prodIds.map(r => r.id).filter(id => !devSet.has(id));
  console.log(`  Missing movies IDs: ${missing.length}`);
  if (missing.length === 0) { console.log('  Nothing to sync.'); return; }

  // Fetch missing rows in chunks
  const FETCH_CHUNK = 40;
  let allRows = [];
  for (let i = 0; i < missing.length; i += FETCH_CHUNK) {
    const chunk = missing.slice(i, i + FETCH_CHUNK);
    console.log(`  Fetching movies ids ${chunk[0]}..${chunk[chunk.length-1]}...`);
    const result = await dbQuery(PROD_ID,
      `SELECT ${colNames.map(c => `"${c}"`).join(',')} FROM movies WHERE id IN (${chunk.join(',')}) ORDER BY id`
    );
    allRows = allRows.concat(result);
    await sleep(500);
  }
  console.log(`  Total movies rows fetched: ${allRows.length}`);

  // Insert
  const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await insertBatch('movies', colNames, colMap, batch, Math.floor(i/BATCH_SIZE)+1, totalBatches);
  }

  const countResult = await dbQuery(DEV_ID, 'SELECT COUNT(*) as cnt FROM movies');
  console.log(`  Dev movies count after sync: ${countResult[0].cnt}`);

  await dbQuery(DEV_ID, `SELECT setval(pg_get_serial_sequence('movies', 'id'), (SELECT COALESCE(MAX(id), 1) FROM movies));`);
  console.log('  Sequence reset OK');
}

// ─── ACTIVITY_LOG SYNC ───────────────────────────────────────────────────────

async function syncActivityLog() {
  console.log('\n=== STEP 3: Sync activity_log (TRUNCATE + re-insert all) ===');

  const columns = await getColumns('activity_log');
  const colNames = columns.map(c => c.column_name);
  const colMap = {};
  columns.forEach(c => { colMap[c.column_name] = c; });
  console.log(`  activity_log columns: ${colNames.join(', ')}`);

  // Truncate dev
  await dbQuery(DEV_ID, 'SET session_replication_role = replica; TRUNCATE public.activity_log; SET session_replication_role = DEFAULT;');
  console.log('  Truncated dev activity_log');

  // Get total count from prod
  const countRes = await dbQuery(PROD_ID, 'SELECT COUNT(*) as cnt FROM activity_log');
  const total = parseInt(countRes[0].cnt);
  console.log(`  Prod activity_log rows: ${total}`);

  // Fetch in pages
  const PAGE = 200;
  let offset = 0;
  let inserted = 0;
  while (offset < total) {
    console.log(`  Fetching rows ${offset+1}-${Math.min(offset+PAGE, total)}...`);
    const rows = await dbQuery(PROD_ID,
      `SELECT ${colNames.map(c => `"${c}"`).join(',')} FROM activity_log ORDER BY id LIMIT ${PAGE} OFFSET ${offset}`
    );
    if (rows.length === 0) break;

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await insertBatch('activity_log', colNames, colMap, batch, Math.floor(i/BATCH_SIZE)+1, totalBatches);
    }
    inserted += rows.length;
    offset += PAGE;
    await sleep(500);
  }

  const countResult = await dbQuery(DEV_ID, 'SELECT COUNT(*) as cnt FROM activity_log');
  console.log(`  Dev activity_log count after sync: ${countResult[0].cnt} (expected ${total})`);
}

// ─── RANKINGS SYNC ───────────────────────────────────────────────────────────

async function syncRankings() {
  console.log('\n=== STEP 4: Sync rankings (TRUNCATE + re-insert all) ===');

  const columns = await getColumns('rankings');
  const colNames = columns.map(c => c.column_name);
  const colMap = {};
  columns.forEach(c => { colMap[c.column_name] = c; });
  console.log(`  rankings columns: ${colNames.join(', ')}`);

  // Truncate dev
  await dbQuery(DEV_ID, 'SET session_replication_role = replica; TRUNCATE public.rankings; SET session_replication_role = DEFAULT;');
  console.log('  Truncated dev rankings');

  // Get total
  const countRes = await dbQuery(PROD_ID, 'SELECT COUNT(*) as cnt FROM rankings');
  const total = parseInt(countRes[0].cnt);
  console.log(`  Prod rankings rows: ${total}`);

  // Fetch in pages
  const PAGE = 200;
  let offset = 0;
  while (offset < total) {
    console.log(`  Fetching rows ${offset+1}-${Math.min(offset+PAGE, total)}...`);
    const rows = await dbQuery(PROD_ID,
      `SELECT ${colNames.map(c => `"${c}"`).join(',')} FROM rankings ORDER BY id LIMIT ${PAGE} OFFSET ${offset}`
    );
    if (rows.length === 0) break;

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await insertBatch('rankings', colNames, colMap, batch, Math.floor(i/BATCH_SIZE)+1, totalBatches);
    }
    offset += PAGE;
    await sleep(500);
  }

  const countResult = await dbQuery(DEV_ID, 'SELECT COUNT(*) as cnt FROM rankings');
  console.log(`  Dev rankings count after sync: ${countResult[0].cnt} (expected ${total})`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seen: Prod -> Dev Sync (missing rows) ===\n');

  try { await syncContent(); } catch (e) { console.error('content FAILED:', e.message); }
  try { await syncMovies(); } catch (e) { console.error('movies FAILED:', e.message); }
  try { await syncActivityLog(); } catch (e) { console.error('activity_log FAILED:', e.message); }
  try { await syncRankings(); } catch (e) { console.error('rankings FAILED:', e.message); }

  console.log('\n=== Sync complete ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
