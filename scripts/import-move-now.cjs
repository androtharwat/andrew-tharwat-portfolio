// Keep exports and server credentials outside source control.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = require('../config.js');
const columns = {
  leads: ['id','name','phone','service','details','status','assigned','notes','next_followup','created_at','updated_at'],
  admins: ['email','name','created_at']
};
async function main() {
  const [mode, filename] = process.argv.slice(2);
  if (!['--check-file','--verify','--apply'].includes(mode) || !filename) throw Error('Usage: node scripts/import-move-now.cjs --check-file|--verify|--apply <private-export.json>');
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  for (const [name, keys] of Object.entries(columns)) {
    assert.ok(Array.isArray(data[name]), 'Export must include both leads and admins arrays');
    const ids = new Set();
    for (const row of data[name]) {
      assert.deepEqual(Object.keys(row).sort(), [...keys].sort(), 'Export is incomplete or contains unexpected columns');
      const id = row[keys[0]];
      assert.ok(typeof id === 'string' && id && !ids.has(id), 'Duplicate or missing identifier');
      ids.add(id);
      for (const key of keys) assert.equal(typeof row[key], key.endsWith('_at') ? 'number' : 'string', 'Invalid field type');
      if (name === 'leads') assert.ok(JSON.parse(row.details) && typeof JSON.parse(row.details) === 'object', 'Invalid lead details');
    }
  }
  if (mode === '--check-file') return console.log(JSON.stringify({valid:true,leads:data.leads.length,admins:data.admins.length}));
  const url = process.env.SUPABASE_URL || config.supabaseUrl;
  assert.equal(url.replace(/\/$/,''), config.supabaseUrl, 'Destination must be the existing ATS database');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(key, 'SUPABASE_SERVICE_ROLE_KEY is required');
  async function rest(table, method = 'GET', rows) {
    const response = await fetch(url+'/rest/v1/move_now_'+table+(method === 'GET' ? '?select=*' : ''), {
      method, headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},
      ...(rows ? {body:JSON.stringify(rows)} : {})
    });
    if (!response.ok) throw Error('Destination request failed ('+response.status+')');
    return method === 'GET' ? response.json() : undefined;
  }
  // Check every table before inserting. Never replace an existing differing record.
  for (const name of Object.keys(columns)) {
    const idKey = columns[name][0];
    for (const row of data[name]) {
      const response = await fetch(url+'/rest/v1/move_now_'+name+'?'+new URLSearchParams({[idKey]:'eq.'+row[idKey],select:'*'}), {headers:{apikey:key,Authorization:'Bearer '+key}});
      if (!response.ok) throw Error('Destination read failed ('+response.status+')');
      const existing = await response.json();
      if (existing.length) assert.deepEqual(existing[0],row,'Destination contains a differing source record; reconcile before importing');
      else if (mode === '--verify') throw Error('A source record is missing from the destination');
    }
  }
  if (mode === '--apply') {
    for (const name of ['admins','leads']) if(data[name].length) await rest(name,'POST',data[name]);
    // Re-read each imported row, including original notes, assignments and timestamps.
    for (const name of Object.keys(columns)) {
      const idKey=columns[name][0];
      for (const row of data[name]) {
        const response=await fetch(url+'/rest/v1/move_now_'+name+'?'+new URLSearchParams({[idKey]:'eq.'+row[idKey],select:'*'}), {headers:{apikey:key,Authorization:'Bearer '+key}});
        if(!response.ok)throw Error('Import verification read failed ('+response.status+')');
        assert.deepEqual((await response.json())[0],row,'Imported record differs from source');
      }
    }
  }
  console.log(JSON.stringify({verified:true,leads:data.leads.length,admins:data.admins.length}));
}
main().catch(error=>{ console.error(error.message);process.exitCode=1; });
