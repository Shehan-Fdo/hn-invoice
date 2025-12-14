// Set Date and Time
document.getElementById('invDate').innerText = new Date().toLocaleDateString();
document.getElementById('invTime').innerText = new Date().toLocaleTimeString();

const searchInput = document.getElementById('productSearch');
const resultsBox = document.getElementById('searchResults');
const tableBody = document.querySelector('#invoiceTable tbody');
let invoiceItems = [];

// Search Logic
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 2) {
        resultsBox.style.display = 'none';
        return;
    }

    try {
        console.log(`Searching for: ${query}`);
        const res = await fetch(`/api/search?q=${query}`);

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
    const existing = invoiceItems.find(i => i._id === product._id);
    if (existing) {
        existing.qty++;
    } else {
        invoiceItems.push({ ...product, qty: 1 });
    }
    renderTable();
    resultsBox.style.display = 'none';
    searchInput.value = '';
}

function updateQty(id, newQty) {
    const item = invoiceItems.find(i => i._id === id);
    if (item) {
        item.qty = parseInt(newQty);
        if (item.qty <= 0) removeItem(id);
        else renderTable();
    }
}

function removeItem(id) {
    invoiceItems = invoiceItems.filter(i => i._id !== id);
    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';
    let subTotal = 0;
    let totalProfit = 0;

    invoiceItems.forEach(item => {
        const total = item.sellingPrice * item.qty;
        const profit = (item.sellingPrice - item.buyingPrice) * item.qty;
        subTotal += total;
        totalProfit += profit;

        const row = `
            <tr>
                <td>${item.name}</td>
                <td>${item.sellingPrice}</td>
                <td><input type="number" value="${item.qty}" onchange="updateQty('${item._id}', this.value)" style="width: 50px;"></td>
                <td>${total}</td>
                <td class="no-print"><button onclick="removeItem('${item._id}')" style="background:white; color:black; padding:5px;">X</button></td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    document.getElementById('subTotal').innerText = subTotal.toFixed(2);
    document.getElementById('totalProfit').innerText = totalProfit.toFixed(2);
}

// Export PDF - renders as professional document
function exportPDF() {
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
        });
    }, 100);
}

// Export Image - renders as professional document
function exportImage() {
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
        });
    }, 100);
}