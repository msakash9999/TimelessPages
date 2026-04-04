/**
 * Shared logic for handling Cash On Delivery (COD) orders across TimelessPages.
 */

/**
 * Processes a COD order by sending data to the backend and showing a success modal.
 * @param {Object} orderData - { items, totalAmount, address, token, apiBaseUrl }
 * @param {Object} callbacks - { onStart, onSuccess, onError, onFinish }
 */
async function handleCODOrder({ items, totalAmount, address, token, apiBaseUrl }, callbacks = {}) {
    const { onStart, onSuccess, onError, onFinish } = callbacks;

    if (onStart) onStart();

    try {
        // Ensure items have correct field names for backend
        const mappedItems = items.map(item => ({
            ...item,
            image: item.imageUrl || item.image // Handle both frontend formats
        }));

        const res = await fetch(apiBaseUrl + '/api/order/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ 
                items: mappedItems, 
                products: mappedItems, 
                totalAmount: totalAmount, 
                address: address 
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Server returned error:", errorText);
            throw new Error(`Server ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.success) {
            // Show standard COD success handling
            showCODSuccessModal(() => {
                if (onSuccess) onSuccess(data);
            });
        } else {
            throw new Error(data.message || "Failed to place COD order");
        }
    } catch (err) {
        console.error("COD Checkout Error:", err);
        if (onError) onError(err);
        else alert(err.message || "Something went wrong. Please try again.");
    } finally {
        if (onFinish) onFinish();
    }
}

/**
 * Displays the standardized COD success modal.
 * @param {Function} onClose - Callback when the 'Done' button is clicked.
 */
function showCODSuccessModal(onClose) {
    // Remove existing modal if any
    const existing = document.getElementById('cod-success-modal');
    if (existing) existing.remove();

    const successModal = document.createElement('div');
    successModal.id = 'cod-success-modal';
    successModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;backdrop-filter:blur(5px);';
    successModal.innerHTML = `
        <div style="background:#fff;padding:40px;border-radius:20px;max-width:450px;width:100%;text-align:center;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.3);animation:modalSlideUp 0.4s ease-out;font-family:'Inter',sans-serif;">
            <style>
                @keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            </style>
            <div style="width:80px;height:80px;background:#E8F5E9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <span style="font-size:40px;">✅</span>
            </div>
            <h2 style="font-size:28px;color:#1a1a1a;margin-bottom:15px;font-weight:700;">Order successful!</h2>
            <p style="color:#666;margin-bottom:30px;font-size:16px;line-height:1.5;">Your <b>Cash on Delivery</b> order has been placed successfully. Our team will contact you soon.</p>
            <button id="close-success-btn" style="width:100%;padding:15px;background:#f58117;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:12px;transition:0.2s;">Done</button>
        </div>
    `;
    document.body.appendChild(successModal);
    

    document.getElementById('close-success-btn').onclick = () => {
        successModal.remove();
        if (onClose) onClose();
    };
    
    // Hover effects
    const btn = document.getElementById('close-success-btn');
    btn.onmouseover = () => btn.style.background = '#e67600';
    btn.onmouseout = () => btn.style.background = '#f58117';
}
