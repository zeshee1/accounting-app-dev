const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Show Dashboard
router.get('/dashboard', expenseController.showDashboard);

// Show Add Expense Form
router.get('/expense', expenseController.showAddExpenseForm);

// Save New Expense
router.post('/expense', expenseController.saveExpense);

// Show Edit Expense Form
router.get('/expense/edit/:id', expenseController.showEditExpenseForm);

// Update Expense
router.post('/expense/edit/:id', expenseController.updateExpense);

// Delete Expense
router.get('/expense/delete/:id', expenseController.deleteExpense);

module.exports = router;
