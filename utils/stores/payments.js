const crypto = require('crypto');
const { createStore } = require('../jsonStore');

const store = createStore('payments.json', []);

/** Appends a payment record. Default status is paid, but admins can also store pending USDT requests. */
function recordPayment(payment) {
  const payments = store.read();
  const record = {
    paymentId: `PAY${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    date: new Date().toISOString(),
    status: 'paid',
    ...payment
  };
  payments.push(record);
  store.write(payments);
  return record;
}

function getPayment(paymentId) {
  if (!paymentId) return null;
  return store.read().find((p) => String(p.paymentId) === String(paymentId)) || null;
}

function updatePayment(paymentId, patch) {
  const payments = store.read();
  const idx = payments.findIndex((p) => String(p.paymentId) === String(paymentId));
  if (idx === -1) return null;
  payments[idx] = { ...payments[idx], ...patch };
  store.write(payments);
  return payments[idx];
}

function listPayments(telegramId) {
  const payments = store.read();
  return telegramId ? payments.filter((p) => String(p.telegramId) === String(telegramId)) : payments;
}

module.exports = { recordPayment, listPayments, getPayment, updatePayment };
