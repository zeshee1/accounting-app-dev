// customer.js (E:\under-construction\accounting-app-dev\routes\customer.js)

const express = require('express');
const router = express.Router(); // New router instance for this file
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

// --- Export a function that creates and returns the router ---
// `appRoot` variable ko yahan `{ appRoot }` destructured object ke taur par receive kiya jayega
module.exports = function({ appRoot }) { 

    // --- File paths (ab appRoot ke mutabiq) ---
    // `customers.json` file appRoot mein hai: E:\under-construction\accounting-app-dev\customers.json
    const CUSTOMERS_FILE = path.join(appRoot, 'customers.json');
    // `purchases.json` bhi agar root mein hai: E:\under-construction\accounting-app-dev\purchases.json
    const PURCHASES_FILE = path.join(appRoot, 'purchases.json'); 

    // `uploads` folder `public` ke andar aur `public` folder `appRoot` mein hai:
    // E:\under-construction\accounting-app-dev\public\uploads
    const uploadsDir = path.join(appRoot, 'public', 'uploads');

   // Make sure the uploads directory exists and log appropriately
    fs.stat(uploadsDir)
        .then(stats => {
            if (stats.isDirectory()) {
                console.log(`Uploads directory already exists at: ${uploadsDir}`);
            } else {
                // If something exists but it's not a directory, log an error
                console.error(`Error: A file exists at ${uploadsDir} but it's not a directory. Please check.`);
            }
        })
        .catch(err => {
            if (err.code === 'ENOENT') { // If directory does not exist, create it
                fs.mkdir(uploadsDir, { recursive: true })
                    .then(() => console.log(`Uploads directory created at: ${uploadsDir}`))
                    .catch(createErr => console.error(`Error creating uploads directory ${uploadsDir}:`, createErr));
            } else { // Other errors during stat check
                console.error(`Error checking uploads directory ${uploadsDir}:`, err);
            }
        });

    const storage = multer.diskStorage({ 
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            // Use originalname with timestamp and replace spaces for better URL compatibility
            cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')); 
        }
    });
    const upload = multer({ storage: storage });
    // --- Helper Functions to Read/Write JSON files --- 
    async function readJSONFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            // Check if file is empty or not a valid JSON array
            if (data.trim() === '' || !data.trim().startsWith('[')) { 
                console.warn(`JSON file ${filePath} is empty or invalid. Returning empty array.`);
                return []; 
            }
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') { // File not found
                console.warn(`File not found: ${filePath}. Creating new empty file.`);
                await fs.writeFile(filePath, '[]', 'utf8'); // Create empty array if file doesn't exist
                return [];
            }
            console.error(`Error reading ${filePath}:`, error);
            throw error;
        }
    }

    async function writeJSONFile(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 4), 'utf8');
            console.log(`Successfully wrote data to ${filePath}`); // Debugging confirmation
        } catch (error) {
            console.error(`Error writing to ${filePath}:`, error);
            throw error;
        }
    }

    // --- Routes for Customer Management ---
    // GET route for the customer details page (list and add form)
    router.get("/", async (req, res) => {
        try {
            const customers = await readJSONFile(CUSTOMERS_FILE);
            res.render('customer', { customers: customers });
        } catch (error) {
            console.error('Error loading customers data for /customers route:', error);
            res.status(500).send('Error while loading the customers data۔');
        }
    });

    // POST route to add a new customer
    router.post('/add', upload.fields([
        { name: 'idDocumentPicture', maxCount: 1 },
        { name: 'customerPicture', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const customers = await readJSONFile(CUSTOMERS_FILE);
            const newCustomer = { ...req.body }; // Create a copy of req.body

            // Basic validation for mandatory fields (ID card or Passport)
            if (!newCustomer.idCardNumber && !newCustomer.passportNumber) {
                // If Multer files were uploaded, remove them as validation failed
                if (req.files && req.files.idDocumentPicture && req.files.idDocumentPicture[0]) {
                    await fs.unlink(req.files.idDocumentPicture[0].path).catch(err => console.error("Error deleting temp ID picture:", err));
                }
                if (req.files && req.files.customerPicture && req.files.customerPicture[0]) {
                    await fs.unlink(req.files.customerPicture[0].path).catch(err => console.error("Error deleting temp customer picture:", err));
                }
                return res.status(400).send('One of the Document is Mandatory: ID Card Or Passport');
            }
            
            // Check if code already exists
            const codeExists = customers.some(c => c.code === newCustomer.code);
            if (codeExists) {
                // If Multer files were uploaded, remove them as validation failed
                if (req.files && req.files.idDocumentPicture && req.files.idDocumentPicture[0]) {
                    await fs.unlink(req.files.idDocumentPicture[0].path).catch(err => console.error("Error deleting temp ID picture:", err));
                }
                if (req.files && req.files.customerPicture && req.files.customerPicture[0]) {
                    await fs.unlink(req.files.customerPicture[0].path).catch(err => console.error("Error deleting temp customer picture:", err));
                }
                return res.status(400).send('This Code Is already Exist. Kindly Assign another code');
            }

            // --- Handle Image Uploads (Preference: Multer files first, then Base64) ---
            newCustomer.idDocumentPicture = ''; // Initialize to empty string
            newCustomer.customerPicture = '';   // Initialize to empty string

            // 1. Handle ID Document Picture
            if (req.files && req.files.idDocumentPicture && req.files.idDocumentPicture[0]) {
                newCustomer.idDocumentPicture = req.files.idDocumentPicture[0].filename;
            } else if (newCustomer.idDocumentPictureBase64 && newCustomer.idDocumentPictureBase64.startsWith('data:image')) {
                const base64Data = newCustomer.idDocumentPictureBase64.split(';base64,').pop();
                const idFileName = `id-${Date.now()}.png`; // Generate a unique filename
                const filePath = path.join(uploadsDir, idFileName);
                await fs.writeFile(filePath, base64Data, 'base64');
                newCustomer.idDocumentPicture = idFileName; // Save only the filename
            }
            
            // 2. Handle Customer Picture
            if (req.files && req.files.customerPicture && req.files.customerPicture[0]) {
                newCustomer.customerPicture = req.files.customerPicture[0].filename;
            } else if (newCustomer.customerPictureBase64 && newCustomer.customerPictureBase64.startsWith('data:image')) {
                const base64Data = newCustomer.customerPictureBase64.split(';base64,').pop();
                const customerFileName = `customer-${Date.now()}.png`; // Generate a unique filename
                const filePath = path.join(uploadsDir, customerFileName);
                await fs.writeFile(filePath, base64Data, 'base64');
                newCustomer.customerPicture = customerFileName; // Save only the filename
            }

            // --- CRUCIAL FIX: Delete the Base64 fields from newCustomer object ---
            // Ye is liye zaroori hai takay Base64 string JSON file mein save na ho.
            delete newCustomer.idDocumentPictureBase64;
            delete newCustomer.customerPictureBase64;
            
            customers.push(newCustomer);
            await writeJSONFile(CUSTOMERS_FILE, customers);
            res.redirect('/customers'); // Redirect back to the customer list page
        } catch (error) {
            console.error('Error adding customer:', error);
            res.status(500).send('Error while saving the Customer. Please try again!۔');
        }
    });

    // GET route for individual customer view page
    router.get('/customer-view/:code', async (req, res) => {
        try {
            const customerCode = req.params.code;
            const customers = await readJSONFile(CUSTOMERS_FILE);
            const customer = customers.find(c => c.code === customerCode);

            if (!customer) {
                return res.status(404).render('customer-view', { customer: null, customerPurchases: [] });
            }

            const purchases = await readJSONFile(PURCHASES_FILE);
            // Filter purchases relevant to this customer
            const customerPurchases = purchases.filter(p => p.customerCode === customerCode);

            res.render('customer-view', { customer: customer, customerPurchases: customerPurchases });
        } catch (error) {
            console.error('Error fetching customer view:', error);
            res.status(500).send('گاہک کی تفصیلات لوڈ کرنے میں خرابی۔');
        }
    });

    // DELETE route to delete a customer
    router.delete('/delete/:code', async (req, res) => {
        try {
            const customerCodeToDelete = req.params.code;
            let customers = await readJSONFile(CUSTOMERS_FILE);

            const customerToDelete = customers.find(c => c.code === customerCodeToDelete);

            if (customerToDelete) {
                // Delete associated image files from uploads folder
                // Use path.join to ensure correct path construction
                if (customerToDelete.idDocumentPicture) {
                    const imagePath = path.join(uploadsDir, customerToDelete.idDocumentPicture);
                    await fs.unlink(imagePath).catch(err => console.warn(`Could not delete ID picture ${imagePath}:`, err.message));
                }
                if (customerToDelete.customerPicture) {
                    const imagePath = path.join(uploadsDir, customerToDelete.customerPicture);
                    await fs.unlink(imagePath).catch(err => console.warn(`Could not delete customer picture ${imagePath}:`, err.message));
                }

                customers = customers.filter(c => c.code !== customerCodeToDelete);
                await writeJSONFile(CUSTOMERS_FILE, customers);
                res.json({ success: true, message: 'گاہک کامیابی سے حذف کر دیا گیا ہے۔' });
            } else {
                res.status(404).json({ success: false, message: 'گاہک نہیں ملا۔' });
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            res.status(500).json({ success: false, message: 'گاہک کو حذف کرتے وقت کوئی خرابی پیش آئی۔' });
        }
    });

    return router; // Return the configured router instance
};