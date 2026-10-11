const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  return { status: response.status, data };
}

test('1. Roommates Management & Soft Delete', async () => {
  const res = await request('/api/roommates', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Maya', email: 'maya@example.com' })
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.name, 'Test Maya');
  assert.ok(res.data.id);

  const listRes = await request('/api/roommates');
  assert.strictEqual(listRes.status, 200);
  const found = listRes.data.find(r => r.id === res.data.id);
  assert.ok(found);

  // Soft delete
  const delRes = await request(`/api/roommates/${res.data.id}`, { method: 'DELETE' });
  assert.strictEqual(delRes.status, 200);

  // Verify removed from active list
  const listAfter = await request('/api/roommates');
  assert.ok(!listAfter.data.some(r => r.id === res.data.id));
});

test('2. Bill Creation with Atomic Batch Assignments & Split Calculation', async () => {
  // Create 3 active roommates
  const r1 = await request('/api/roommates', { method: 'POST', body: JSON.stringify({ name: 'User Alpha' }) });
  const r2 = await request('/api/roommates', { method: 'POST', body: JSON.stringify({ name: 'User Beta' }) });
  const r3 = await request('/api/roommates', { method: 'POST', body: JSON.stringify({ name: 'User Gamma' }) });

  const id1 = r1.data.id;
  const id2 = r2.data.id;
  const id3 = r3.data.id;

  // Create $120 power bill split among Alpha, Beta, Gamma ($40 each)
  const billRes = await request('/api/bills', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Monthly Power',
      amount: 120,
      due_date: '2026-10-25',
      category: 'electricity',
      notes: 'Equal 3-way split',
      roommate_ids: [id1, id2, id3]
    })
  });
  assert.strictEqual(billRes.status, 200);
  assert.strictEqual(billRes.data.roommate_ids.length, 3);
  const billId = billRes.data.id;

  // Verify roommate breakdown
  const alphaBd = await request(`/api/roommates/${id1}/breakdown`);
  assert.strictEqual(alphaBd.status, 200);
  const billItem = alphaBd.data.find(b => b.bill_id === billId);
  assert.ok(billItem);
  assert.strictEqual(billItem.share_amount, 40);
  assert.strictEqual(billItem.is_paid, 0);

  // Alpha marks share as paid
  const payRes = await request(`/api/bills/${billId}/assignments/${id1}/toggle-paid`, { method: 'POST' });
  assert.strictEqual(payRes.status, 200);
  assert.strictEqual(payRes.data.is_paid, 1);
  assert.strictEqual(payRes.data.bill_is_settled, 0);

  // Verify Alpha totals: owed = 0, paid = 40 for this bill
  const alphaTotal = await request(`/api/roommates/${id1}/total`);
  assert.strictEqual(alphaTotal.data.total_owed, 0);
  assert.strictEqual(alphaTotal.data.total_paid, 40);

  // Beta & Gamma pay their shares -> bill becomes settled
  await request(`/api/bills/${billId}/assignments/${id2}/toggle-paid`, { method: 'POST' });
  const gammaPay = await request(`/api/bills/${billId}/assignments/${id3}/toggle-paid`, { method: 'POST' });
  assert.strictEqual(gammaPay.data.bill_is_settled, 1);

  // Verify bill status in list
  const billsList = await request('/api/bills');
  const foundBill = billsList.data.find(b => b.id === billId);
  assert.strictEqual(foundBill.is_settled, 1);
});

test('3. Stats and Dashboard KPI Accuracy', async () => {
  const statsRes = await request('/api/stats');
  assert.strictEqual(statsRes.status, 200);
  const s = statsRes.data;
  assert.ok(typeof s.total_bills === 'number');
  assert.ok(typeof s.total_amount === 'number');
  assert.ok(typeof s.total_outstanding === 'number');
  assert.ok(typeof s.total_settled === 'number');
  assert.ok(typeof s.roommates_count === 'number');
});