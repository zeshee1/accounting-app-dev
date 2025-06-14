$(document).ready(function () {
    let itemCounter = 0;

    // Product list (normally you load via AJAX, but here it's hardcoded for demonstration)
    const productsList = [
        { code: "ITM001", name: "Copper Wire" },
        { code: "ITM002", name: "Iron Scrap" },
        { code: "ITM003", name: "Plastic Drum" },
        { code: "ITM004", name: "Aluminum Can" },
        { code: "ITM005", name: "Battery Scrap" }
    ];

    // --- Helper function to add a new item row ---
    function addItemRow(itemCode = '', description = '', weight = '', price = '') {
        itemCounter++;
        const itemHtml = `
            <div class="card item-row mb-3" id="itemRow-${itemCounter}">
                <div class="card-body row g-2">
                    <div class="col-md-2">
                        <label class="form-label">Item Code:</label>
                        <input type="text" class="form-control item-code" id="itemCode-${itemCounter}" placeholder="e.g., ITM001" value="${itemCode}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Description:</label>
                        <input type="text" class="form-control item-description" id="itemDescription-${itemCounter}" value="${description}" placeholder="Auto-filled from code" readonly required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Weight (kg):</label>
                        <div class="input-group"> <input type="number" step="0.01" class="form-control item-weight" id="itemWeight-${itemCounter}" value="${weight}" required>
                            <button class="btn btn-secondary btn-sm fetch-scale-btn" type="button" data-item-id="${itemCounter}">Fetch Scale</button> </div>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Price/Kg (PKR):</label>
                        <input type="number" step="0.01" class="form-control item-price" id="itemPrice-${itemCounter}" value="${price}" required>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Total (PKR):</label>
                        <input type="number" step="0.01" class="form-control item-total" id="itemTotal-${itemCounter}" value="0.00" readonly>
                        <button type="button" class="btn btn-danger btn-sm mt-2 removeItemBtn" data-row-id="itemRow-${itemCounter}">Remove</button>
                    </div>
                </div>
            </div>
        `;
        $('#itemsContainer').append(itemHtml);
    }

    // Helper function to generate a unique invoice ID
function generateUniqueInvoiceId() {
    // Har baar ek naya timestamp-based unique ID generate karega
    return Date.now();
}

    // --- Calculate Item Total and Grand Total ---
    function calculateTotals() {
        let grandTotal = 0;
        $('.item-row').each(function () {
            const row = $(this);
            const weight = parseFloat(row.find('.item-weight').val()) || 0;
            const price = parseFloat(row.find('.item-price').val()) || 0;
            const itemTotal = weight * price;
            row.find('.item-total').val(itemTotal.toFixed(2)); // Display with 2 decimal places
            grandTotal += itemTotal;
        });
        $('#grandTotal').val(grandTotal.toFixed(2)); // Update the grand total field
    }

    // --- Event Listeners for Item Rows ---
    // Delegated events for dynamically added elements
    $('#itemsContainer').on('input', '.item-weight, .item-price', function () {
        calculateTotals();
    });

    $('#itemsContainer').on('input', '.item-code', function () {
        const inputField = $(this);
        const itemCode = inputField.val().trim();
        const parentRow = inputField.closest('.item-row');
        const descriptionField = parentRow.find('.item-description');

        const foundProduct = productsList.find(p => p.code === itemCode);

        if (foundProduct) {
            descriptionField.val(foundProduct.name);
        } else {
            descriptionField.val('Unknown Item'); // Clear if code doesn't match
        }
    });

    // --- Remove Item Row ---
    $('#itemsContainer').on('click', '.removeItemBtn', function () {
        const rowId = $(this).data('row-id');
        $(`#${rowId}`).remove();
        calculateTotals(); // Recalculate total after removing an item
    });

    // --- Add Item Button Click ---
    $('#addItemBtn').on('click', function () {
        addItemRow(); // Add a new empty row
    });

    // Add an initial item row on page load
    addItemRow();

    // --- Signature Pad Initialization ---
    const canvas = document.getElementById('signaturePad');
    let signaturePad; // Declare signaturePad outside the if block to make it accessible globally within this scope

    if (canvas) { // Check if canvas element exists
        signaturePad = new SignaturePad(canvas); // Assign to the declared variable

        $('#clearSignature').on('click', function () {
            signaturePad.clear();
        });
    } else {
        console.error("Signature pad canvas not found!");
    }


    // --- Fetch Customer Details ---
    $('#fetchCustomerBtn').on('click', function () {
        const customerCodeInput = $('#registrationCode').val().trim();

        if (!customerCodeInput) {
            alert('Please enter a Customer Code.');
            return;
        }

        $.ajax({
            url: `/api/customer-by-code/${customerCodeInput}`,
            method: 'GET',
            success: function (customer) {
                if (customer) {
                    $('#customerId').val(customer.code || ''); // Store the actual customer code/ID
                    $('#customerName').val(customer.name || '');
                    $('#customerPhone').val(customer.phone || '');
                    $('#customerEmail').val(customer.emailAddress || '');
                    $('#idCardNumber').val(customer.idCardNumber || '');
                    $('#passportNumber').val(customer.passportNumber || '');
                    $('#idCardExpiry').val(customer.idCardExpiry || '');
                    $('#passportExpiry').val(customer.passportExpiry || '');
                    $('#nationality').val(customer.nationality || '');
                    $('#province').val(customer.province || '');
                    $('#city').val(customer.city || '');
                    $('#streetAddress').val(customer.streetAddress || '');
                    $('#contactNumber2').val(customer.contactNumber2 || '');
                    $('#vehicleModel').val(customer.vehicleModel || '');
                    $('#vehiclePlateNumber').val(customer.vehiclePlateNumber || '');
                    $('#vehicleColour').val(customer.vehicleColour || '');
                    $('#vehicleType').val(customer.vehicleType || '');

                    // Handle hidden input for filenames
                    $('#idDocumentPictureHidden').val(customer.idDocumentPicture || '');
                    $('#customerPictureHidden').val(customer.customerPicture || '');

                    // Handle picture previews
                    const baseUrl = '/uploads/';
                    if (customer.idDocumentPicture) {
                        $('#idDocumentPicturePreview').attr('src', baseUrl + customer.idDocumentPicture).show();
                    } else {
                        $('#idDocumentPicturePreview').hide().attr('src', '');
                    }
                    if (customer.customerPicture) {
                        $('#customerPicturePreview').attr('src', baseUrl + customer.customerPicture).show();
                    } else {
                        $('#customerPicturePreview').hide().attr('src', '');
                    }

                    alert('Customer details fetched successfully!');
                } else {
                    alert('Customer not found.');
                    // Clear all fields if customer not found
                    $('#registrationCode').val('');
                    $('#customerId').val(''); // Clear the hidden ID
                    $('#customerName, #customerPhone, #customerEmail, #idCardNumber, #passportNumber, #idCardExpiry, ' +
                        '#passportExpiry, #nationality, #province, #city, #streetAddress, #contactNumber2, ' +
                        '#vehicleModel, #vehiclePlateNumber, #vehicleColour, #vehicleType').val('');
                    $('#idDocumentPictureHidden, #customerPictureHidden').val('');
                    $('#idDocumentPicturePreview, #customerPicturePreview').hide().attr('src', '');
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert('Error fetching customer: ' + (jqXHR.responseJSON ? jqXHR.responseJSON.message : textStatus));
                console.error('Error fetching customer:', errorThrown, jqXHR.responseText);
                // Clear all fields on error
                $('#registrationCode').val('');
                $('#customerId').val('');
                $('#customerName, #customerPhone, #customerEmail, #idCardNumber, #passportNumber, #idCardExpiry, ' +
                    '#passportExpiry, #nationality, #province, #city, #streetAddress, #contactNumber2, ' +
                    '#vehicleModel, #vehiclePlateNumber, #vehicleColour, #vehicleType').val('');
                $('#idDocumentPictureHidden, #customerPictureHidden').val('');
                $('#idDocumentPicturePreview, #customerPicturePreview').hide().attr('src', '');
            }
        });
    });


    // --- Fetch Scale Data ---
    // Delegated event for dynamically added fetch scale buttons
    $('#itemsContainer').on('click', '.fetch-scale-btn', function () {
        const button = $(this);
        const itemRow = button.closest('.item-row');
        const weightField = itemRow.find('.item-weight');

        button.prop('disabled', true).text('Fetching...'); // Disable button and show loading text

        // Replace with actual AJAX call to your scale API
        // Example: $.ajax({ url: '/api/scale-data', method: 'GET', success: function(response) { ... } });
        setTimeout(() => { // Using setTimeout to simulate an async call for demonstration
            const fetchedWeight = (Math.random() * 50 + 1).toFixed(2); // Random weight for demonstration
            weightField.val(fetchedWeight);
            calculateTotals(); // Recalculate totals after updating weight

            button.prop('disabled', false).text('Fetch Scale'); // Re-enable button
            alert(`Weight fetched: ${fetchedWeight} kg`);
        }, 1500); // Simulate 1.5 second delay

        /* // Uncomment and modify this if you have a backend endpoint for your scale
        $.ajax({
            url: '/api/scale-data', // Replace with your actual scale API endpoint
            method: 'GET',
            success: function (response) {
                if (response && response.weight !== undefined) {
                    weightField.val(parseFloat(response.weight).toFixed(2));
                    calculateTotals();
                    alert(`Weight fetched: ${response.weight} kg`);
                } else {
                    alert('Failed to fetch weight from scale.');
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert('Error fetching scale data: ' + (jqXHR.responseJSON ? jqXHR.responseJSON.message : textStatus));
                console.error('Scale error:', errorThrown, jqXHR.responseText);
            },
            complete: function() {
                button.prop('disabled', false).text('Fetch Scale'); // Re-enable button in any case
            }
        });
        */
    });


    // --- Form Submission for Purchase Invoice Generation ---
    $('#purchaseForm').on('submit', function (e) {
        e.preventDefault(); // Prevent default form submission

        const customerId = $('#customerId').val();
        if (!customerId) {
            alert('Please fetch customer details first by entering a Customer Code.');
            return;
        }

        const items = [];
        let validItems = true;
        $('.item-row').each(function () {
            const row = $(this);
            const itemCode = row.find('.item-code').val();
            const desc = row.find('.item-description').val();
            const weight = parseFloat(row.find('.item-weight').val());
            const price = parseFloat(row.find('.item-price').val());
            const total = parseFloat(row.find('.item-total').val());

            if (!itemCode || !desc || isNaN(weight) || isNaN(price) || isNaN(total)) {
                validItems = false;
                return false; // Break the loop
            }
            items.push({ itemCode, description: desc, weight, price, total });
        });

        if (!validItems || items.length === 0) {
            alert("Please fill all item fields correctly before generating the invoice.");
            return;
        }

        // Ensure signaturePad exists and is initialized before calling its methods
        let signatureDataUrl = null;
        if (typeof signaturePad !== 'undefined' && signaturePad) {
            signatureDataUrl = signaturePad.isEmpty() ? null : signaturePad.toDataURL();
        } else {
            console.warn("SignaturePad not initialized or unavailable. Skipping signature capture.");
        }
        
        const totalBill = parseFloat($('#grandTotal').val()); // Get grand total from the input field
        if (isNaN(totalBill) || totalBill <= 0) {
            alert("Total amount must be greater than zero.");
            return;
        }

        // Collect all other fields from the form
        const customerName = $('#customerName').val();
        const customerPhone = $('#customerPhone').val();
        const idCardNumber = $('#idCardNumber').val();
        const passportNumber = $('#idCardNumber').val(); // Corrected from passportNumber to idCardNumber, assuming it's the same
        const idCardExpiry = $('#idCardExpiry').val();
        const passportExpiry = $('#passportExpiry').val();
        const nationality = $('#nationality').val();
        const province = $('#province').val();
        const city = $('#city').val();
        const streetAddress = $('#streetAddress').val();
        const contactNumber2 = $('#contactNumber2').val();
        const emailAddress = $('#customerEmail').val();
        const vehicleModel = $('#vehicleModel').val();
        const vehiclePlateNumber = $('#vehiclePlateNumber').val();
        const vehicleColour = $('#vehicleColour').val();
        const nifDniType = $('#nifDniType').val();
        const buyerName = $('#buyerName').val();
        const weigherName = $('#weigherName').val();
        const vehicleType = $('#vehicleType').val();
        const comment = $('#comment').val();
        const customerBehaviour = $('#customerBehaviour').val();
        const consentText = $('#consentText').val();

        // Image file names from hidden inputs (populated after customer fetch)
        const idDocumentPicture = $('#idDocumentPictureHidden').val();
        const customerPicture = $('#customerPictureHidden').val();

        $.ajax({
            url: '/api/generate-purchase-invoice',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                customerId,
                customerName,
                customerPhone,
                idCardNumber,
                passportNumber,
                idCardExpiry,
                passportExpiry,
                nationality,
                province,
                city,
                streetAddress,
                contactNumber2,
                emailAddress,
                vehicleModel,
                vehiclePlateNumber,
                vehicleColour,
                idDocumentPicture,
                customerPicture,
                nifDniType,
                buyerName,
                weigherName,
                vehicleType,
                comment,
                customerBehaviour,
                consentText,
                items,
                totalBill,
                signature: signatureDataUrl
            }),
            success: function (res) {
                alert(res.message);
                window.location.href = res.redirectTo;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                const errorMessage = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Failed to generate invoice.';
                alert(errorMessage);
                console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
            }
        });
    });

    // Ensure initial calculation if there are pre-filled items (though currently not used)
    calculateTotals();
});