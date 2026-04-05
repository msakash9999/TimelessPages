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

async function getJsonSafely(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: "The server returned HTML instead of JSON. Check that the backend API is running on port 5000." };
  }
}

async function requestJson(path, options = {}) {
  let lastError = null;

  for (const baseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      const data = await getJsonSafely(response);

      if (data && typeof data === "object" && data.message?.includes("returned HTML instead of JSON")) {
        throw new Error(`The server at ${baseUrl} returned HTML instead of JSON.`);
      }

      localStorage.setItem("timelessPagesApiBaseUrl", baseUrl);
      return { response, data };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Cannot reach the backend server.");
}

function getUserSession() {
  const userName = localStorage.getItem("timelessPagesUserName") || "";
  const adminName = localStorage.getItem("timelessPagesAdminName") || "";
  const adminToken = localStorage.getItem("timelessPagesAdminToken") || "";
  const isUserLoggedIn = localStorage.getItem("timelessPagesLoggedIn") === "true";
  const isAdminLoggedIn = localStorage.getItem("timelessPagesIsAdmin") === "true" && Boolean(adminToken);

  return {
    userName,
    adminName,
    adminToken,
    isUserLoggedIn,
    isAdminLoggedIn
  };
}

function clearAllSessions() {
  localStorage.removeItem("timelessPagesLoggedIn");
  localStorage.removeItem("timelessPagesUserName");
  localStorage.removeItem("timelessPagesUserEmail");
  localStorage.removeItem("timelessPagesUserToken");
  localStorage.removeItem("timelessPagesAdminToken");
  localStorage.removeItem("timelessPagesAdminEmail");
  localStorage.removeItem("timelessPagesAdminName");
  localStorage.removeItem("timelessPagesIsAdmin");
}

async function requestLogout(path) {
  try {
    await requestJson(path, { method: "POST" });
  } catch (error) {
    console.warn("Logout request failed:", error);
  }
}

function updateNavSession() {
  const sessionBox = document.querySelector(".session-box");

  if (!sessionBox) {
    console.warn("Session box not found. Skipping session UI update.");
    return;
  }

  const session = getUserSession();
  const displayName = session.isAdminLoggedIn ? session.adminName : session.userName;
  const isLoggedIn = session.isUserLoggedIn || session.isAdminLoggedIn;

  // Prevent redundant updates if the state hasn't changed
  const currentStatus = sessionBox.getAttribute("data-session-state");
  const newStatus = isLoggedIn ? `logged-in-${displayName}` : "logged-out";
  if (currentStatus === newStatus) return;

  if (!isLoggedIn || !displayName) {
    sessionBox.innerHTML = `
      <a href="login.html" id="loginLink">Login</a>
      <a href="admin-login.html" id="adminLink" style="margin-left: 10px;">Admin</a>
    `;
    sessionBox.setAttribute("data-session-state", "logged-out");
    return;
  }

  sessionBox.innerHTML = `
    <div class="user-session" id="userSession">
      ${session.isAdminLoggedIn ? '<a href="admin.html" class="session-link">Admin Panel</a>' : ""}
      <a href="orders.html" class="session-link">Orders</a>
      <span class="user-greeting">Hi, ${displayName}</span>
      <button type="button" class="logout-btn" id="logoutButton">Logout</button>
    </div>
  `;
  sessionBox.setAttribute("data-session-state", newStatus);

  document.getElementById("logoutButton")?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (session.isAdminLoggedIn) {
      await requestLogout("/admin/logout");
    } else if (session.isUserLoggedIn) {
      await requestLogout("/api/auth/logout");
    }
    clearAllSessions();
    window.location.href = "login.html";
  });
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(price || 0));
}

function renderCompactCard(book) {
  return `
    <article class="product-card" data-id="${book._id || ''}" data-title="${encodeURIComponent(book.title || '')}" data-author="${encodeURIComponent(book.author || '')}" data-price="${book.price || 0}" data-img="${encodeURIComponent(book.imageUrl || '')}">
      <img src="${book.imageUrl}" alt="${book.title}">
      <h3>${book.title}</h3>
      <p>${book.description || book.author}</p>
      <strong>${formatPrice(book.price)}</strong>
    </article>
  `;
}

function renderFullCard(book) {
  return `
    <article class="product-card" data-id="${book._id || ''}" data-title="${encodeURIComponent(book.title || '')}" data-author="${encodeURIComponent(book.author || '')}" data-price="${book.price || 0}" data-img="${encodeURIComponent(book.imageUrl || '')}">
      <button type="button" class="wishlist-top" aria-label="Add to wishlist">&#9825;</button>
      <img src="${book.imageUrl}" alt="${book.title}">
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <strong>${formatPrice(book.price)}</strong>
      <div class="storybook-actions">
        <button type="button" class="storybook-btn buy-btn">Buy</button>
        <button type="button" class="storybook-btn cart-btn">Add to Cart</button>
      </div>
    </article>
  `;
}

async function loadBooks() {
  if (document.body.dataset.skipBookLoad === 'true') {
    return;
  }

  const grid = document.querySelector(".product-grid");

  if (!grid) {
    return;
  }

  const fallbackMarkup = grid.innerHTML.trim();
  const category = document.body.dataset.bookCategory || "";
  const featured = document.body.dataset.featuredBooks || "";
  const limit = document.body.dataset.bookLimit || "";
  const compactBooks = document.body.dataset.compactBooks === "true";
  const params = new URLSearchParams();

  if (category) params.set("category", category);
  if (featured) params.set("featured", featured);
  if (limit) params.set("limit", limit);

  if (!fallbackMarkup) {
    grid.innerHTML = '<p class="catalog-status">Loading books...</p>';
  }

  try {
    const query = params.toString();
    const { response, data: books } = await requestJson(`/books${query ? `?${query}` : ""}`);

    if (!Array.isArray(books)) {
      throw new Error(books?.message || "Could not load books");
    }

    if (!response.ok) {
      throw new Error("Could not load books");
    }

    if (books.length === 0) {
      if (fallbackMarkup) {
        grid.innerHTML = fallbackMarkup;
      } else {
        grid.innerHTML = '<p class="catalog-status">No books available right now.</p>';
      }
      return;
    }

    const dynamicHtml = books.map((book) => (
      compactBooks ? renderCompactCard(book) : renderFullCard(book)
    )).join("");

    grid.innerHTML = dynamicHtml + (fallbackMarkup ? fallbackMarkup : "");
  } catch (error) {
    if (fallbackMarkup) {
      grid.innerHTML = fallbackMarkup;
      return;
    }
    grid.innerHTML = `<p class="catalog-status">${error.message || "Something went wrong while loading books."}</p>`;
  }
}

const CART_KEY = 'tp_cart';
const WISH_KEY = 'tp_wishlist';

function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function getWishlist() { try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch { return []; } }
function saveWishlist(list) { localStorage.setItem(WISH_KEY, JSON.stringify(list)); }

function bookFromCard(card) {
  if (!card) return null;
  if (card.dataset.title) {
    return {
      id: card.dataset.id || (card.dataset.title + card.dataset.author),
      title: decodeURIComponent(card.dataset.title),
      author: decodeURIComponent(card.dataset.author || ''),
      price: Number(card.dataset.price) || 0,
      imageUrl: decodeURIComponent(card.dataset.img || '')
    };
  }
  const title = card.querySelector('h3')?.textContent?.trim() || 'Unknown';
  const author = card.querySelector('p')?.textContent?.trim() || '';
  const priceRaw = card.querySelector('strong')?.textContent?.trim() || '0';
  const price = Number(priceRaw.replace(/[^0-9.]/g, '')) || 0;
  const imageUrl = card.querySelector('img')?.src || '';
  const id = (title + author).replace(/\s+/g, '_').toLowerCase();
  return { id, title, author, price, imageUrl };
}

function showToast(msg, type) {
  let wrap = document.getElementById('tp-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'tp-toast-wrap';
    Object.assign(wrap.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: '99999', pointerEvents: 'none'
    });
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  const bg = type === 'wish' ? '#c0392b' : type === 'buy' ? '#8B7355' : '#2ecc71';
  Object.assign(t.style, {
    background: bg, color: '#fff', padding: '12px 20px',
    borderRadius: '10px', fontFamily: "'Inter',sans-serif",
    fontSize: '14px', fontWeight: '500', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    opacity: '0', transform: 'translateY(10px)',
    transition: 'all .3s ease', pointerEvents: 'auto',
    maxWidth: '280px', lineHeight: '1.4'
  });
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  let badge = document.getElementById('tp-cart-badge');
  if (!badge) return;
  badge.textContent = count || '';
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function injectCartDrawer() {
  if (document.getElementById('tp-cart-drawer')) return;
  const style = document.createElement('style');
  style.textContent = `
    #tp-cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;}
    #tp-cart-overlay.open{opacity:1;pointer-events:auto;}
    #tp-cart-drawer{position:fixed;top:0;right:-420px;width:min(420px,100vw);height:100vh;background:#1a1814;z-index:9999;transition:right .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:-6px 0 40px rgba(0,0,0,.4);font-family:'Inter',sans-serif;}
    #tp-cart-drawer.open{right:0;}
    #tp-cart-drawer .cd-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #333;}
    #tp-cart-drawer .cd-head h2{color:#f5f0eb;font-size:20px;margin:0;}
    #tp-cart-drawer .cd-close{background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;padding:4px;}
    #tp-cart-drawer .cd-close:hover{color:#fff;}
    #tp-cart-items{flex:1;overflow-y:auto;padding:12px 16px;}
    #tp-cart-items::-webkit-scrollbar{width:4px;}
    #tp-cart-items::-webkit-scrollbar-thumb{background:#555;border-radius:4px;}
    .cd-item{display:flex;gap:14px;padding:14px 8px;border-bottom:1px solid #2a2822;align-items:center;}
    .cd-item img{width:60px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;}
    .cd-item-info{flex:1;min-width:0;}
    .cd-item-info h4{color:#f5f0eb;font-size:14px;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cd-item-info p{color:#aaa;font-size:13px;margin:0 0 8px;}
    .cd-item-info .cd-price{color:#c9a84c;font-weight:700;font-size:14px;}
    .cd-qty{display:flex;align-items:center;gap:8px;margin-top:8px;}
    .cd-qty button{background:#2a2822;border:none;color:#f5f0eb;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
    .cd-qty button:hover{background:#8B7355;}
    .cd-qty span{color:#f5f0eb;min-width:20px;text-align:center;font-size:14px;}
    .cd-item-del{background:none;border:none;color:#e74c3c;cursor:pointer;font-size:18px;padding:4px;flex-shrink:0;}
    .cd-item-del:hover{color:#ff6b6b;}
    #tp-cart-drawer .cd-foot{padding:20px 24px;border-top:1px solid #333;}
    #tp-cart-drawer .cd-total{display:flex;justify-content:space-between;margin-bottom:16px;color:#f5f0eb;font-size:16px;font-weight:600;}
    #tp-cart-drawer .cd-checkout{display:block;width:100%;padding:14px;background:#8B7355;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;transition:background .2s;}
    #tp-cart-drawer .cd-checkout:hover{background:#a08060;}
    .cd-empty{text-align:center;color:#777;padding:60px 20px;font-size:15px;}
    #tp-cart-badge{background:#e74c3c;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;margin-left:4px;vertical-align:middle;}
    .wishlist-top.wished{color:#e74c3c !important;}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'tp-cart-overlay';
  overlay.addEventListener('click', closeCart);
  document.body.appendChild(overlay);

  const drawer = document.createElement('div');
  drawer.id = 'tp-cart-drawer';
  drawer.innerHTML = `
    <div class="cd-head">
      <h2>🛒 Your Cart</h2>
      <button class="cd-close" id="tp-cart-close">✕</button>
    </div>
    <div id="tp-cart-items"></div>
    <div class="cd-foot">
      <div class="cd-total"><span>Total</span><span id="cd-total-price">₹0</span></div>
      <button class="cd-checkout" id="cd-checkout-btn">Proceed to Checkout →</button>
    </div>
  `;
  document.body.appendChild(drawer);
  document.getElementById('tp-cart-close').addEventListener('click', closeCart);
  document.getElementById('cd-checkout-btn').addEventListener('click', async () => {
    const cartItems = getCart();
    if (!cartItems.length) return;

    if (localStorage.getItem('timelessPagesLoggedIn') !== 'true') {
      showToast('Please login to checkout', 'wish');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
      return;
    }

    const btn = document.getElementById('cd-checkout-btn');
    const originalText = btn.textContent;

    const showCheckoutModal = () => {
      return new Promise((resolve) => {
        const modalHtml = `
          <div id="tp-checkout-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);">
            <div style="background:#fff;width:min(450px, 95vw);border-radius:15px;overflow:hidden;font-family:'Inter',sans-serif;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
              <style>
                .ch-section { padding: 20px; border-bottom: 1px solid #eee; }
                .ch-title { font-weight: 700; color: #333; margin-bottom: 15px; display: block; font-size: 16px; }
                .ch-input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
                .ch-pay-option { display: flex; align-items: center; padding: 12px; border: 2px solid #eee; border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: 0.2s; }
                .ch-pay-option:hover { border-color: #8B7355; background: #fdfaf7; }
                .ch-pay-option input { margin-right: 12px; accent-color: #8B7355; }
                .ch-pay-option.selected { border-color: #8B7355; background: #fdfaf7; }
                .ch-btn { width: 100%; padding: 14px; background: #8B7355; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.3s; }
                .ch-btn:hover { background: #6F5B44; transform: translateY(-2px); }
              </style>
              <div style="background:#8B7355;color:#fff;padding:25px;text-align:center;">
                <h2 style="margin:0;font-size:22px;">Complete Your Order</h2>
                <p style="margin:5px 0 0;font-size:15px;opacity:0.9;">Fast & Secure Checkout</p>
              </div>
              
              <div class="ch-section">
                <span class="ch-title">1. Shipping Address</span>
                <input type="text" id="ch-name" class="ch-input" placeholder="Full Name" required>
                <input type="text" id="ch-addr" class="ch-input" placeholder="Address Line" required>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="ch-city" class="ch-input" placeholder="City" required>
                  <input type="text" id="ch-pin" class="ch-input" placeholder="Pincode" required>
                </div>
                <input type="tel" id="ch-phone" class="ch-input" placeholder="Phone Number" required>
              </div>

              <div class="ch-section">
                <span class="ch-title">2. Payment Method</span>
                <label class="ch-pay-option selected">
                  <input type="radio" name="ch-pay-method" value="ONLINE" checked>
                  <div>
                    <div style="font-weight:600; color:#333;">Online Payment</div>
                    <div style="font-size:12px; color:#777;">Card, UPI, Net Banking</div>
                  </div>
                </label>
                <label class="ch-pay-option">
                  <input type="radio" name="ch-pay-method" value="COD">
                  <div>
                    <div style="font-weight:600; color:#333; display:flex; align-items:center; gap:8px;">
                      Cash on Delivery (COD) 
                      <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="16" alt="Gmail">
                    </div>
                    <div style="font-size:12px; color:#777;">Pay when you receive the books + Email Confirmation</div>
                  </div>
                </label>
              </div>

              <div style="padding:20px;">
                <button id="ch-confirm-btn" class="ch-btn">Place Order</button>
                <button id="ch-cancel-btn" style="width:100%;padding:10px;background:none;color:#888;border:none;margin-top:10px;cursor:pointer;font-size:14px;">Cancel</button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('tp-checkout-modal');
        modal.querySelectorAll('input[name="ch-pay-method"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            modal.querySelectorAll('.ch-pay-option').forEach(opt => opt.classList.remove('selected'));
            const container = e.target.closest('.ch-pay-option');
            container.classList.add('selected');
            
            const confirmBtn = document.getElementById('ch-confirm-btn');
            if (e.target.value === 'COD') {
              confirmBtn.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="20">
                  Place Order & Notify Gmail
                </div>
              `;
              confirmBtn.style.background = '#d93025'; // Gmail Red
            } else {
              confirmBtn.innerHTML = 'Place Order';
              confirmBtn.style.background = '#8B7355';
            }
          });
        });

        document.getElementById('ch-cancel-btn').onclick = () => {
          modal.remove();
          resolve(null);
        };

        document.getElementById('ch-confirm-btn').onclick = () => {
          const details = {
            fullName: document.getElementById('ch-name').value.trim(),
            addressLine: document.getElementById('ch-addr').value.trim(),
            city: document.getElementById('ch-city').value.trim(),
            pincode: document.getElementById('ch-pin').value.trim(),
            phone: document.getElementById('ch-phone').value.trim(),
            paymentMethod: modal.querySelector('input[name="ch-pay-method"]:checked').value
          };
          if (!details.fullName || !details.addressLine || !details.city || !details.pincode || !details.phone) {
            alert("Please fill all shipping fields");
            return;
          }
          modal.remove();
          resolve(details);
        };
      });
    };

    const checkoutData = await showCheckoutModal();
    if (!checkoutData) return;

    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      const token = localStorage.getItem('timelessPagesUserToken');
      // If running on localhost:5000, use relative URL. Else use the stored apiBase or fallback to :5000
      let apiBase = localStorage.getItem("timelessPagesApiBaseUrl") || "";
      if (!apiBase && window.location.port !== "5000") {
        apiBase = "http://localhost:5000";
      }
      const fetchUrl = apiBase + '/api/order/create';

      if (checkoutData.paymentMethod === 'COD') {
        const amount = cartItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
        const mappedProducts = cartItems.map(item => ({
          ...item,
          image: item.imageUrl // Map to expected backend field
        }));
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ 
            items: mappedProducts, 
            products: mappedProducts, 
            totalAmount: amount, 
            address: checkoutData 
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Server returned error:", errorText);
          throw new Error(`Server ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (data.success) {
          const successModal = document.createElement('div');
          successModal.id = 'cod-success-modal';
          successModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;';
          successModal.innerHTML = `
            <div style="background:#fff;padding:40px;border-radius:20px;max-width:450px;width:100%;text-align:center;position:relative;box-shadow:0 20px 40px rgba(0,0,0,0.3);animation:modalSlideUp 0.4s ease-out;">
              <div style="width:80px;height:80px;background:#E8F5E9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <span style="font-size:40px;">✅</span>
              </div>
              <h2 style="font-family:'Syne',sans-serif;font-size:28px;color:#1a1a1a;margin-bottom:15px;">Order successful!</h2>
              <p style="color:#666;margin-bottom:30px;">Your <b>Cash on Delivery</b> order has been sent to your Gmail. Our team will contact you soon.</p>
              <button id="close-success-btn" style="width:100%;padding:15px;background:#8B7355;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;margin-bottom:10px;">Done</button>
              <a href="https://mail.google.com" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:#d93025;font-weight:600;font-size:14px;padding:12px;border:2px solid #d93025;border-radius:10px;transition:0.3s;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" width="22" alt="Gmail">
                Check Gmail Confirmation
              </a>
            </div>
          `;
          document.body.appendChild(successModal);
          
          // Automatically open Gmail in a new tab for convenience
          window.open("https://mail.google.com", "_blank");

          document.getElementById('close-success-btn').onclick = () => {
            successModal.remove();
            saveCart([]);
            updateCartBadge();
            renderCartDrawer();
            closeCart();
          };
        } else {
          alert(data.message || "Failed to place order");
        }
      } else {
        const { response, data } = await requestJson('/api/payment/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ items: cartItems, shippingDetails: checkoutData })
        });

        if (data && data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data?.message || 'Failed to create checkout session');
        }
      }
    } catch (err) {
      alert(err.message || 'Checkout failed.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

function openCart() {
  renderCartDrawer();
  document.getElementById('tp-cart-drawer')?.classList.add('open');
  document.getElementById('tp-cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('tp-cart-drawer')?.classList.remove('open');
  document.getElementById('tp-cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  const cart = getCart();
  const container = document.getElementById('tp-cart-items');
  const totalEl = document.getElementById('cd-total-price');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p class="cd-empty">Your cart is empty.<br>Add some books!</p>';
    if (totalEl) totalEl.textContent = '₹0';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map((item, idx) => {
    total += item.price * (item.qty || 1);
    return `
      <div class="cd-item" data-idx="${idx}">
        <img src="${item.imageUrl || ''}" alt="${item.title}" onerror="this.src='assets/placeholder.png'">
        <div class="cd-item-info">
          <h4>${item.title}</h4>
          <p>${item.author}</p>
          <div class="cd-price">${formatPrice(item.price)}</div>
          <div class="cd-qty">
            <button class="cd-qty-dec" data-idx="${idx}">−</button>
            <span>${item.qty || 1}</span>
            <button class="cd-qty-inc" data-idx="${idx}">+</button>
          </div>
        </div>
        <button class="cd-item-del" data-idx="${idx}" title="Remove">🗑</button>
      </div>`;
  }).join('');

  if (totalEl) totalEl.textContent = formatPrice(total);

  container.querySelectorAll('.cd-qty-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const cart = getCart(); const i = +btn.dataset.idx;
      cart[i].qty = (cart[i].qty || 1) + 1;
      saveCart(cart); updateCartBadge(); renderCartDrawer();
    });
  });
  container.querySelectorAll('.cd-qty-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const cart = getCart(); const i = +btn.dataset.idx;
      cart[i].qty = Math.max(1, (cart[i].qty || 1) - 1);
      saveCart(cart); updateCartBadge(); renderCartDrawer();
    });
  });
  container.querySelectorAll('.cd-item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const cart = getCart(); cart.splice(+btn.dataset.idx, 1);
      saveCart(cart); updateCartBadge(); renderCartDrawer();
      showToast('Item removed from cart.', 'wish');
    });
  });
}

function isWished(id) { return getWishlist().some(w => w.id === id); }
function refreshWishlistUI() {
  document.querySelectorAll('.product-card').forEach(card => {
    const book = bookFromCard(card);
    const btn = card.querySelector('.wishlist-top');
    if (!btn || !book) return;
    if (isWished(book.id)) {
      btn.textContent = '♥'; btn.classList.add('wished');
    } else {
      btn.textContent = '♡'; btn.classList.remove('wished');
    }
  });
}

function addToCart(book) {
  const cart = getCart();
  const existing = cart.find(i => i.id === book.id);
  if (existing) existing.qty = (existing.qty || 1) + 1;
  else cart.push({ ...book, qty: 1 });
  saveCart(cart);
  updateCartBadge();
}

document.addEventListener('click', function (e) {
  const wishBtn = e.target.closest('.wishlist-top');
  if (wishBtn) {
    const card = wishBtn.closest('.product-card');
    const book = bookFromCard(card);
    if (!book) return;
    const list = getWishlist();
    const idx = list.findIndex(w => w.id === book.id);
    if (idx === -1) {
      list.push(book);
      saveWishlist(list);
      wishBtn.textContent = '♥'; wishBtn.classList.add('wished');
      showToast(`❤️ "${book.title}" added to wishlist!`, 'wish');
    } else {
      list.splice(idx, 1);
      saveWishlist(list);
      wishBtn.textContent = '♡'; wishBtn.classList.remove('wished');
      showToast(`Removed "${book.title}" from wishlist.`, 'wish');
    }
    return;
  }

  const cartBtn = e.target.closest('.cart-btn');
  if (cartBtn) {
    const card = cartBtn.closest('.product-card');
    const book = bookFromCard(card);
    if (!book) return;
    addToCart(book);
    showToast(`🛒 "${book.title}" added to cart!`, 'cart');
    cartBtn.textContent = '✓ Added!';
    cartBtn.style.background = '#2ecc71';
    setTimeout(() => { cartBtn.textContent = 'Add to Cart'; cartBtn.style.background = ''; }, 1500);
    return;
  }

  const buyBtn = e.target.closest('.buy-btn');
  if (buyBtn) {
    const card = buyBtn.closest('.product-card');
    const book = bookFromCard(card);
    if (!book) return;
    addToCart(book);
    showToast(`✅ "${book.title}" added! Open cart to checkout.`, 'buy');
    buyBtn.textContent = '✓ In Cart!';
    buyBtn.style.background = '#8B7355';
    setTimeout(() => { buyBtn.textContent = 'Buy'; buyBtn.style.background = ''; }, 1500);
    openCart();
    return;
  }

  const cartIcon = e.target.closest('#tp-cart-nav-btn');
  if (cartIcon) openCart();
});

function addCartToNav() {
  const actions = document.querySelector('.actions');
  if (!actions || document.getElementById('tp-cart-nav-btn')) return;
  const cartBtn = document.createElement('button');
  cartBtn.id = 'tp-cart-nav-btn';
  cartBtn.type = 'button';
  cartBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:inherit;font-size:20px;display:inline-flex;align-items:center;gap:2px;padding:4px 8px;';
  cartBtn.innerHTML = '🛒<span id="tp-cart-badge" style="display:none;"></span>';
  cartBtn.title = 'View Cart';
  actions.prepend(cartBtn);
  updateCartBadge();
}

updateNavSession();
addCartToNav();
injectCartDrawer();
loadBooks().then(() => { refreshWishlistUI(); });

document.addEventListener('DOMContentLoaded', () => {
  // Ensure everything is up to date after DOM is fully ready
  updateNavSession();
  refreshWishlistUI();
  addCartToNav();
});
