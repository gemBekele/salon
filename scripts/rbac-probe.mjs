#!/usr/bin/env node
/**
 * RBAC probe matrix — logs in as every role and probes every sensitive
 * endpoint, then prints a role x endpoint table of HTTP codes.
 *
 * Usage: BASE=http://127.0.0.1:3000 node scripts/rbac-probe.mjs
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

const j = (o) => JSON.stringify(o);

async function login(email, password) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: j({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email} failed: ${r.status}`);
  return (await r.json()).token;
}

async function staffLogin() {
  const opts = await (await fetch(`${BASE}/api/auth/staff-login-options`)).json();
  const staff = (opts.companies ?? []).flatMap((g) => g.staff)[0];
  const r = await fetch(`${BASE}/api/auth/staff-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: j({ staffId: staff.id, pin: '7788' }),
  });
  if (!r.ok) throw new Error('staff login failed');
  const d = await r.json();
  return { token: d.token, staffId: staff.id };
}

const today = new Date().toISOString().slice(0, 10);

// [method, path, querystring, bodyBuilder(ctx) -> object|undefined]
const PROBES = [
  ['GET',    '/api/db-state',                              '',                () => undefined],
  ['GET',    '/api/db-state',                              'sections=users',  () => undefined],
  ['POST',   '/api/customers',                             '',                () => ({ companyId: 'cmp_gech_01', branchId: 'br_female_01', name: 'PROBE', phone: '+251900000001' })],
  ['PATCH',  '/api/visit-sessions/status',                 '',                () => ({ id: 'vs_probe', status: 'completed', companyId: 'cmp_gech_01' })],
  ['POST',   '/api/material-sales',                        '',                () => ({ companyId: 'cmp_gech_01', branchId: 'br_female_01', customerName: 'P', items: [] })],
  ['POST',   '/api/payments/checkout',                     '',                () => ({ payableType: 'visit', payableId: 'vs_probe', payments: [{ method: 'cash', amountEtb: 1 }] })],
  ['POST',   '/api/expenses',                              'probe=small',     () => ({ companyId: 'cmp_gech_01', branchId: 'br_female_01', category: 'other', amountEtb: 5, description: 'probe-small', paymentMethod: 'cash' })],
  ['POST',   '/api/expenses',                              'probe=huge',      () => ({ companyId: 'cmp_gech_01', branchId: 'br_female_01', category: 'rent', amountEtb: 99999999, description: 'probe-huge', paymentMethod: 'cash' })],
  ['PUT',    '/api/expenses/exp_probe',                    '',                () => ({ amountEtb: 1 })],
  ['DELETE', '/api/expenses/exp_probe',                    '',                () => undefined],
  ['POST',   '/api/users',                                 '',                (c) => ({ companyId: 'cmp_gech_01', name: 'P', email: `p-${c.n}@x.et`, password: 'Pass123!', role: c.forceRole || 'reception' })],
  ['GET',    '/api/reports/summary',                       '',                () => undefined],
  ['GET',    '/api/reports/summary',                       'from=2020-01-01&to=2020-01-02', () => undefined],
  ['GET',    '/api/reports/payment-summary',               'date=2020-01-01', () => undefined],
  ['GET',    '/api/reports/export/visits.csv',             '',                () => undefined],
  ['GET',    '/api/payments',                              '',                () => undefined],
  ['POST',   '/api/branches',                              '',                () => ({ companyId: 'cmp_gech_01', name: 'Probe Branch', city: 'Hawassa' })],
  ['POST',   '/api/inventory-items',                       '',                () => ({ companyId: 'cmp_gech_01', branchId: 'br_female_01', businessUnitId: 'bu_hair_f_01', name: 'Probe Item', sku: `PRB-${Math.floor(Math.random()*1e6)}`, unit: 'pcs', currentStock: 1, reorderLevel: 0, unitCostEtb: 1 })],
  ['POST',   '/api/inventory-items/adjust-stock',          '',                () => ({ id: 'inv_probe', adjustmentType: 'use', quantity: 1, companyId: 'cmp_gech_01' })],
  ['POST',   '/api/commission-rules',                      '',                () => ({ companyId: 'cmp_gech_01', targetType: 'staff', targetId: 'stf_x', targetName: 'x', type: 'percentage', value: 5 })],
  ['POST',   '/api/commission-logs/payout/batch',          '',                () => ({ companyId: 'cmp_gech_01', logIds: [] })],
  ['GET',    '/api/feedback',                              'companyId=cmp_gech_01', () => undefined],
  ['GET',    '/api/audit/export.csv',                      '',                () => undefined],
  ['POST',   '/api/gemini',                                '',                () => ({ prompt: 'hi' })],
  ['POST',   '/api/staff/verify-pin',                      '',                (c) => ({ staffId: c.staffId || 'stf_bereket_06', pin: '7788' })],
  ['POST',   `/api/staff/stf_bereket_06/reset-pin`,        '',                () => ({ newPin: '7788' })],
  ['GET',    '/api/public/tablet/catalog',                 'companyId=cmp_gech_01&branchId=br_mens_01', () => undefined],
];

const ROLES = [
  ['anon',      null],
  ['staff_pin', 'STAFF_PIN'],
  ['staff_pw',  ['bereket@gechsalon.et', 'Staff123!']],
  ['reception', ['liya@gechsalon.et', 'Staff123!']],
  ['manager',   ['admin@gechsalon.et', 'Manager123!']],
  ['owner',     ['owner@gechsalon.et', 'Owner123!']],
  ['super',     ['admin@serenity.et', 'Admin123!']],
];

const POLICY = {
  'GET    /api/db-state':                          { anon: 'D', staff_pin: 'A', staff_pw: 'A', reception: 'A', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/db-state sections=users':           { anon: 'D', staff_pin: 'A', staff_pw: 'A', reception: 'A', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/customers':                         { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'L', manager: 'L', owner: 'L', super: 'L' },
  'PATCH  /api/visit-sessions/status':             { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'E', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/material-sales':                    { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'E', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/payments/checkout':                 { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'E', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/expenses probe=small':                  { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'L', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/expenses probe=huge':                   { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'PUT    /api/expenses/:id':                      { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'E', owner: 'E', super: 'E' },
  'DELETE /api/expenses/:id':                      { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/users':                             { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'V', owner: 'V', super: 'A' },
  'GET    /api/reports/summary no-range':          { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'A', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/reports/summary old-range':         { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/reports/payment-summary old-date':  { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/reports/export/visits.csv':         { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/payments ledger-broad':             { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/branches':                          { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/inventory-items':                   { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/inventory-items/adjust-stock':      { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'E', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/commission-rules':                  { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/commission-logs/payout/batch':      { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'E', owner: 'E', super: 'E' },
  'GET    /api/feedback':                          { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/audit/export.csv':                  { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'POST   /api/gemini':                            { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/staff/verify-pin':                  { anon: 'D', staff_pin: 'E', staff_pw: 'E', reception: 'E', manager: 'E', owner: 'E', super: 'E' },
  'POST   /api/staff/:id/reset-pin':               { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D', manager: 'A', owner: 'A', super: 'A' },
  'GET    /api/public/tablet/catalog':             { anon: 'A', staff_pin: 'A', staff_pw: 'A', reception: 'A', manager: 'A', owner: 'A', super: 'A' },
};

async function probe(token, method, path, body, qs) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let url = `${BASE}${path}`;
  if (qs) url += `?${qs}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const r = await fetch(url, { method, headers, body: body === undefined ? undefined : j(body) });
    let text = '';
    try { text = (await r.text()).slice(0, 120); } catch {}
    return { code: r.status, text };
  } catch (e) {
    return { code: -1, text: String(e).slice(0, 80) };
  }
}

(async () => {
  const ctx = { n: Date.now() % 100000 };
  const tokens = { anon: null };
  for (const [name, cred] of ROLES) {
    if (cred === 'STAFF_PIN') {
      const s = await staffLogin();
      tokens[name] = s.token;
      ctx.staffId = s.staffId;
    } else if (Array.isArray(cred)) {
      tokens[name] = await login(cred[0], cred[1]);
    }
  }

  const LABELS = {
    '/api/db-state sections=users': 'GET    /api/db-state sections=users',

    '/api/reports/summary no-range': 'GET    /api/reports/summary no-range',
    '/api/reports/summary old-range': 'GET    /api/reports/summary old-range',
    '/api/reports/payment-summary old-date': 'GET    /api/reports/payment-summary old-date',
    '/api/payments ledger-broad': 'GET    /api/payments ledger-broad',
  };

  const results = {};
  const userRoleProbes = [
    ['', 'reception'],
    ['-mgr', 'manager->reception'],
    ['-own', 'owner->reception'],
    ['-msa', 'manager->super_admin'],
    ['-osa', 'owner->super_admin'],
    ['-ssa', 'super->super_admin'],
  ];
  for (const [method, rawPath, qs] of PROBES.map((x) => [x[0], x[1], x[2]])) {
    let key = `${method.padEnd(8)} ${rawPath}`;
    if (LABELS[key]) key = LABELS[key];
    results[key] = { _method: method, _path: rawPath, _qs: qs };
  }

  async function run(roleName, method, path, qs, body) {
    const headers = {};
    if (tokens[roleName]) headers.Authorization = `Bearer ${tokens[roleName]}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
    try {
      const r = await fetch(url, { method, headers, body: body === undefined ? undefined : j(body) });
      const text = (await r.text()).slice(0, 90);
      return { code: r.status, text };
    } catch (e) {
      return { code: -1, text: String(e).slice(0, 60) };
    }
  }

  // Users-role escalation probes get their own labeled rows
  const userRows = [];
  const userCases = [
    ['POST   /api/users as reception',        'reception'],
    ['POST   /api/users as manager->reception', 'manager'],
    ['POST   /api/users as owner->reception',   'owner'],
    ['POST   /api/users as manager->super_admin', 'manager'],
    ['POST   /api/users as owner->super_admin',   'owner'],
    ['POST   /api/users as super_admin',          'super'],
  ];

  for (const [key, meta] of Object.entries(results)) {
    const { _method: method, _path: path, _qs: qs } = meta;
    for (const [role] of ROLES) {
      ctx.n++;
      let body;
      if (path === '/api/users') continue; // handled separately below
      const entry = PROBES.find(([m, p, q]) => m === method && p === path && (q || '') === (qs || ''));
      body = entry && entry[3] ? entry[3](ctx) : undefined;
      if (body && typeof body === 'object' && body.email) body.email = body.email.replace('@', `-${role}-${ctx.n % 9973}@`);
      results[key][role] = await run(role, method, path, qs, body);
    }
  }

  for (const [label, actorRole] of userCases) {
    results[label] = {};
    const targetRole = label.includes('super_admin') ? 'super_admin' : 'reception';
    for (const [role] of ROLES) {
      ctx.n++;
      const body = { companyId: 'cmp_gech_01', name: 'P', email: `p-${ctx.n}@x.et`, password: 'Pass123!', role: targetRole };
      const effectiveActor = role; // probe as every role; expectation checked on matching actor
      results[label][role] = await run(role, 'POST', '/api/users', '', body);
    }
    results[label]._expect = { anon: 'D', staff_pin: 'D', staff_pw: 'D', reception: 'D',
      manager: targetRole === 'reception' ? 'A' : 'D',
      owner: targetRole === 'reception' ? 'A' : 'D',
      super: 'A' };
  }

  const roleNames = ROLES.map(([n]) => n);
  console.log('\nRBAC PROBE MATRIX (HTTP codes)\n');
  console.log('probe'.padEnd(46) + roleNames.map((r) => r.padStart(10)).join(''));
  console.log('-'.repeat(46 + 10 * roleNames.length));
  let flagged = 0;
  for (const [key, byRole] of Object.entries(results)) {
    if (key.startsWith('_')) continue;
    const pol = POLICY[key] || byRole._expect || {};
    const line = key.slice(0, 45).padEnd(46) + roleNames.map((r) => String(byRole[r]?.code ?? '-').padStart(10)).join('');
    const flags = [];
    for (const [role, expect] of Object.entries(pol)) {
      if (!['D','A','E','L','V'].includes(expect)) continue;
      const code = byRole[role]?.code ?? -1;
      const ok2xx = code >= 200 && code < 300;
      const denied = code === 401 || code === 403;
      if (expect === 'D' && !denied) flags.push(`${role}:deny-got-${code}`);
      if ((expect === 'A' || expect === 'V') && !ok2xx) flags.push(`${role}:ok-got-${code}`);
      if (expect === 'L' && !(ok2xx || denied)) flags.push(`${role}:limit-got-${code}`);
      // E = any 4xx reached-after-auth (business-rule rejection acceptable)
      if (expect === 'E' && !(denied || (code >= 400 && code < 500))) flags.push(`${role}:err-got-${code}`);
    }
    const flagStr = flags.length > 0 ? `  << ${flags.join(', ')}` : '';
    if (flags.length) flagged++;
    console.log(line + flagStr);
  }

  console.log('\nSECTIONS=USERS CONTENT CHECK');
  for (const [role] of ROLES) {
    if (!tokens[role]) continue;
    const r = await fetch(`${BASE}/api/db-state?sections=users`, { headers: { Authorization: `Bearer ${tokens[role]}` } });
    const d = await r.json().catch(() => ({}));
    const leak = Array.isArray(d.users) && d.users.length > 0;
    console.log(`  ${role.padEnd(10)} users=${leak ? `LEAK(${d.users.length})` : 'clean'}`);
  }

  console.log(`\n${flagged === 0 ? 'ALL PROBES MATCH POLICY' : flagged + ' PROBE(S) DEVIATE FROM POLICY — SEE FLAGS ABOVE'}`);
})().catch((e) => { console.error(e); process.exit(1); });
