const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const pdf = require('html-pdf');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const INVOICE_FILE = path.join(__dirname, 'invoices.json');
const EXPENSE_FILE = path.join(__dirname, 'expenses.json');
const OPENING_CASH_FILE = path.join(__dirname, 'opening-cash.json');
const LAST_SUMMARY_FILE = path.join(__dirname, 'last-summary.json');
// const CUSTOMER_FILE = path.join(__dirname, 'customers.json'); // No longer directly used here for customer operations
const PURCHASE_FILE = path.join(__dirname, 'purchases.json');
const EMPLOYEE_FILE = path.join(__dirname, 'employees.json');
const SALARY_TRANSACTION_FILE = path.join(__dirname, 'salary_transactions.json');
const PURCHASE_INVOICES_FILE = path.join(__dirname, 'purchaseInvoices.json');
const purchaseInvoices = require('./purchaseInvoices.json');
// Helper Functions
function loadFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file));
    } catch {
        return [];
    }
}
function saveFile(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const loadInvoices = () => loadFile(INVOICE_FILE);
const saveInvoices = (data) => saveFile(INVOICE_FILE, data);

const loadExpenses = () => loadFile(EXPENSE_FILE);
const saveExpenses = (data) => saveFile(EXPENSE_FILE, data);

const loadOpeningCashList = () => loadFile(OPENING_CASH_FILE);
const saveOpeningCashList = (data) => saveFile(OPENING_CASH_FILE, data);

// Removed: const loadCustomers = () => loadFile(CUSTOMER_FILE);
// Removed: const saveCustomers = (data) => saveFile(CUSTOMER_FILE, data);

const loadPurchases = () => loadFile(PURCHASE_FILE);
const savePurchases = (data) => saveFile(PURCHASE_FILE, data);

const loadEmployees = () => loadFile(EMPLOYEE_FILE);
const saveEmployees = (data) => saveFile(EMPLOYEE_FILE, data);

const loadSalaryTransactions = () => loadFile(SALARY_TRANSACTION_FILE);
const saveSalaryTransactions = (data) => saveFile(SALARY_TRANSACTION_FILE, data);
const loadPurchaseInvoices = () => loadFile(PURCHASE_INVOICES_FILE);
const savePurchaseInvoices = (data) => saveFile(PURCHASE_INVOICES_FILE, data);

const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const productList = ["Dc Motor", "Heat Gun", "Zeshan", "Auto part", "Gear Motor", "Computer board", "Power Supply", "iron and charger", "Lock, Iron, Scooty", "Iron Wire", "Iron press", "Chain Kupi", "Laptop", "Charger", "processor", "Hard Disk 1 TB", "SSD 10 gb", "Grinder Parts", "Jista", "iron scrap", "hello product", "Copper"];
// Function to load the last daily summary
function loadLastSummary() {
    try {
        const data = fs.readFileSync(LAST_SUMMARY_FILE);
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Function to save the last daily summary
function saveLastSummary(summaryData) {
    fs.writeFileSync(LAST_SUMMARY_FILE, JSON.stringify(summaryData, null, 2));
}

// Home Page
app.get('/', (req, res) => {
    const invoices = loadInvoices();
    const expenses = loadExpenses();
    const purchases = loadPurchases();
    const openingCashList = loadOpeningCashList();
    const today = formatDate(new Date());

    const todayOpening = openingCashList.find(cash => cash.date === today);
    const lastCash = openingCashList[openingCashList.length - 1];

    const totalSales = invoices.reduce((sum, inv) => {
        if (Array.isArray(inv.products)) {
            return sum + inv.products.reduce((s, p) => s + (p.quantity * p.price), 0);
        }
        return sum;
    }, 0);

    // --- START: Changes for Home Page Expense Calculation ---
    // Filter expenses for online payments (assuming 'Online Payment to Boss' as title)
    const onlinePaymentsForHome = expenses.filter(exp => exp.title === 'Online Payment to Boss'); // Adjust this condition if title is different
    const normalExpensesForHome = expenses.filter(exp => exp.title !== 'Online Payment to Boss'); // All other expenses

    const totalNormalExpensesForHome = normalExpensesForHome.reduce((sum, exp) => sum + exp.amount, 0);
    const totalOnlinePaymentsForHome = onlinePaymentsForHome.reduce((sum, exp) => sum + exp.amount, 0);

    // Total expenses for cash in hand calculation (includes both types)
    const totalAllExpensesForCashInHand = totalNormalExpensesForHome + totalOnlinePaymentsForHome;

    const opening = todayOpening?.amount || lastCash?.amount || 0;
    const cashInHand = opening + totalSales - totalAllExpensesForCashInHand; // Cash in hand should subtract all expenses

    // For the 'Total Expenses' card on the home page, you might want to show only normal expenses
    // Or you can sum both if you want a grand total of expenses on the home page.
    // For now, keeping it as totalNormalExpensesForHome for the card, assuming that's what was intended.
    const totalExpensesForHomePageCard = totalNormalExpensesForHome; // This will show in the "Total Expenses" card on home page
    // --- END: Changes for Home Page Expense Calculation ---


    // Purchase/Sales Weight
    const totalPurchaseWeight = purchases.reduce((sum, p) => sum + (p.weight || 0), 0);
    const totalSaleWeight = invoices.reduce((sum, inv) => {
        if (Array.isArray(inv.products)) {
            return sum + inv.products.reduce((s, p) => s + (p.quantity || 0), 0);
        }
        return sum;
    }, 0);
    const remainingWeight = totalPurchaseWeight - totalSaleWeight;

    res.render('home', {
        totalSales,
        totalExpenses: totalExpensesForHomePageCard, // Pass the filtered total for the card
        openingCash: { amount: opening },
        cashInHand,
        totalPurchaseWeightValue: totalPurchaseWeight,
        totalPurchasePriceValue: purchases.reduce((sum, p) => sum + (p.weight * p.pricePerKg), 0),
        totalSaleWeightValue: totalSaleWeight,
        remainingWeightValue: remainingWeight
    });
});

// Save Opening Cash
app.post('/opening-cash', (req, res) => {
    const { date, amount } = req.body;
    const list = loadOpeningCashList();
    const idx = list.findIndex(e => e.date === date);
    if (idx >= 0) list[idx].amount = parseFloat(amount);
    else list.push({ date, amount: parseFloat(amount) });
    saveOpeningCashList(list);
    res.redirect('/');
});

app.get('/all-purchases', (req, res) => {
    res.render('all-purchases', { invoices: purchaseInvoices });
});

// Expenses
app.get('/expense', (req, res) => res.render('expenses/create-expense'));

app.post('/expense', (req, res) => {
    const expenses = loadExpenses();
    expenses.push({
        id: Date.now(),
        title: req.body.title,
        amount: parseFloat(req.body.amount),
        date: req.body.date,
        description: req.body.description || ''
    });
    saveExpenses(expenses);
    res.redirect('/expense/all');
});

app.get('/expense/all', (req, res) => {
    const allExpenses = loadExpenses(); // Renamed to allExpenses for clarity
    const search = (req.query.search || '').toLowerCase();

    // Filter expenses based on search query
    const filteredExpenses = allExpenses.filter(exp =>
        (exp.title || '').toLowerCase().includes(search) ||
        (exp.date || '').toLowerCase().includes(search)
    );

    // Separate "Online To" expenses from other expenses
    const onlineExpenses = filteredExpenses.filter(exp =>
        (exp.title || '').toLowerCase().startsWith('online to')
    );
    const otherExpenses = filteredExpenses.filter(exp =>
        !((exp.title || '').toLowerCase().startsWith('online to'))
    );

    // Calculate totals for each category
    const totalOnlineExpenses = onlineExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalOtherExpenses = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const overallTotalExpenses = totalOnlineExpenses + totalOtherExpenses; // Sum of both categories

    res.render('expenses/all-expenses', {
        onlineExpenses: onlineExpenses,      // Pass online expenses list
        otherExpenses: otherExpenses,        // Pass other expenses list
        totalOnlineExpenses: totalOnlineExpenses, // Pass total for online
        totalOtherExpenses: totalOtherExpenses,   // Pass total for other
        search: search,
        totalExpenses: overallTotalExpenses  // Pass overall total (for backward compatibility if needed)
    });
});

// --- CUSTOMER ROUTES ---
const customerRoutesFunction = require('./customer'); // customer.js file ko import kiya
app.use('/customers', customerRoutesFunction({ appRoot: __dirname })); 
// /customers path par customerRoutes ko use kiya
// --- START: NEW PURCHASE SYSTEM MODULE INTEGRATION ---
const purchaseRouter = require('./routes/purchaseRoutes'); // Import the new purchase router

// Route to render the main purchase.ejs form (frontend)
app.get('/purchase', (req, res) => {
    res.render('purchase'); // Assumes purchase.ejs is in your 'views' folder
});

// Use the purchaseRouter for all API endpoints related to purchases
// All routes defined in purchaseRoutes.js (e.g., /customer-by-code, /generate-purchase-invoice)
// will now be prefixed with /api (e.g., /api/customer-by-code/:code)
app.use('/api', purchaseRouter); 

// Route for displaying the generated purchase invoice view
// This route is in index.js because it renders an EJS view directly.
app.get('/purchase-invoice/:id', (req, res) => {
    const invoiceId = parseInt(req.params.id);
    // Load all purchase invoices from the file to find the specific one
    const allPurchaseInvoices = loadPurchaseInvoices(); 
    const invoice = allPurchaseInvoices.find(inv => inv.invoiceId === invoiceId);

    if (invoice) {
        res.render('purchase_invoice_placeholder', { invoiceId: invoice.invoiceId, invoiceData: invoice });
    } else {
        res.status(404).send('Purchase Invoice not found');
    }
});
// --- END: NEW PURCHASE SYSTEM MODULE INTEGRATION ---
// Removed old customer routes:
// app.get('/customers', (req, res) => {
//     const customers = loadCustomers();
//     res.render('customers', { customers });
// });

// app.post('/customers/add', (req, res) => {
//     const customers = loadCustomers();
//     customers.push({
//         id: Date.now(),
//         name: req.body.name,
//         phone: req.body.phone
//     });
//     saveCustomers(customers);
//     res.redirect('/customers');
// });


// Purchases
app.get('/purchase', (req, res) => res.render('purchase'));



app.post('/purchase', (req, res) => {
    const purchases = loadPurchases();
    purchases.push({
        id: Date.now(),
        weight: parseFloat(req.body.weight),
        pricePerKg: parseFloat(req.body.pricePerKg),
        date: req.body.date
    });
    savePurchases(purchases);
    res.redirect('/purchase/all');
});

app.get('/purchase/all', (req, res) => {
    const purchases = loadPurchases();
    const invoices = loadInvoices();
    const totalPurchaseWeight = purchases.reduce((sum, p) => sum + p.weight, 0);
    const totalPurchasePrice = purchases.reduce((sum, p) => sum + (p.weight * p.pricePerKg), 0);
    const totalSaleWeight = invoices.reduce((sum, inv) => {
        if (Array.isArray(inv.products)) {
            return sum + inv.products.reduce((s, p) => s + (p.quantity || 0), 0);
        }
        return sum;
    }, 0);
    const remainingWeight = totalPurchaseWeight - totalSaleWeight;

    res.render('all-purchases', {
        purchases,
        totalPurchaseWeight,
        totalPurchasePrice,
        totalSaleWeight,
        remainingWeight
    });
});
// Invoices
app.get('/invoice', (req, res) => res.render('create-invoice'));

app.post('/invoice/create', (req, res) => {
    const invoices = loadInvoices();
    const customerName = req.body.customerName;
    const customerPhone = req.body.customerPhone;
    const salesman = req.body.salesman;
    const products = [];

    if (Array.isArray(req.body.product)) {
        req.body.product.forEach((prod, i) => {
            products.push({
                product: prod === 'Other' ? req.body.customProduct[i] : prod,
                quantity: parseFloat(req.body.quantity[i]),
                unit: req.body.unit[i],
                price: parseFloat(req.body.price[i])
            });
        });
    } else {
        products.push({
            product: req.body.product === 'Other' ? req.body.customProduct : req.body.product,
            quantity: parseFloat(req.body.quantity),
            unit: req.body.unit,
            price: parseFloat(req.body.price)
        });
    }

    const newInvoice = {
        id: Date.now(),
        invoiceNumber: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
        customerName,
        customerPhone,
        salesman,
        date: new Date().toLocaleDateString(),
        products
    };

    invoices.push(newInvoice);
    saveInvoices(invoices);

   


    res.redirect('/invoice/all');
});

app.get('/invoice/all', (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    const invoices = loadInvoices()
        .filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(search) ||
            (inv.customerName || '').toLowerCase().includes(search) ||
            (inv.products || []).some(p => p.product.toLowerCase().includes(search))
        )
        .sort((a, b) => b.id - a.id); // ✅ Newest invoice first
    res.render('all-invoices', { invoices, search });
});


app.get('/invoice/:id', (req, res) => {
    const invoice = loadInvoices().find(inv => inv.id == req.params.id);
    if (!invoice) return res.status(404).send('Invoice not found');
    res.render('invoice', { invoice });
});

app.get('/invoice/edit/:id', (req, res) => {
    const invoice = loadInvoices().find(inv => inv.id == req.params.id);
    if (!invoice) return res.status(404).send('Invoice not found');
    res.render('edit-invoice', { invoice, productList });
});

app.post('/invoice/edit/:id', (req, res) => {
    const invoices = loadInvoices();
    const index = invoices.findIndex(inv => inv.id == req.params.id);
    if (index === -1) return res.status(404).send('Not found');

    const products = [];
    if (Array.isArray(req.body.product)) {
        req.body.product.forEach((prod, i) => {
            products.push({
                product: prod === 'Other' ? req.body.customProduct[i] : prod,
                quantity: parseFloat(req.body.quantity[i]),
                unit: req.body.unit[i],
                price: parseFloat(req.body.price[i])
            });
        });
    }

    invoices[index] = {
        ...invoices[index],
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        salesman: req.body.salesman,
        products
    };

    saveInvoices(invoices);
    res.redirect('/invoice/all');
});

app.post('/invoice/delete/:id', (req, res) => {
    const invoices = loadInvoices().filter(inv => inv.id != req.params.id);
    saveInvoices(invoices);
    res.redirect('/invoice/all');
});

// PDF Route
app.get('/invoice/pdf/:invoiceNumber', (req, res) => {
    const invoice = loadInvoices().find(inv => inv.invoiceNumber === req.params.invoiceNumber);
    if (!invoice) return res.status(404).send('Invoice not found');

    ejs.renderFile(path.join(__dirname, 'views', 'invoice-pdf.ejs'), { invoice }, (err, html) => {
        if (err) return res.status(500).send('Render error');

        const options = { format: 'A4', orientation: 'portrait' };
        pdf.create(html, options).toBuffer((err, buffer) => {
            if (err) return res.status(500).send('PDF error');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
            res.send(buffer);
        });
    });
});
// Salary Management Page
const salaryRoutes = require('./routes/salary'); // صحیح path do
app.use('/salary', salaryRoutes); // yeh zaroori hai


// Redirect base salary route to salary report
app.get('/salary', (req, res) => {
    res.redirect('/salary/salary-report');
});


// Product-wise Revenue Report
app.get('/report/product-wise-revenue', (req, res) => {
    const invoices = loadInvoices();
    const productMap = {};

    invoices.forEach(invoice => {
        (invoice.products || []).forEach(prod => {
            const key = prod.product;
            if (!productMap[key]) {
                productMap[key] = {
                    product: key,
                    unit: prod.unit || '', // 👈 this line is key
                    totalQty: 0,
                    totalAmount: 0
                };
            }
            productMap[key].totalQty += parseFloat(prod.quantity || 0);
            productMap[key].totalAmount += parseFloat(prod.quantity || 0) * parseFloat(prod.price || 0);
        });
    });

    const productWiseRevenue = Object.values(productMap);
    res.render('reports/product-wise-revenue', { productWiseRevenue }); // ✅ make sure this matches your EJS path
});




// Add Transaction for Specific Employee
app.post('/salary/:id/transaction', (req, res) => {
    const employeeId = parseInt(req.params.id);
    const salaryTransactions = loadSalaryTransactions();

    const newTx = {
        id: Date.now(),
        employeeId: employeeId,
        amount: parseFloat(req.body.amount),
        type: req.body.type, // "advance" or "salary"
        date: req.body.date
    };

    salaryTransactions.push(newTx);
    saveSalaryTransactions(salaryTransactions);
    res.redirect(`/salary/${employeeId}`);
});

app.post('/salary/employee/add', (req, res) => {
    const employees = loadEmployees();
    employees.push({
        id: Date.now(),
        name: req.body.name,
        phone: req.body.phone,
        salary: parseFloat(req.body.salary)
    });
    saveEmployees(employees);
    res.redirect('/salary');
});

app.post('/salary/transaction/add', (req, res) => {
    const transactions = loadSalaryTransactions();
    transactions.push({
        id: Date.now(),
        employeeId: parseInt(req.body.employeeId),
        amount: parseFloat(req.body.amount),
        type: req.body.type, // advance or salary
        date: req.body.date
    });
    saveSalaryTransactions(transactions);
    res.redirect('/salary');
});

app.get('/salary/:id', (req, res) => {
    const employeeId = parseInt(req.params.id);
    const employees = loadEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return res.status(404).send('Employee not found');

    const transactions = loadSalaryTransactions().filter(tx => tx.employeeId === employeeId);
    const totalPaid = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const balance = emp.salary - totalPaid;

    res.render('employee-salary-detail', {
        employee: emp,
        transactions,
        totalPaid,
        balance,
        advance: balance < 0 ? Math.abs(balance) : 0,
        remaining: balance > 0 ? balance : 0
    });
});
// Monthly Salary Report
app.get('/salary-report', (req, res) => {
    const employees = loadEmployees();
    const transactions = loadSalaryTransactions();
    const month = req.query.month; // e.g. "2025-05"

    if (!month) {
        return res.render('salary-report', { report: [], selectedMonth: '' });
    }

    const filteredTx = transactions.filter(tx => tx.date.startsWith(month));

    const report = employees.map(emp => {
        const empTx = filteredTx.filter(tx => tx.employeeId === emp.id);
        const salaryCredited = empTx.filter(t => t.type === 'salary').reduce((sum, t) => sum + t.amount, 0);
        const advanceTaken = empTx.filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0);

        return {
            ...emp,
            salaryCredited,
            advanceTaken,
            remainingSalary: Math.max(salaryCredited - advanceTaken, 0),
            remainingAdvance: Math.max(advanceTaken - salaryCredited, 0)
        };
    });

    res.render('salary-report', { report, selectedMonth: month });
});


// Daily Summary Form Page
app.get('/summary-form', (req, res) => {
    res.render('summary-form');
});

// Summary Result Page
app.post('/summary-result', (req, res) => {
    const selectedDate = req.body.summaryDate;
    const invoices = loadInvoices();
    const expenses = loadExpenses(); // All expenses
    const purchases = loadPurchases();
    const openingCashList = loadOpeningCashList();

    const opening = openingCashList.find(item => item.date === selectedDate) || { amount: 0 };

    const selectedDateObj = new Date(selectedDate);

    const sales = invoices.filter(inv => {
        const invoiceDate = new Date(inv.date);
        return invoiceDate.toDateString() === selectedDateObj.toDateString();
    });

    // --- START: Updated Logic for Daily Summary Expense and Purchase Filtering ---
    const expensesToday = expenses.filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.toDateString() === selectedDateObj.toDateString();
    });

    // Filter expenses into normal expenses and online payments
    // Jo expenses 'Online to' se start hoti hain, woh online payments hain.
    const onlinePaymentsToday = expensesToday.filter(exp => exp.title && exp.title.toLowerCase().startsWith('online to'));
    const normalExpensesToday = expensesToday.filter(exp => !(exp.title && exp.title.toLowerCase().startsWith('online to')));

    // Define purchasesToday here (previously undefined, caused ReferenceError)
    const purchasesToday = purchases.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate.toDateString() === selectedDateObj.toDateString();
    });
    // --- END: Updated Logic for Daily Summary Expense and Purchase Filtering ---


    const totalSales = sales.reduce((sum, inv) => {
        const invTotal = inv.products?.reduce((s, p) => s + (p.quantity * p.price), 0) || (inv.quantity * inv.price) || 0;
        return sum + invTotal;
    }, 0);

    // Calculate total for normal expenses (for the card and table)
    const totalNormalExpenses = normalExpensesToday.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate total for online payments (for the new card and table)
    const totalOnlinePayments = onlinePaymentsToday.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate total purchases from purchasesToday
    const totalPurchases = purchasesToday.reduce((sum, p) => sum + (p.weight * p.pricePerKg), 0);

    // Cash In Hand calculation: Opening + Sales - Normal Expenses - Online Payments - Purchases
    const cashInHand = opening.amount + totalSales - totalNormalExpenses - totalOnlinePayments - totalPurchases;

    const summaryData = {
        date: selectedDate,
        openingCash: opening.amount,
        cashInHand
    };

    saveLastSummary(summaryData);

    res.render('daily-summary', {
        selectedDate,
        sales,
        expenses: normalExpensesToday,      // Pass only normal expenses
        onlinePayments: onlinePaymentsToday, // Pass online payments
        purchases: purchasesToday,           // Pass purchases for the selected date
        totalSales,
        totalExpenses: totalNormalExpenses,  // Total of normal expenses for the card
        totalOnlinePayments,                 // Total of online payments for the new card
        totalPurchases,
        openingCash: opening.amount,
        cashInHand
    });
});

// Summary Result Page (duplicate, kept for completeness of your original file)
app.post('/summary-result', (req, res) => {
    const selectedDate = req.body.summaryDate;
    const invoices = loadInvoices();
    const expenses = loadExpenses(); // All expenses
    const purchases = loadPurchases();
    const openingCashList = loadOpeningCashList();

    const opening = openingCashList.find(item => item.date === selectedDate) || { amount: 0 };

    const selectedDateObj = new Date(selectedDate);

    const sales = invoices.filter(inv => {
        const invoiceDate = new Date(inv.date);
        return invoiceDate.toDateString() === selectedDateObj.toDateString();
    });

    // --- START: Changes for Daily Summary Expense Filtering ---
    const expensesToday = expenses.filter(exp => {
        const expenseDate = new Date(exp.date);
        return expenseDate.toDateString() === selectedDateObj.toDateString();
    });

    // Filter expenses into normal expenses and online payments
    // IMPORTANT: 'Online Payment to Boss' is an assumed title.
    // Please make sure that when you add an expense that is an online payment to the boss,
    // its 'title' field is exactly 'Online Payment to Boss' (case-sensitive).
    const normalExpensesToday = expensesToday.filter(exp => exp.title !== 'Online Payment to Boss');
    const onlinePaymentsToday = expensesToday.filter(exp => exp.title === 'Online Payment to Boss');

    const totalSales = sales.reduce((sum, inv) => {
        const invTotal = inv.products?.reduce((s, p) => s + (p.quantity * p.price), 0) || (inv.quantity * inv.price) || 0;
        return sum + invTotal;
    }, 0);

    // Calculate total for normal expenses (for the card and table)
    const totalNormalExpenses = normalExpensesToday.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate total for online payments (for the new card and table)
    const totalOnlinePayments = onlinePaymentsToday.reduce((sum, exp) => sum + exp.amount, 0);

    const totalPurchases = purchases.filter(p => { // Filter purchases for the selected date
        const purchaseDate = new Date(p.date);
        return purchaseDate.toDateString() === selectedDateObj.toDateString();
    }).reduce((sum, p) => sum + (p.weight * p.pricePerKg), 0);

    // Cash In Hand calculation: Opening + Sales - Normal Expenses - Online Payments - Purchases
    const cashInHand = opening.amount + totalSales - totalNormalExpenses - totalOnlinePayments - totalPurchases;
    // --- END: Changes for Daily Summary Expense Filtering ---

    const summaryData = {
        date: selectedDate,
        openingCash: opening.amount,
        cashInHand
    };

    saveLastSummary(summaryData);

    res.render('daily-summary', {
        selectedDate,
        sales,
        expenses: normalExpensesToday, // Pass only normal expenses to the 'expenses' variable
        onlinePayments: onlinePaymentsToday, // Pass online payments to a new variable
        purchases: purchasesToday, // Purchases are already filtered by date
        totalSales,
        totalExpenses: totalNormalExpenses, // Pass total of normal expenses for the card
        totalOnlinePayments, // Pass total of online payments for the new card
        totalPurchases,
        openingCash: opening.amount,
        cashInHand
    });
});

app.get('/api/dashboard-data', (req, res) => {
    const invoices = loadInvoices();
    const expenses = loadExpenses();
    const purchases = loadPurchases();
    const today = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(today.getMonth() - 12);

    const formatLabel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Monthly Sales
    const monthlySales = {};
    invoices.forEach(inv => {
        const date = new Date(inv.date);
        if (date >= twelveMonthsAgo && date <= today) {
            const key = formatLabel(date);
            const total = inv.products?.reduce((s, p) => s + (p.quantity * p.price), 0) || (inv.quantity * inv.price) || 0;
            monthlySales[key] = (monthlySales[key] || 0) + total;
        }
    });

    // Monthly Expenses
    const monthlyExpenses = {};
    expenses.forEach(exp => {
        const date = new Date(exp.date);
        if (date >= twelveMonthsAgo && date <= today) {
            const key = formatLabel(date);
            monthlyExpenses[key] = (monthlyExpenses[key] || 0) + exp.amount;
        }
    }
    );

    // Today's Expenses Breakdown
    const todayFormatted = formatDate(today);
    const todayExpenses = expenses.filter(e => formatDate(e.date) === todayFormatted);
    const expensesBreakdown = {};
    todayExpenses.forEach(e => {
        expensesBreakdown[e.title] = (expensesBreakdown[e.title] || 0) + e.amount;
    });

    // Today's Purchases Breakdown
    const todayPurchases = purchases.filter(p => formatDate(p.date) === todayFormatted);
    const purchasesBreakdown = {};
    todayPurchases.forEach(p => {
        const cost = p.weight * p.pricePerKg;
        purchasesBreakdown['Purchases'] = (purchasesBreakdown['Purchases'] || 0) + cost;
    });

    res.json({
        salesLabels: Object.keys(monthlySales),
        salesAmounts: Object.values(monthlySales),
        monthlyExpenseLabels: Object.keys(monthlyExpenses),
        monthlyExpenseAmounts: Object.values(monthlyExpenses),
        expenseLabels: Object.keys(expensesBreakdown),
        expenseAmounts: Object.values(expensesBreakdown),
        purchaseLabels: Object.keys(purchasesBreakdown),
        purchaseAmounts: Object.values(purchasesBreakdown)
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});