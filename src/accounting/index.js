'use strict';

const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;

class DataStore {
  constructor(initialBalanceCents = INITIAL_BALANCE_CENTS) {
    this.balanceCents = initialBalanceCents;
  }

  read() {
    return this.balanceCents;
  }

  write(balanceCents) {
    this.balanceCents = balanceCents;
  }
}

function formatCurrency(balanceCents) {
  return (balanceCents / 100).toFixed(2);
}

function parseAmount(input) {
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be a non-negative number.');
  }

  const amountCents = Math.round(amount * 100);
  if (amountCents > 99999999) {
    throw new Error('Amount must not exceed 999999.99.');
  }

  return amountCents;
}

function performOperation(operation, amountInput, dataStore) {
  if (operation === 'TOTAL') {
    return `Current balance: ${formatCurrency(dataStore.read())}`;
  }

  if (operation !== 'CREDIT' && operation !== 'DEBIT') {
    return null;
  }

  const amountCents = parseAmount(amountInput);
  const currentBalanceCents = dataStore.read();

  if (operation === 'CREDIT') {
    const newBalanceCents = currentBalanceCents + amountCents;
    dataStore.write(newBalanceCents);
    return `Amount credited. New balance: ${formatCurrency(newBalanceCents)}`;
  }

  if (currentBalanceCents < amountCents) {
    return 'Insufficient funds for this debit.';
  }

  const newBalanceCents = currentBalanceCents - amountCents;
  dataStore.write(newBalanceCents);
  return `Amount debited. New balance: ${formatCurrency(newBalanceCents)}`;
}

function displayMenu(output) {
  output('--------------------------------');
  output('Account Management System');
  output('1. View Balance');
  output('2. Credit Account');
  output('3. Debit Account');
  output('4. Exit');
  output('--------------------------------');
}

function startApplication(input = process.stdin, output = console.log) {
  const dataStore = new DataStore();
  const readlineInterface = readline.createInterface({ input, output: process.stdout });

  const askForChoice = () => {
    displayMenu(output);
    readlineInterface.question('Enter your choice (1-4): ', (choice) => {
      if (choice === '1') {
        output(performOperation('TOTAL', undefined, dataStore));
        askForChoice();
      } else if (choice === '2' || choice === '3') {
        const operation = choice === '2' ? 'CREDIT' : 'DEBIT';
        readlineInterface.question(choice === '2' ? 'Enter credit amount: ' : 'Enter debit amount: ', (amount) => {
          try {
            output(performOperation(operation, amount, dataStore));
          } catch (error) {
            output(error.message);
          }
          askForChoice();
        });
      } else if (choice === '4') {
        readlineInterface.close();
        output('Exiting the program. Goodbye!');
      } else {
        output('Invalid choice, please select 1-4.');
        askForChoice();
      }
    });
  };

  askForChoice();
}

if (require.main === module) {
  startApplication();
}

module.exports = {
  DataStore,
  INITIAL_BALANCE_CENTS,
  formatCurrency,
  parseAmount,
  performOperation,
  startApplication,
};