// salary.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const workersPath = path.join(__dirname, '../data/worker.json');
const transactionsPath = path.join(__dirname, '../data/transaction.json');

function loadJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET salary page
router.get('/', (req, res) => {
    const workers = loadJSON(workersPath);
    res.render('salary', { employees: workers });
});

// View specific employee with transaction calculation
router.get('/view/:name', (req, res) => {
    const workers = loadJSON(workersPath);
    const transactions = loadJSON(transactionsPath);
    const employee = workers.find(w => w.name === req.params.name);
    if (!employee) {
        return res.status(404).send('Employee not found');
    }

    const employeeTransactions = transactions.filter(t => t.workerName === employee.name);

    // Initial balance should start from 0 for transaction calculation.
    // The monthly salary is a separate piece of info, not part of the running transaction balance.
    let currentBalance = 0;

    // Calculate total credit and debit to get the final balance for display
    employeeTransactions.forEach(t => {
        if (t.type === 'credit') {
            currentBalance += t.amount;
        } else if (t.type === 'debit') {
            currentBalance -= t.amount;
        }
    });

    // Pass employee data including new fields and the calculated currentBalance to the view
    res.render('view-employee', {
        employee: {
            ...employee, // Spread existing employee properties
            balance: currentBalance // Add the calculated balance based ONLY on transactions
        },
        transactions: employeeTransactions
    });
});

// Add New Employee
router.post('/add-employee', (req, res) => {
    const { name, salary, phone, designation } = req.body;
    const workers = loadJSON(workersPath);

    // Check for duplicate employee name
    if (workers.some(worker => worker.name === name)) {
        return res.status(400).send('Employee with this name already exists.');
    }

    // Add new fields to the employee object
    workers.push({ name, salary: parseInt(salary), phone: phone || '', designation: designation || '' });
    saveJSON(workersPath, workers);
    res.redirect('/salary');
});

// Add Transaction
router.post('/add-transaction', (req, res) => {
    const { workerName, type, amount, description, date } = req.body;
    const transactions = loadJSON(transactionsPath);

    transactions.push({
        workerName,
        type,
        amount: parseFloat(amount),
        description: description || "",
        date: date || new Date().toISOString().split('T')[0]
    });

    saveJSON(transactionsPath, transactions);
    res.redirect('/salary');
});

module.exports = router;