'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const path = require('node:path');

const {
  DataStore,
  INITIAL_BALANCE_CENTS,
  formatCurrency,
  parseAmount,
  performOperation,
} = require('../index');

const applicationPath = path.join(__dirname, '..', 'index.js');

function runApplication(input) {
  return execFileSync(process.execPath, [applicationPath], {
    input,
    encoding: 'utf8',
  });
}

test('TC-001: starts with the account management menu', () => {
  const output = runApplication('4\n');

  assert.match(output, /Account Management System/);
  assert.match(output, /1\. View Balance/);
  assert.match(output, /2\. Credit Account/);
  assert.match(output, /3\. Debit Account/);
  assert.match(output, /4\. Exit/);
});

test('TC-002: initializes the account at 1000.00', () => {
  const store = new DataStore();

  assert.equal(store.read(), INITIAL_BALANCE_CENTS);
  assert.equal(formatCurrency(store.read()), '1000.00');
});

test('TC-003: views the current balance', () => {
  const store = new DataStore();

  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 1000.00');
});

test('TC-004: credits a positive amount and persists it', () => {
  const store = new DataStore();

  assert.equal(performOperation('CREDIT', '250.00', store), 'Amount credited. New balance: 1250.00');
  assert.equal(store.read(), 125000);
});

test('TC-005: returns a credited balance on a later balance inquiry', () => {
  const store = new DataStore();
  performOperation('CREDIT', '250.00', store);

  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 1250.00');
});

test('TC-006: accepts a zero credit without changing the balance', () => {
  const store = new DataStore();

  assert.equal(performOperation('CREDIT', '0.00', store), 'Amount credited. New balance: 1000.00');
  assert.equal(store.read(), INITIAL_BALANCE_CENTS);
});

test('TC-007: applies multiple credits sequentially', () => {
  const store = new DataStore();
  performOperation('CREDIT', '100.00', store);
  performOperation('CREDIT', '50.25', store);

  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 1150.25');
});

test('TC-008: debits an amount below the current balance', () => {
  const store = new DataStore();

  assert.equal(performOperation('DEBIT', '275.50', store), 'Amount debited. New balance: 724.50');
  assert.equal(store.read(), 72450);
});

test('TC-009: permits a debit equal to the current balance', () => {
  const store = new DataStore();

  assert.equal(performOperation('DEBIT', '1000.00', store), 'Amount debited. New balance: 0.00');
  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 0.00');
});

test('TC-010: rejects a debit greater than the current balance', () => {
  const store = new DataStore();

  assert.equal(performOperation('DEBIT', '1000.01', store), 'Insufficient funds for this debit.');
  assert.equal(store.read(), INITIAL_BALANCE_CENTS);
});

test('TC-011: does not persist an unsuccessful debit', () => {
  const store = new DataStore();
  performOperation('DEBIT', '1500.00', store);

  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 1000.00');
});

test('TC-012: applies multiple debits sequentially', () => {
  const store = new DataStore();
  performOperation('DEBIT', '200.00', store);
  performOperation('DEBIT', '300.50', store);

  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 499.50');
});

test('TC-013: rejects a menu choice below the valid range', () => {
  const output = runApplication('0\n4\n');

  assert.match(output, /Invalid choice, please select 1-4\./);
});

test('TC-014: rejects a menu choice above the valid range', () => {
  const output = runApplication('5\n4\n');

  assert.match(output, /Invalid choice, please select 1-4\./);
});

test('TC-015: exits the application', () => {
  const output = runApplication('4\n');

  assert.match(output, /Exiting the program\. Goodbye!/);
});

test('TC-016: exits after a successful transaction', () => {
  const output = runApplication('2\n250.00\n4\n');

  assert.match(output, /Amount credited\. New balance: 1250\.00/);
  assert.match(output, /Exiting the program\. Goodbye!/);
});

test('TC-017: reads the stored balance through the data layer', () => {
  const store = new DataStore();

  assert.equal(store.read(), 100000);
});

test('TC-018: writes and then reads an updated balance', () => {
  const store = new DataStore();
  store.write(87525);

  assert.equal(store.read(), 87525);
  assert.equal(formatCurrency(store.read()), '875.25');
});

test('TC-019: ignores an unsupported operation without changing data', () => {
  const store = new DataStore();

  assert.equal(performOperation('UNKNOWN', undefined, store), null);
  assert.equal(store.read(), INITIAL_BALANCE_CENTS);
});

test('TC-020: supports a credit followed by a debit', () => {
  const store = new DataStore();
  performOperation('CREDIT', '500.00', store);

  assert.equal(performOperation('DEBIT', '125.75', store), 'Amount debited. New balance: 1374.25');
  assert.equal(performOperation('TOTAL', undefined, store), 'Current balance: 1374.25');
});

test('TC-021: preserves amounts with two decimal places', () => {
  const store = new DataStore();

  assert.equal(parseAmount('12.34'), 1234);
  assert.equal(performOperation('CREDIT', '12.34', store), 'Amount credited. New balance: 1012.34');
});

test('TC-022: rejects amounts above the COBOL numeric limit', () => {
  const store = new DataStore();

  assert.throws(() => performOperation('CREDIT', '1000000.00', store), {
    message: 'Amount must not exceed 999999.99.',
  });
  assert.equal(store.read(), INITIAL_BALANCE_CENTS);
});