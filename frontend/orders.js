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

        // Flatten all products from all orders for the table view
        const allOrderedProducts = [];
        orders.forEach(order => {
            (order.products || []).forEach(item => {
                allOrderedProducts.push({
                    name: item.title || item.name,
                    category: item.category || 'Books',
                    price: item.price,
                    image: item.image || item.imageUrl || 'assets/placeholder.png',
                    orderId: order._id.slice(-8).toUpperCase(),
                    orderDate: new Date(order.createdAt).toLocaleDateString(),
                    inStock: true // Static as requested in UI
                });
            });
        });

        ordersList.innerHTML = `
            <div class="flex-1 py-10 flex flex-col justify-between">
                <div class="w-full">
                    <h2 class="pb-4 text-2xl font-bold text-gray-800">Your Ordered Books</h2>
                    <div class="flex flex-col items-center w-full overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm">
                        <table class="md:table-auto table-fixed w-full overflow-hidden">
                            <thead class="bg-gray-50 text-gray-900 text-sm text-left">
                                <tr>
                                    <th class="px-6 py-4 font-semibold truncate">Product</th>
                                    <th class="px-6 py-4 font-semibold truncate">Category</th>
                                    <th class="px-6 py-4 font-semibold truncate hidden md:table-cell">Price</th>
                                    <th class="px-6 py-4 font-semibold truncate">Notification</th>
                                </tr>
                            </thead>
                            <tbody class="text-sm text-gray-600">
                                ${allOrderedProducts.map((product, index) => `
                                    <tr class="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td class="px-6 py-4 flex items-center space-x-4">
                                            <div class="flex-shrink-0 w-16 h-20 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.src='assets/placeholder.png'">
                                            </div>
                                            <div class="flex flex-col truncate">
                                                <span class="font-medium text-gray-900 truncate">${product.name}</span>
                                                <span class="text-xs text-gray-400">Order #${product.orderId} • ${product.orderDate}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 capitalize">${product.category}</td>
                                        <td class="px-6 py-4 hidden md:table-cell font-medium text-gray-900">₹${product.price}</td>
                                        <td class="px-6 py-4">
                                            <label class="relative inline-flex items-center cursor-pointer group">
                                                <input type="checkbox" class="sr-only peer" ${product.inStock ? 'checked' : ''}>
                                                <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors duration-200 ring-4 ring-transparent group-hover:ring-orange-50"></div>
                                                <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5 shadow-sm"></div>
                                            </label>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchOrders);
    } else {
        fetchOrders();
    }
})();
