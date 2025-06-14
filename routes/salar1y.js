const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const employeesFile = path.join(__dirname, '../data/employees.json');
const salaryFile = path.join(__dirname, '../data/salary_transactions.json');

// Utility Functions
function loadEmployees() {
  try {
    const data = fs.readFileSync(employeesFile);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function loadSalaries() {
  try {
    const data = fs.readFileSync(salaryFile);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveSalaries(data) {
  fs.writeFileSync(salaryFile, JSON.stringify(data, null, 2));
}

// Salary Report Page
router.get('/', (req, res) => {
  const employees = loadEmployees();
  const transactions = loadSalaries();
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const salaries = employees.map(emp => {
    const tx = transactions.find(t => t.employeeId === emp.id && t.month === currentMonth);
    const present = tx ? tx.presentDays : 0;
    const net = tx ? tx.amount : (present * (emp.salary / 30));

    return {
      employee_id: emp.id,
      name: emp.name,
      month: currentMonth,
      present_days: present,
      total_days: 30,
      net_salary: Math.round(net),
      status: tx ? tx.status : "Unpaid",
      paid_on: tx ? tx.paid_on : null
    };
  });

  res.render("salary/salary-report", { salaries });
});

// Pay Salary Route
router.get('/pay-salary/:id/:month', (req, res) => {
  const id = parseInt(req.params.id);
  const month = req.params.month;
  const employees = loadEmployees();
  const transactions = loadSalaries();
  const emp = employees.find(e => e.id === id);
  const presentDays = 0;
  const amount = presentDays * (emp.salary / 30);

  transactions.push({
    employeeId: id,
    month,
    presentDays,
    amount,
    status: "Paid",
    paid_on: new Date().toLocaleDateString()
  });

  saveSalaries(transactions);
  res.redirect('/salary');
});

// Add Employee
router.post('/add', (req, res) => {
  const { name, salary } = req.body;
  const employees = loadEmployees();
  const newEmp = {
    id: Date.now(),
    name,
    salary: parseInt(salary)
  };
  employees.push(newEmp);
  fs.writeFileSync(employeesFile, JSON.stringify(employees, null, 2));
  res.redirect('/salary');
});

module.exports = router;
