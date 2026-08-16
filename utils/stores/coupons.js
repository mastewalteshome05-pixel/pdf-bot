const { createStore } = require('../jsonStore');

const store = createStore('coupons.json', { coupons: [] });

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '-');
}

function listCoupons() {
  const data = store.read();
  return Array.isArray(data.coupons) ? data.coupons : [];
}

function addCoupon(input = {}) {
  const coupon = {
    code: normalizeCode(input.code),
    label: String(input.label || '').trim(),
    type: input.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(input.value) || 0,
    maxUses: Number(input.maxUses) || 0,
    used: Number(input.used) || 0,
    active: input.active !== false,
    expiresAt: input.expiresAt || null,
    createdAt: input.createdAt || new Date().toISOString()
  };

  const coupons = listCoupons();
  const index = coupons.findIndex((c) => c.code === coupon.code);
  if (index >= 0) coupons[index] = { ...coupons[index], ...coupon };
  else coupons.unshift(coupon);
  store.write({ coupons });
  return coupon;
}

function deleteCoupon(code) {
  const couponCode = normalizeCode(code);
  const coupons = listCoupons().filter((c) => c.code !== couponCode);
  store.write({ coupons });
  return coupons;
}

function toggleCoupon(code) {
  const couponCode = normalizeCode(code);
  const coupons = listCoupons().map((c) => (c.code === couponCode ? { ...c, active: !c.active } : c));
  store.write({ coupons });
  return coupons.find((c) => c.code === couponCode) || null;
}

module.exports = { listCoupons, addCoupon, deleteCoupon, toggleCoupon, normalizeCode };
