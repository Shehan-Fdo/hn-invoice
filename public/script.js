// Set Date and Time
document.getElementById('invDate').innerText = new Date().toLocaleDateString();
document.getElementById('invTime').innerText = new Date().toLocaleTimeString();

// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const searchInput = document.getElementById('productSearch');
const resultsBox = document.getElementById('searchResults');
const tableBody = document.querySelector('#invoiceTable tbody');
let invoiceItems = [];

// --- Auto-Save Logic ---
const STORAGE_KEY = 'HN_INVOICE_ITEMS';

function saveToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoiceItems));
}

function loadFromLocal() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            invoiceItems = JSON.parse(saved);
            renderTable();
        } catch (e) {
            console.error('Error loading saved invoice:', e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }
}

// Load saved data on startup
// Load saved data on startup
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (orderId) {
        // Edit Mode
        loadOrderForEdit(orderId);
    } else {
        // Normal Mode
        loadFromLocal();
    }
});

let currentOrderId = null; // Track if we are editing

async function loadOrderForEdit(id) {
    try {
        const res = await fetch(`/api/sales/${id}`);
        if (!res.ok) throw new Error('Order not found');

        const order = await res.json();
        currentOrderId = order.id;
        // Map DB 'price' back to 'sellingPrice' for frontend compatibility
        invoiceItems = order.items.map(i => ({
            ...i,
            sellingPrice: i.price !== undefined ? i.price : i.sellingPrice,
            buyingPrice: i.buyingPrice || 0 // Ensure this exists
        }));

        // Show indicator
        const header = document.querySelector('.header div:last-child');
        const statusBadge = document.createElement('div');
        statusBadge.innerHTML = `<span style="background:${order.status === 'draft' ? '#ff9800' : '#4caf50'}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8em; font-weight:bold;">${order.status.toUpperCase()} (ID: ${order.id})</span>`;
        if (header) header.prepend(statusBadge);

        renderTable();
    } catch (e) {
        console.error(e);
        alert('Could not load order for editing');
    }
}

// Search Logic
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 2) {
        resultsBox.style.display = 'none';
        return;
    }

    try {
        console.log(`Searching for: ${query}`);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

        if (!res.ok) {
            throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }

        const products = await res.json();
        console.log('Search results:', products);

        resultsBox.innerHTML = '';
        if (products.length > 0) {
            resultsBox.style.display = 'block';
            products.forEach(prod => {
                const div = document.createElement('div');
                div.innerText = `${prod.name} - LKR ${prod.sellingPrice}`;
                div.onclick = () => addToInvoice(prod);
                resultsBox.appendChild(div);
            });
        } else {
            resultsBox.style.display = 'none';
        }
    } catch (error) {
        console.error('Search failed:', error);
        // Optional: Show error in UI
        // resultsBox.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
        // resultsBox.style.display = 'block';
    }
});

function addToInvoice(product) {
    // Check if exists
    const existing = invoiceItems.find(i => i.id === product.id);
    if (existing) {
        existing.qty++;
    } else {
        invoiceItems.push({ ...product, qty: 1 });
    }
    saveToLocal(); // Auto-save
    renderTable();
    resultsBox.style.display = 'none';
    searchInput.value = '';
}

function updateQty(id, newQty) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    const item = invoiceItems.find(i => i.id === numericId);
    if (item) {
        item.qty = parseInt(newQty, 10);
        if (item.qty <= 0) removeItem(numericId);
        else {
            saveToLocal(); // Auto-save
            renderTable();
        }
    }
}

function removeItem(id) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    invoiceItems = invoiceItems.filter(i => i.id !== numericId);
    saveToLocal(); // Auto-save
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';
    let subTotal = 0;
    let totalProfit = 0;

    invoiceItems.forEach(item => {
        const total = item.sellingPrice * item.qty;
        const buyingPrice = item.buyingPrice || 0; // Default to 0 if null/undefined
        const profit = (item.sellingPrice - buyingPrice) * item.qty;
        subTotal += total;
        totalProfit += profit;

        const row = `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.sellingPrice}</td>
                <td><input type="number" value="${item.qty}" onchange="updateQty('${item.id}', this.value)" style="width: 50px;"></td>
                <td>${total}</td>
                <td class="no-print"><button onclick="removeItem('${item.id}')" style="background:white; color:black; padding:5px;">X</button></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    document.getElementById('subTotal').innerText = subTotal.toFixed(2);
    document.getElementById('totalProfit').innerText = totalProfit.toFixed(2);
}

// Save sale to database (Modified for Edit/Draft)
async function saveSale(status = 'completed') {
    if (invoiceItems.length === 0) {
        return false;
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const profit = invoiceItems.reduce((sum, item) => {
        const buyingPrice = item.buyingPrice || 0;
        return sum + ((item.sellingPrice - buyingPrice) * item.qty);
    }, 0);

    const payload = {
        items: invoiceItems.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.sellingPrice,
            total: item.sellingPrice * item.qty,
            // Preserve other fields if needed, but for DB storage that's usually enough
            // Note: If buyingPrice is needed for future profit calcs on re-edit, it should be in items array. 
            // The Schema currently stores a JSON string.
            buyingPrice: item.buyingPrice, // Added to ensure profit calc works on re-edit
            id: item.id
        })),
        subtotal: subtotal,
        profit: profit,
        status: status
    };

    try {
        let url = '/api/sales';
        let method = 'POST';

        if (currentOrderId) {
            url = `/api/sales/${currentOrderId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving sale:', error);
        return false;
    }
}

// Explicit Save Draft Button
async function saveDraft() {
    const success = await saveSale('draft');
    if (success) {
        alert('✅ Draft saved successfully!');
        if (!currentOrderId) {
            // If it was a new draft, maybe clear or redirect?
            // For now, let's just clear
            invoiceItems = [];
            saveToLocal();
            renderTable();
        } else {
            // If editing, maybe stay on page?
            // Reload to verify or just stay
        }
    } else {
        alert('❌ Failed to save draft.');
    }
}

// Prompt to save sale after export
function promptSaveSale() {
    if (invoiceItems.length === 0) return;

    if (confirm('✅ Export complete!\n\nAdd this invoice to sales records?')) {
        saveSale().then(success => {
            if (success) {
                alert('✅ Sale saved to records!');
                // Clear the invoice
                invoiceItems = [];
                currentOrderId = null; // Reset edit mode
                saveToLocal(); // Clear storage
                renderTable();
            } else {
                alert('❌ Failed to save sale. Please try again.');
            }
        });
    }
}

// Export PDF - renders as professional document
function exportPDF() {
    if (invoiceItems.length === 0) {
        alert('Please add items to the invoice first.');
        return;
    }

    const element = document.getElementById('invoice-area');

    // Hide all web UI elements
    const noPrintElements = document.querySelectorAll('.no-print');
    const controls = document.querySelector('.controls');
    const actions = document.querySelector('.actions');
    const nav = document.querySelector('.nav');

    noPrintElements.forEach(el => el.style.display = 'none');
    if (controls) controls.style.display = 'none';
    if (actions) actions.style.display = 'none';
    if (nav) nav.style.display = 'none';

    // Store original styles
    const originalBg = document.body.style.background;
    const originalPadding = document.body.style.padding;
    const originalBoxShadow = element.style.boxShadow;

    // Apply clean document styling
    document.body.style.background = '#ffffff';
    document.body.style.padding = '0';
    element.style.boxShadow = 'none';

    // Wait a bit for DOM to update before capturing
    setTimeout(() => {
        const opt = {
            margin: 0.5,
            filename: `HN_Electronics_Invoice_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 3,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            },
            jsPDF: {
                unit: 'in',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore all elements
            noPrintElements.forEach(el => el.style.display = '');
            if (controls) controls.style.display = '';
            if (actions) actions.style.display = '';
            if (nav) nav.style.display = '';

            // Restore original styles
            document.body.style.background = originalBg;
            document.body.style.padding = originalPadding;
            element.style.boxShadow = originalBoxShadow;

            // Prompt to save sale
            setTimeout(() => promptSaveSale(), 300);
        });
    }, 100);
}

// Export Image - renders as professional document
function exportImage() {
    if (invoiceItems.length === 0) {
        alert('Please add items to the invoice first.');
        return;
    }

    const element = document.getElementById('invoice-area');

    // Hide all web UI elements
    const noPrintElements = document.querySelectorAll('.no-print');
    const controls = document.querySelector('.controls');
    const actions = document.querySelector('.actions');
    const nav = document.querySelector('.nav');

    noPrintElements.forEach(el => el.style.display = 'none');
    if (controls) controls.style.display = 'none';
    if (actions) actions.style.display = 'none';
    if (nav) nav.style.display = 'none';

    // Store original styles
    const originalBg = document.body.style.background;
    const originalPadding = document.body.style.padding;
    const originalBoxShadow = element.style.boxShadow;

    // Apply clean document styling
    document.body.style.background = '#ffffff';
    document.body.style.padding = '0';
    element.style.boxShadow = 'none';

    // Wait a bit for DOM to update before capturing
    setTimeout(() => {
        html2canvas(element, {
            scale: 3,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            useCORS: true
        }).then(canvas => {
            // Restore all elements
            noPrintElements.forEach(el => el.style.display = '');
            if (controls) controls.style.display = '';
            if (actions) actions.style.display = '';
            if (nav) nav.style.display = '';

            // Restore original styles
            document.body.style.background = originalBg;
            document.body.style.padding = originalPadding;
            element.style.boxShadow = originalBoxShadow;

            const link = document.createElement('a');
            link.download = `HN_Electronics_Invoice_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

            // Prompt to save sale
            setTimeout(() => promptSaveSale(), 300);
        });
    }, 100);
}

// Export POS Receipt (58mm width thermal printer format) using pdfmake
function exportPOS() {
    if (invoiceItems.length === 0) {
        alert('Please add items to the invoice first.');
        return;
    }

    const subTotal = invoiceItems.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const dateStr = new Date().toLocaleString();

    // Define table body dynamically
    const tableBody = [];

    // items
    invoiceItems.forEach(item => {
        tableBody.push([
            { text: item.name, style: 'item', colSpan: 2 }, {}
        ]);
        tableBody.push([
            { text: `${item.qty} x ${item.sellingPrice.toFixed(2)}`, style: 'itemDetail' },
            { text: (item.qty * item.sellingPrice).toFixed(2), style: 'itemPrice', alignment: 'right' }
        ]);
    });

    // Document Definition for pdfmake
    const docDefinition = {
        pageSize: { width: 164, height: 'auto' }, // ~58mm width
        pageMargins: [4, 4, 4, 4], // Minimal margins
        content: [
            { text: 'HN Electronics', style: 'header', alignment: 'center' },
            { text: 'Tel: 078 663 7512', style: 'subheader', alignment: 'center' },
            { text: dateStr, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 5] },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 156, y2: 0, lineWidth: 1, dash: { length: 2 } }] },
            { text: ' ', fontSize: 2 }, // Spacer

            ...tableBody.flat().map((row, index) => {
                // The flat() above is a bit tricky with how I built tableBody. 
                // Actually pdfmake handles stacks. Let's do a vertical stack for items instead of a table 
                // to completely control the narrow layout validation.
                return null;
            }).filter(x => x), // Clean up if I change mind. 

            // Let's stick to a simple stack approach, it's safer for receipts than tables which might overflow
        ],
        styles: {
            header: { fontSize: 10, bold: true },
            subheader: { fontSize: 8 },
            item: { fontSize: 8, bold: true, margin: [0, 2, 0, 0] },
            itemDetail: { fontSize: 8, margin: [0, 0, 0, 2] },
            itemPrice: { fontSize: 8, bold: true, margin: [0, 0, 0, 2] },
            totalLabel: { fontSize: 9, bold: true },
            totalValue: { fontSize: 9, bold: true },
            footer: { fontSize: 8, italics: true }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    // Re-build content array cleanly
    const content = [];

    // Header
    content.push({ text: 'HN Electronics', style: 'header', alignment: 'center' });
    content.push({ text: 'Tel: 078 663 7512', style: 'subheader', alignment: 'center' });
    content.push({ text: dateStr, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 5] });
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 155, y2: 0, lineWidth: 0.5, dash: { length: 2 } }] });
    content.push({ text: ' ', fontSize: 4 });

    // Items
    invoiceItems.forEach(item => {
        content.push({ text: item.name, style: 'item' });
        content.push({
            columns: [
                { text: `${item.qty} x ${item.sellingPrice.toFixed(2)}`, style: 'itemDetail', width: '*' },
                { text: (item.qty * item.sellingPrice).toFixed(2), style: 'itemPrice', width: 'auto', alignment: 'right' }
            ]
        });
    });

    content.push({ text: ' ', fontSize: 4 });
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 155, y2: 0, lineWidth: 0.5, dash: { length: 2 } }] });
    content.push({ text: ' ', fontSize: 4 });

    // Total
    content.push({
        columns: [
            { text: 'TOTAL:', style: 'totalLabel', width: '*' },
            { text: `LKR ${subTotal.toFixed(2)}`, style: 'totalValue', width: 'auto', alignment: 'right' }
        ]
    });

    content.push({ text: ' ', fontSize: 4 });
    content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 155, y2: 0, lineWidth: 0.5, dash: { length: 2 } }] });

    // Footer
    content.push({ text: 'Thank you!', style: 'footer', alignment: 'center', margin: [0, 10, 0, 2] });
    content.push({ text: 'Shop Again.', style: 'footer', alignment: 'center' });

    docDefinition.content = content;

    // Create and download
    pdfMake.createPdf(docDefinition).download(`Receipt_${new Date().toISOString().slice(0, 10)}.pdf`, () => {
        // Prompt to save sale
        setTimeout(() => promptSaveSale(), 300);
    });
}
