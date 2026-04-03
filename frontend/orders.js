(function() {
    'use strict';

    const ordersList = document.getElementById('ordersList');

    function getApiBaseCandidates() {
        const savedApiBaseUrl = localStorage.getItem("timelessPagesApiBaseUrl");
        const { protocol, hostname, port, origin } = window.location;
        const isHttpPage = protocol === "http:" || protocol === "https:";
        
        // Prioritize localhost:5000 as it's the primary backend for this demo
        const priorityCandidates = ["http://localhost:5000", "http://127.0.0.1:5000"];

        if (savedApiBaseUrl) {
            priorityCandidates.push(savedApiBaseUrl.replace(/\/$/, ""));
        }

        if (isHttpPage && port === "5000") {
            priorityCandidates.push(origin);
        }

        if (isHttpPage && hostname) {
            priorityCandidates.push(`${protocol}//${hostname}:5000`);
        }

        return [...new Set(priorityCandidates)];
    }

    async function fetchOrders() {
        const token = localStorage.getItem('timelessPagesUserToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const candidates = getApiBaseCandidates();
        let lastError = null;

        for (const baseUrl of candidates) {
            try {
                // Try both singular and plural versions for robustness
                const paths = ['/api/order/my-orders', '/api/orders/my-orders'];
                let success = false;

                for (const path of paths) {
                    const targetUrl = `${baseUrl}${path}`;
                    console.log(`Attempting to fetch orders from: ${targetUrl}`);
                    
                    const response = await fetch(targetUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.status === 401) {
                        localStorage.removeItem('timelessPagesUserToken');
                        window.location.href = 'login.html';
                        return;
                    }

                    if (response.ok) {
                        const orders = await response.json();
                        localStorage.setItem("timelessPagesApiBaseUrl", baseUrl);
                        renderOrders(orders);
                        success = true;
                        break;
                    } else if (response.status !== 404) {
                        // If it's not a 404 (e.g. 500), don't bother trying other paths on this base
                        throw new Error(`Server returned ${response.status} for ${path}`);
                    }
                }

                if (success) return;
                throw new Error("Server returned 404 for all known order paths");

            } catch (error) {
                console.warn(`Failed to fetch from ${baseUrl}:`, error);
                lastError = error;
            }
        }

        console.error('All fetch attempts failed:', lastError);
        ordersList.innerHTML = `<div class="error-state">
            <h3>Unable to load orders</h3>
            <p>Error: ${lastError?.message || 'Unknown connection error'}</p>
            <p>Target: ${candidates.join(', ')}</p>
            <p>Please ensure the backend server is running on port 5000.</p>
            <button onclick="window.location.reload()" class="cart-checkout-btn" style="width:auto; display:inline-block; margin-top:10px;">Retry</button>
        </div>`;
    }

    function renderOrders(orders) {
        if (!orders || orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-orders">
                    <h3>No orders found</h3>
                    <p>Looks like you haven't placed any orders yet. Start exploring our collection!</p>
                    <a href="book.html" class="cart-checkout-btn" style="display:inline-block; width:auto;">Browse Books</a>
                </div>
            `;
            return;
        }

        ordersList.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-header-info">
                        <span>Order Date</span>
                        <p>${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div class="order-header-info">
                        <span>Total Amount</span>
                        <p>₹${order.totalAmount}</p>
                    </div>
                    <div class="order-header-info">
                        <span>Order ID</span>
                        <p>#${order._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div class="order-header-info">
                        <span>Status</span>
                        <p><span class="order-status-badge status-${(order.orderStatus || 'confirmed').toLowerCase()}">${order.orderStatus || 'Confirmed'}</span></p>
                    </div>
                </div>
                <div class="order-body">
                    <div class="order-items">
                        ${(order.products || []).map(item => `
                            <div class="order-item">
                                <img src="${item.image || item.imageUrl || 'assets/placeholder.png'}" alt="${item.title}" onerror="this.src='assets/placeholder.png'">
                                <div class="order-item-info">
                                    <h4>${item.title}</h4>
                                    <p>Qty: ${item.qty} • ₹${item.price} each</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchOrders);
    } else {
        fetchOrders();
    }
})();
