import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentReturnCopy, terminalPaymentAttempt } from '../src/utils/paymentPresentation.ts';

const order = (attempt, extra = {}) => ({ payment_status: 'unpaid', order_status: 'confirmed', payment_attempt_status: attempt, can_retry_payment: true, ...extra });
test('DECLINED differs from PENDING even with a started attempt and exhausted polling', () => {
  assert.equal(paymentReturnCopy(order('DECLINED'), true, true).title, 'Pago rechazado');
  assert.equal(terminalPaymentAttempt(order('DECLINED')), true);
  assert.equal(paymentReturnCopy(order('PENDING'), true, false).tone, 'pending');
  assert.equal(terminalPaymentAttempt(order('PENDING')), false);
  assert.equal(paymentReturnCopy(order('PENDING'), true, true).tone, 'pending');
});
test('financial paid does not assert operational completion', () => {
  const copy = paymentReturnCopy(order('APPROVED', { payment_status: 'paid' }), true, true);
  assert.equal(copy.title, 'Pago confirmado');
  assert.ok(copy.message.includes('no significa que la entrega haya terminado'));
});
test('error and unknown never claim rejected or approved; refund and cancellation are separate', () => {
  for (const status of ['ERROR', 'UNKNOWN']) assert.equal(paymentReturnCopy(order(status), false, true).title, 'No pudimos confirmar el resultado');
  assert.equal(paymentReturnCopy(order('VOIDED', { payment_status: 'refunded' }), false, false).title, 'Pago devuelto');
  assert.equal(paymentReturnCopy(order('DECLINED', { order_status: 'cancelled' }), false, false).title, 'Orden cancelada');
});
test('decline explains retry eligibility and retry same order; can_retry alone is not decline', () => {
  assert.ok(paymentReturnCopy(order('DECLINED'), false, false).message.includes('esta misma orden'));
  assert.ok(paymentReturnCopy(order('DECLINED', { can_retry_payment: false }), false, false).message.includes('no está habilitada'));
  assert.equal(paymentReturnCopy(order(null), false, false).tone, 'pending');
});
