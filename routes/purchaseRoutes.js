const express = require('express');
const router = express.Router(); // Create a new router object
const fs = require('fs');
const path = require('path');
const PURCHASE_INVOICES_FILE = path.join(__dirname, '../purchaseInvoices.json');
const loadPurchaseInvoices = () => loadFile(PURCHASE_INVOICES_FILE);
const savePurchaseInvoices = (data) => saveFile(PURCHASE_INVOICES_FILE, data);


// --- File Paths for JSON storage ---
// These paths need to be relative to the module, or passed in from index.js
const CUSTOMER_FILE = path.join(__dirname, '../customers.json'); // Go up one level to project root
// For simplicity, we'll keep purchaseInvoices in-memory within this module for now,
// or you could add a PURCHASE_INVOICES_FILE if you want to persist them to disk.
// let PURCHASE_INVOICES_FILE = path.join(__dirname, '../purchaseInvoices.json'); // Uncomment if you want to save invoices to a file

// --- Helper Functions to load/save JSON files ---
function loadFile(file) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading file ${file}:`, error);
        return [];
    }
}

function saveFile(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const loadCustomers = () => loadFile(CUSTOMER_FILE);
const saveCustomers = (data) => saveFile(CUSTOMER_FILE, data);

// If you want to persist purchase invoices:
// const loadPurchaseInvoices = () => loadFile(PURCHASE_INVOICES_FILE);
// const savePurchaseInvoices = (data) => saveFile(PURCHASE_INVOICES_FILE, data);


// --- REQUIRED GLOBAL DATA FOR CUSTOMER AND PURCHASE SYSTEM (within this module's scope) ---
// Load customers once when the module starts
let customers = loadCustomers();
// If you want to persist purchase invoices, load them here:
// let purchaseInvoices = loadPurchaseInvoices();
let purchaseInvoices = loadPurchaseInvoices(); // For now, keeping in-memory for the current session

// To get the next unique ID for customers (if you ever add new customers via this module)
let nextCustomerId = customers.length > 0 ? Math.max(...customers.map(c => parseInt(c.code) || 0)) + 1 : 1000001;
// Note: If you add new customers, you'll need to decide if they get a new 'id' field or a new 'code' string.
// For purchase system, we are using existing 'code'.

// To get the next unique ID for purchase invoices
// If you're persisting invoices, you'd calculate nextInvoiceId from loaded invoices:
// let nextInvoiceId = purchaseInvoices.length > 0 ? Math.max(...purchaseInvoices.map(inv => inv.invoiceId)) + 1 : 1001;
let nextInvoiceId = 1001; // Starting ID for in-memory invoices

// --- NEW PURCHASE SYSTEM ROUTES (using router) ---

// Route to render the purchase.ejs page
// This route will still be handled by index.js's app.get('/purchase')
// But the API endpoints will be defined here.

// API to fetch customer details by registration code
router.get('/customer-by-code/:code', (req, res) => {
    const registrationCode = req.params.code; 
    const customer = customers.find(c => c.code === registrationCode); 

    if (customer) {
        res.json(customer);
    } else {
        res.status(404).send('Customer not found with this registration code.');
    }
});

// API to generate a new purchase invoice
const { v4: uuidv4 } = require('uuid');

router.post('/generate-purchase-invoice', (req, res) => {
    // Destructure ALL fields sent from the frontend
    const {
        customerId,
        customerName, // Added
        customerPhone, // Added
        idCardNumber, // Added
        passportNumber, // Added
        idCardExpiry, // Added
        passportExpiry, // Added
        nationality, // Added
        province, // Added
        city, // Added
        streetAddress, // Added
        contactNumber2, // Added
        emailAddress, // Added
        vehicleModel, // Added
        vehiclePlateNumber, // Added
        vehicleColour, // Added
        idDocumentPicture, // Added
        customerPicture, // Added
        nifDniType, // Added
        buyerName, // Added
        weigherName, // Added
        vehicleType, // Added (from input field, not directly from fetched customer object)
        comment, // Added
        customerBehaviour, // Added
        consentText, // Added
        items,
        signature,
        totalBill // Added
    } = req.body; // <--- THIS LINE IS MODIFIED


    if (!customerId || !items || items.length === 0) {
        return res.status(400).json({ message: 'Customer ID and items required.' }); // Changed to json response
    }

    // Customer check is now mostly for safety, as frontend sends all info
    const customer = customers.find(c => c.code === customerId);
    // You might want to remove this check if you rely fully on frontend sent data
    // or keep it to ensure the customer ID is valid in your master data.
    if (!customer) return res.status(404).json({ message: 'Customer not found.' }); // Changed to json response

    const invoiceId = nextInvoiceId++;
    const invoice = {
        invoiceId,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        customerId: customerId, // Use ID sent from frontend
        customerName: customerName, // Use name sent from frontend
        customerPhone: customerPhone, // Use phone sent from frontend
        // ALL Additional Customer Details to save
        idCardNumber: idCardNumber || '',
        passportNumber: passportNumber || '',
        idCardExpiry: idCardExpiry || '',
        passportExpiry: passportExpiry || '',
        nationality: nationality || '',
        province: province || '',
        city: city || '',
        streetAddress: streetAddress || '',
        contactNumber2: contactNumber2 || '',
        emailAddress: emailAddress || '',
        vehicleModel: vehicleModel || '',
        vehiclePlateNumber: vehiclePlateNumber || '',
        vehicleColour: vehicleColour || '',
        idDocumentPicture: idDocumentPicture || '', // Save filename
        customerPicture: customerPicture || '', // Save filename
        // ALL New Transaction-Specific Fields to save
        nifDniType: nifDniType || '',
        buyerName: buyerName || 'Ali Carlos', // Default if not provided
        weigherName: weigherName || '',
        vehicleType: vehicleType || '',
        comment: comment || '',
        customerBehaviour: customerBehaviour || '',
        consentText: consentText || '',
        items: items.map(i => ({
            itemCode: i.itemCode, // Ensure item code is saved
            description: i.description,
            weight: parseFloat(i.weight),
            price: parseFloat(i.price),
            total: parseFloat(i.total)
        })),
        totalAmount: parseFloat(totalBill) || 0 // Save the total bill received from frontend
    };

    // Ensure the signatures directory exists (already in your code, just a reminder)
    const signaturesDir = path.join(__dirname, '../public/signatures');
    if (!fs.existsSync(signaturesDir)) {
        fs.mkdirSync(signaturesDir, { recursive: true });
    }

    if (signature) {
        const base64Data = signature.replace(/^data:image\/png;base64,/, '');
        const filename = `signature_${invoiceId}.png`;
        const filePath = path.join(signaturesDir, filename);
        fs.writeFileSync(filePath, base64Data, 'base64');
        invoice.signatureFile = filename;
    }

    purchaseInvoices.push(invoice);
    savePurchaseInvoices(purchaseInvoices); // This line is crucial for persistence

    res.status(201).json({
        message: 'Purchase Invoice generated successfully!',
        redirectTo: `/purchase-invoice/${invoice.invoiceId}`
    });
});



// Route for displaying the generated invoice
router.get('/purchase-invoice/:id', (req, res) => {
    const invoiceId = parseInt(req.params.id);
    const invoice = purchaseInvoices.find(inv => inv.invoiceId === invoiceId);

    if (invoice) {
        // You'll need to define this EJS view in your 'views' folder
        res.render('purchase_invoice_placeholder', { invoiceId: invoice.invoiceId, invoiceData: invoice });
    } else {
        res.status(404).send('Purchase Invoice not found');
    }
});

// Export the router so index.js can use it
module.exports = router;
router.get('/all', (req, res) => {
    res.render('all-purchases', { invoices: purchaseInvoices });
});