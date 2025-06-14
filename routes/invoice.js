const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const invoiceDataPath = path.join(__dirname, '../data/invoices.json');

// Read invoices
function readInvoices() {
  if (!fs.existsSync(invoiceDataPath)) return [];
  const data = fs.readFileSync(invoiceDataPath);
  return JSON.parse(data);
}

// Write invoices
function writeInvoices(invoices) {
  fs.writeFileSync(invoiceDataPath, JSON.stringify(invoices, null, 2));
}

// Product list
const productList = ["Iron Scrap", "Copper Scrap", "Brass Scrap", "Aluminum Scrap", "Steel Scrap"];

// Create Invoice Form
router.get('/', (req, res) => {
  res.render('create-invoice', { productList });
});

// Handle Form Submission
router.post('/', (req, res) => {
  const { party, phone, productSelect, productManual, quantity, unitPrice } = req.body;

  let product = '';

  if (productManual && productManual.trim() !== '') {
    product = productManual.trim();
  } else if (productSelect && productSelect.trim() !== '') {
    product = productSelect.trim();
  } else {
    product = 'General Scrap'; // Default product
  }

  const parsedQty = parseFloat(quantity);
  const parsedPrice = parseFloat(unitPrice);
  const total = parsedQty * parsedPrice;

  const invoiceNumber = 'INV-' + Math.floor(Math.random() * 100000);
  const date = new Date().toLocaleDateString();

  const newInvoice = {
    id: Date.now().toString(),
    invoiceNumber,
    date,
    party,
    phone,
    product,
    quantity: parsedQty,
    unitPrice: parsedPrice,
    total
  };

  const invoices = readInvoices();
  invoices.push(newInvoice);
  writeInvoices(invoices);

  res.render('invoice', {
    company: {
      name: 'Saddiqi Brothers Import and Export Company',
      address: 'Godown no.314 Gujranwala',
      phone: '+923457268345',
      email: 'saddiqibrothers@gmail.com',
      directors: ['Mir Sharif Saddiqi', 'M.Imran Saddiqi']
    },
    ...newInvoice
  });
});

// View All Invoices
router.get('/all', (req, res) => {
  const search = req.query.search?.toLowerCase() || '';
  let invoices = readInvoices();

  if (search) {
    invoices = invoices.filter(inv =>
      (inv.party && inv.party.toLowerCase().includes(search)) ||
      (inv.product && inv.product.toLowerCase().includes(search))
    );
  }

  res.render('all-invoices', { invoices, searchQuery: req.query.search || '' });
});

// Delete Invoice
router.post('/delete/:invoiceNumber', (req, res) => {
  let invoices = readInvoices();
  invoices = invoices.filter(inv => inv.invoiceNumber !== req.params.invoiceNumber);
  writeInvoices(invoices);
  res.redirect('/invoice/all');
});

// Edit Invoice Page
router.get('/edit/:id', (req, res) => {
  const invoices = readInvoices();
  const invoice = invoices.find(inv => inv.id === req.params.id);

  const isCustomProduct = (product) => {
    return !productList.includes(product);
  };

  res.render('edit-invoice', { invoice, productList, isCustomProduct });
});

// Update Invoice
router.post('/edit/:id', (req, res) => {
  const { party, phone, productSelect, productManual, quantity, unitPrice } = req.body;

  let product = '';

  if (productManual && productManual.trim() !== '') {
    product = productManual.trim();
  } else if (productSelect && productSelect.trim() !== '') {
    product = productSelect.trim();
  } else {
    product = 'General Scrap'; // Default product
  }

  let invoices = readInvoices();
  invoices = invoices.map(inv => {
    if (inv.id === req.params.id) {
      return {
        ...inv,
        party,
        phone,
        product,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        total: parseFloat(quantity) * parseFloat(unitPrice)
      };
    }
    return inv;
  });

  writeInvoices(invoices);
  res.redirect('/invoice/all');
});

// ✅ View Invoice / Print Page
router.get('/view/:id', (req, res) => {
  const id = req.params.id;
  const invoices = readInvoices();
  const invoice = invoices.find(inv => inv.id === id);

  if (!invoice) {
    return res.status(404).send('Invoice not found');
  }

  res.render('invoice', {
    company: {
      name: 'Saddiqi Brothers Import and Export Company',
      address: 'Godown no.314 Gujranwala',
      phone: '+923457268345',
      email: 'saddiqibrothers@gmail.com',
      directors: ['Mir Sharif Saddiqi', 'M.Imran Saddiqi']
    },
    ...invoice
  });
});

module.exports = router;
