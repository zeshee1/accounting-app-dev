const fs = require('fs');
const path = require('path');

// JSON file ka path
const expensesFilePath = path.join(__dirname, '../data/expenses.json');

// Helper function to read expenses
function readExpenses() {
  if (!fs.existsSync(expensesFilePath)) {
    fs.writeFileSync(expensesFilePath, '[]');
  }
  const data = fs.readFileSync(expensesFilePath);
  return JSON.parse(data);
}

// Helper function to write expenses
function writeExpenses(expenses) {
  fs.writeFileSync(expensesFilePath, JSON.stringify(expenses, null, 2));
}

// Show Dashboard
exports.showDashboard = (req, res) => {
  const expenses = readExpenses();

  let totalSales = 0; // آپ اپنی sales کا الگ logic لگا سکتے ہیں
  let totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  let cashInHand = totalSales - totalExpenses;

  res.render('dashboard', { totalSales, totalExpenses, cashInHand, expenses });
};

// Show Add Expense Form
exports.showAddExpenseForm = (req, res) => {
  res.render('add-expense');
};

// Save New Expense
exports.saveExpense = (req, res) => {
  const { name, amount } = req.body;
  const expenses = readExpenses();

  const newExpense = {
    id: Date.now().toString(), // unique id
    name,
    amount: parseFloat(amount),
    date: new Date().toISOString().slice(0, 10) // current date
  };

  expenses.push(newExpense);
  writeExpenses(expenses);

  res.redirect('/dashboard');
};

// Show Edit Form
exports.showEditExpenseForm = (req, res) => {
  const expenseId = req.params.id;
  const expenses = readExpenses();
  const expense = expenses.find(exp => exp.id === expenseId);

  if (!expense) {
    return res.status(404).send('Expense not found');
  }

  res.render('edit-expense', { expense });
};

// Update Expense
exports.updateExpense = (req, res) => {
  const expenseId = req.params.id;
  const { name, amount } = req.body;
  const expenses = readExpenses();

  const index = expenses.findIndex(exp => exp.id === expenseId);
  if (index === -1) {
    return res.status(404).send('Expense not found');
  }

  expenses[index].name = name;
  expenses[index].amount = parseFloat(amount);

  writeExpenses(expenses);

  res.redirect('/dashboard');
};

// Delete Expense
exports.deleteExpense = (req, res) => {
  const expenseId = req.params.id;
  let expenses = readExpenses();

  expenses = expenses.filter(exp => exp.id !== expenseId);
  writeExpenses(expenses);

  res.redirect('/dashboard');
};
