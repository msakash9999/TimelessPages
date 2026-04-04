const CART_STORAGE_KEY = 'timelessPagesCart';
const WISHLIST_STORAGE_KEY = 'timelessPagesWishlist';

function requireAuthForActions() {
  if (localStorage.getItem('timelessPagesLoggedIn') !== 'true') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function getApiBaseUrl() {
  return localStorage.getItem('timelessPagesApiBaseUrl') || 'http://localhost:5000';
}

function syncCartToServer(cartItems) {
  const token = localStorage.getItem('timelessPagesUserToken');
  if (!token) return;

  fetch(getApiBaseUrl() + '/api/user/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ cart: cartItems })
  }).catch(err => console.error("Failed to sync cart", err));
}

function syncWishlistToServer(wishlistItems) {
  const token = localStorage.getItem('timelessPagesUserToken');
  if (!token) return;

  fetch(getApiBaseUrl() + '/api/user/wishlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ wishlist: wishlistItems })
  }).catch(err => console.error("Failed to sync wishlist", err));
}

function getCart() {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];

    if (!Array.isArray(parsedCart)) {
      return [];
    }

    return parsedCart
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const title = String(item.title || 'Book').trim();
        const price = typeof item.price === 'number' ? item.price : extractPriceValue(item.price || '');
        const priceLabel = item.priceLabel || formatPrice(price);
        const image = item.image || '';
        const qty = Math.max(1, Number(item.qty) || 1);

        return { title, price, priceLabel, image, qty };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function saveCart(cartItems) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  syncCartToServer(cartItems);
}

function getWishlist() {
  try {
    const storedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
    const parsedWishlist = storedWishlist ? JSON.parse(storedWishlist) : [];
    return Array.isArray(parsedWishlist) ? parsedWishlist : [];
  } catch {
    return [];
  }
}

function saveWishlist(wishlistItems) {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
  syncWishlistToServer(wishlistItems);
}

function extractPriceValue(priceText) {
  const numericValue = Number(String(priceText).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPrice(price) {
  if (!price) {
    return 'Price on request';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(price);
}

function getCartItemCount(cartItems = getCart()) {
  return cartItems.reduce((total, item) => total + item.qty, 0);
}

function updateCartCount() {
  const count = getCartItemCount();
  document.querySelectorAll('[data-cart-count]').forEach((element) => {
    element.textContent = count;
  });
}

function updateWishlistCount() {
  const count = getWishlist().length;
  document.querySelectorAll('[data-wishlist-count]').forEach((element) => {
    element.textContent = count;
  });
}

function getBookDetails(card) {
  const title = card.querySelector('h3')?.textContent?.trim() || 'Book';
  const priceText = card.querySelector('strong')?.textContent?.trim() || '';
  const image = card.querySelector('img')?.getAttribute('src') || '';

  return {
    title,
    price: extractPriceValue(priceText),
    priceLabel: priceText || formatPrice(0),
    image,
  };
}

function addToCart(card) {
  if (!requireAuthForActions()) return;

  const cartItems = getCart();
  const book = getBookDetails(card);
  const existingItem = cartItems.find((item) => item.title === book.title);

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cartItems.push({ ...book, qty: 1 });
  }

  saveCart(cartItems);
  syncCartUi();
}

function changeCartItemQuantity(title, delta) {
  const cartItems = getCart();
  const item = cartItems.find((entry) => entry.title === title);

  if (!item) {
    return;
  }

  item.qty += delta;

  if (item.qty <= 0) {
    saveCart(cartItems.filter((entry) => entry.title !== title));
  } else {
    saveCart(cartItems);
  }

  syncCartUi();
}

function removeCartItem(title) {
  const cartItems = getCart().filter((entry) => entry.title !== title);
  saveCart(cartItems);
  syncCartUi();
}

function isInWishlist(title) {
  return getWishlist().some((item) => item.title === title);
}

function toggleWishlist(card) {
  if (!requireAuthForActions()) return;

  const wishlistItems = getWishlist();
  const book = getBookDetails(card);
  const exists = wishlistItems.some((item) => item.title === book.title);

  const nextWishlist = exists
    ? wishlistItems.filter((item) => item.title !== book.title)
    : [...wishlistItems, book];

  saveWishlist(nextWishlist);
  syncWishlistUi();
}

function getSearchableCards() {
  return Array.from(document.querySelectorAll('.book-tile, .product-card'));
}

function getCardSearchData(card, index) {
  const title = card.querySelector('h3')?.textContent?.trim() || `Book ${index + 1}`;
  const subtitle = card.querySelector('p')?.textContent?.trim() || '';
  const image = card.querySelector('img')?.getAttribute('src') || '';
  return { card, title, subtitle, image };
}

function injectActions(card) {
  if (card.querySelector('.storybook-actions')) {
    return;
  }

  card.classList.add('book-card-shell');
  card.classList.add('product-card');

  if (!card.querySelector('.wishlist-top')) {
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'wishlist-top';
    favoriteButton.type = 'button';
    favoriteButton.setAttribute('aria-label', 'Add to wishlist');
    favoriteButton.innerHTML = '&#9825;';
    favoriteButton.addEventListener('click', () => {
      toggleWishlist(card);
    });
    card.appendChild(favoriteButton);
  }

  const actions = document.createElement('div');
  actions.className = 'storybook-actions';
  actions.innerHTML = `
    <button class="storybook-btn buy-btn" type="button">Buy Now</button>
    <button class="storybook-btn cart-btn" type="button">Add to Cart</button>
  `;

  const cartButton = actions.querySelector('.cart-btn');
  const buyButton = actions.querySelector('.buy-btn');

  cartButton.addEventListener('click', () => {
    addToCart(card);
    cartButton.textContent = 'Added';
    window.setTimeout(() => {
      cartButton.textContent = 'Add to Cart';
    }, 1200);
  });

  buyButton.addEventListener('click', () => {
    addToCart(card);
    openCartDrawer();
  });

  card.appendChild(actions);
}

function createCartDrawer() {
  if (document.querySelector('[data-cart-overlay]')) {
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;opacity:0;transition:opacity .3s;pointer-events:none;}
    .cart-overlay:not([hidden]){opacity:1;pointer-events:auto;}
    .cart-drawer{position:fixed;top:0;right:-420px;width:min(420px,100vw);height:100vh;background:#1a1814;z-index:9999;transition:right .35s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;box-shadow:-6px 0 40px rgba(0,0,0,.4);font-family:'Inter',sans-serif;}
    .cart-overlay:not([hidden]) .cart-drawer{right:0;}
    .cart-drawer .cd-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #333;}
    .cart-drawer .cd-head h2{color:#f5f0eb;font-size:20px;margin:0;}
    .cart-drawer .cd-close{background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;padding:4px;}
    .cart-drawer .cd-close:hover{color:#fff;}
    .cart-drawer .cart-items{flex:1;overflow-y:auto;padding:12px 16px;}
    .cart-drawer .cart-items::-webkit-scrollbar{width:4px;}
    .cart-drawer .cart-items::-webkit-scrollbar-thumb{background:#555;border-radius:4px;}
    .cd-item{display:flex;gap:14px;padding:14px 8px;border-bottom:1px solid #2a2822;align-items:center;}
    .cd-item img{width:60px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;}
    .cd-item-info{flex:1;min-width:0;}
    .cd-item-info h4{color:#f5f0eb;font-size:14px;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cd-item-info p{color:#aaa;font-size:13px;margin:0 0 8px;}
    .cd-item-info .cd-price{color:#c9a84c;font-weight:700;font-size:14px;}
    .cd-qty{display:flex;align-items:center;gap:8px;margin-top:8px;}
    .cd-qty button{background:#2a2822;border:none;color:#f5f0eb;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
    .cd-qty button:hover{background:#f58117;}
    .cd-qty span{color:#f5f0eb;min-width:20px;text-align:center;font-size:14px;}
    .cd-item-del{background:none;border:none;color:#e74c3c;cursor:pointer;font-size:18px;padding:4px;flex-shrink:0;}
    .cd-item-del:hover{color:#ff6b6b;}
    .cart-drawer .cd-foot{padding:20px 24px;border-top:1px solid #333;}
    .cart-drawer .cd-total{display:flex;justify-content:space-between;margin-bottom:16px;color:#f5f0eb;font-size:16px;font-weight:600;}
    .cart-drawer .cd-checkout{display:block;width:100%;padding:14px;background:#f58117;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-align:center;transition:background .2s;}
    .cart-drawer .cd-checkout:hover{background:#a08060;}
    .cd-empty{text-align:center;color:#777;padding:60px 20px;font-size:15px;}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'cart-overlay';
  overlay.setAttribute('data-cart-overlay', '');
  overlay.hidden = true;
  overlay.innerHTML = `
    <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div class="cd-head">
        <h2>🛒 Book Basket <span data-cart-summary-count style="display:none;">0</span></h2>
        <button class="cd-close" type="button" aria-label="Close cart" data-cart-close>✕</button>
      </div>
      <div class="cart-items" data-cart-items></div>
      <div class="cd-foot">
        <div class="cd-total"><span>Total</span><span data-cart-summary-total>₹0.00</span></div>
        <button class="cd-checkout cart-checkout-btn" type="button">Proceed to Checkout →</button>
      </div>
    </aside>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeCartDrawer();
    }
  });

  overlay.querySelector('[data-cart-close]').addEventListener('click', closeCartDrawer);
  overlay.querySelector('.cart-checkout-btn').addEventListener('click', async () => {
    const cartItems = getCart();
    if (!cartItems.length) return;

    if (!requireAuthForActions()) return;

    const btn = overlay.querySelector('.cart-checkout-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Preparing Checkout...';
    btn.disabled = true;

    try {
      const amount = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const token = localStorage.getItem('timelessPagesUserToken');

      // Fetch user profile to get saved addresses
      const userRes = await fetch(getApiBaseUrl() + '/api/user/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const userData = await userRes.json();
      const savedAddress = userData.addresses?.find(a => a.isDefault) || userData.addresses?.[0] || null;

      const modalHtml = `
        <div id="checkout-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);">
          <div style="background:#fff;width:min(450px, 95vw);border-radius:15px;overflow:hidden;font-family:'Inter',sans-serif;box-shadow:0 20px 50px rgba(0,0,0,0.3);animation: modalFadeIn 0.3s ease;">
            <style>
              @keyframes modalFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
              .checkout-section { padding: 20px; border-bottom: 1px solid #eee; }
              .checkout-title { font-weight: 700; color: #333; margin-bottom: 15px; display: block; font-size: 16px; }
              .addr-input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
              .pay-option { display: flex; align-items: center; padding: 12px; border: 2px solid #eee; border-radius: 10px; margin-bottom: 10px; cursor: pointer; transition: 0.2s; }
              .pay-option:hover { border-color: #f58117; background: #fffaf5; }
              .pay-option input { margin-right: 12px; accent-color: #f58117; }
              .pay-option.selected { border-color: #f58117; background: #fffaf5; }
              .checkout-btn { width: 100%; padding: 14px; background: #f58117; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.3s; }
              .checkout-btn:hover { background: #e67600; transform: translateY(-2px); }
              .checkout-btn:disabled { background: #ccc; cursor: not-allowed; }
            </style>
            <div style="background:#f58117;color:#fff;padding:25px;text-align:center;">
              <h2 style="margin:0;font-size:22px;">Complete Your Order</h2>
              <p style="margin:5px 0 0;font-size:15px;opacity:0.9;">Total Payable: <strong>₹${amount.toLocaleString('en-IN')}</strong></p>
            </div>
            
            <div class="checkout-section">
              <span class="checkout-title">1. Shipping Address</span>
              <input type="text" id="ship-name" class="addr-input" placeholder="Full Name" value="${savedAddress?.fullName || userData.name || ''}">
              <input type="text" id="ship-addr" class="addr-input" placeholder="Address Line" value="${savedAddress?.addressLine || ''}">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="ship-city" class="addr-input" placeholder="City" value="${savedAddress?.city || ''}">
                <input type="text" id="ship-state" class="addr-input" placeholder="State" value="${savedAddress?.state || ''}">
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="ship-pin" class="addr-input" placeholder="Pincode" value="${savedAddress?.pincode || ''}">
                <input type="text" id="ship-phone" class="addr-input" placeholder="Phone Number" value="${savedAddress?.phone || userData.phone || ''}">
              </div>
            </div>

            <div class="checkout-section">
              <span class="checkout-title">2. Payment Method</span>
              <label class="pay-option selected">
                <input type="radio" name="pay-method" value="ONLINE" checked>
                <div>
                  <div style="font-weight:600; color:#333;">Online Payment</div>
                  <div style="font-size:12px; color:#777;">Card, UPI, Net Banking</div>
                </div>
              </label>
                <label class="pay-option">
                  <input type="radio" name="pay-method" value="COD">
                  <div>
                    <div style="font-weight:600; color:#333;">Cash on Delivery (COD)</div>
                    <div style="font-size:12px; color:#777;">Pay when you receive the books + Order Confirmation</div>
                  </div>
                </label>
            </div>

            <div style="padding:20px;">
              <button id="final-confirm-btn" class="checkout-btn">Place Order</button>
              <button id="checkout-cancel-btn" style="width:100%;padding:10px;background:none;color:#888;border:none;margin-top:10px;cursor:pointer;font-size:14px;">Cancel and go back</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);

      // Handle selection UI
      document.querySelectorAll('input[name="pay-method"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          document.querySelectorAll('.pay-option').forEach(opt => opt.classList.remove('selected'));
          e.target.closest('.pay-option').classList.add('selected');
          
          const confirmBtn = document.getElementById('final-confirm-btn');
          if (e.target.value === 'COD') {
            confirmBtn.innerHTML = 'Place Order';
            confirmBtn.style.background = '#f58117';
          } else {
            confirmBtn.innerHTML = 'Place Order';
            confirmBtn.style.background = '#f58117';
          }
        });
      });

      document.getElementById('checkout-cancel-btn').addEventListener('click', () => {
        document.getElementById('checkout-modal').remove();
        btn.textContent = originalText;
        btn.disabled = false;
      });

      document.getElementById('final-confirm-btn').addEventListener('click', async () => {
        const payMethod = document.querySelector('input[name="pay-method"]:checked').value;
        const address = {
          fullName: document.getElementById('ship-name').value.trim(),
          addressLine: document.getElementById('ship-addr').value.trim(),
          city: document.getElementById('ship-city').value.trim(),
          state: document.getElementById('ship-state').value.trim(),
          pincode: document.getElementById('ship-pin').value.trim(),
          phone: document.getElementById('ship-phone').value.trim()
        };

        if (!address.fullName || !address.addressLine || !address.city || !address.pincode || !address.phone) {
          alert("Please fill all shipping details");
          return;
        }

        const confirmBtn = document.getElementById('final-confirm-btn');
        confirmBtn.textContent = "Processing Order...";
        confirmBtn.textContent = "Processing...";
        confirmBtn.disabled = true;

        try {
          let apiBase = localStorage.getItem("timelessPagesApiBaseUrl") || "";
          if (!apiBase && window.location.port !== "5000") {
            apiBase = "http://localhost:5000";
          }
          const fetchUrl = apiBase + '/api/order/create';

          if (payMethod === 'COD') {
            handleCODOrder({
              items: cartItems,
              totalAmount: amount,
              address: address,
              token: token,
              apiBaseUrl: apiBase
            }, {
              onSuccess: () => {
                saveCart([]);
                syncCartUi();
                closeCartDrawer();
                const modal = document.getElementById('checkout-modal');
                if (modal) modal.remove();
                window.location.reload();
              },
              onError: (err) => {
                alert(err.message || "Failed to place COD order");
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Place Order";
              }
            });
          } else {
            // Handle Online Payment Flow (Stripe)
            const stripeRes = await fetch(getApiBaseUrl() + '/api/payment/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ items: cartItems, shippingDetails: address })
            });
            const stripeData = await stripeRes.json();
            
            if (stripeData.success && stripeData.url) {
              window.location.href = stripeData.url;
            } else {
              alert(stripeData.message || "Payment initiation failed");
              confirmBtn.disabled = false;
              confirmBtn.textContent = "Place Order";
            }
          }
        } catch (err) {
          console.error("Checkout Error:", err);
          alert("Something went wrong. Please try again.");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Place Order";
        }
      });
      
      btn.textContent = originalText;
      btn.disabled = false;

    } catch (err) {
      console.error("Checkout Initiation Error:", err);
      alert('Error loading checkout. Please try again.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

function createWishlistDrawer() {
  if (document.querySelector('[data-wishlist-overlay]') || !document.querySelector('[data-wishlist-toggle]')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'wishlist-overlay';
  overlay.setAttribute('data-wishlist-overlay', '');
  overlay.hidden = true;
  overlay.innerHTML = `
    <aside class="wishlist-drawer" role="dialog" aria-modal="true" aria-label="Wishlist">
      <div class="wishlist-head">
        <div class="wishlist-head-top">
          <div>
            <p class="wishlist-kicker">Wishlist</p>
            <h2>Saved Books</h2>
          </div>
          <button class="wishlist-close-btn" type="button" aria-label="Close wishlist" data-wishlist-close>&times;</button>
        </div>
      </div>
      <div class="wishlist-items" data-wishlist-items></div>
      <div class="wishlist-foot">
        <strong data-wishlist-summary>0 saved books</strong>
        <p>Keep your favorite titles here for later.</p>
        <button class="wishlist-cta-btn" type="button" data-wishlist-close>Continue Browsing</button>
      </div>
    </aside>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeWishlistDrawer();
    }
  });

  overlay.querySelectorAll('[data-wishlist-close]').forEach((button) => {
    button.addEventListener('click', closeWishlistDrawer);
  });
}

function createSearchPanel() {
  if (document.querySelector('[data-search-overlay]') || !document.querySelector('[data-search-toggle]')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.setAttribute('data-search-overlay', '');
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="search-panel" role="dialog" aria-modal="true" aria-label="Search books">
      <div class="search-panel-head">
        <h2>Search Books</h2>
        <button class="search-close-btn" type="button" aria-label="Close search" data-search-close>&times;</button>
      </div>
      <input class="search-input" type="search" placeholder="Search by title or collection" data-search-input>
      <div class="search-results" data-search-results></div>
    </section>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeSearchPanel();
    }
  });

  overlay.querySelector('[data-search-close]').addEventListener('click', closeSearchPanel);
  overlay.querySelector('[data-search-input]').addEventListener('input', renderSearchResults);
}

function renderSearchResults() {
  const overlay = document.querySelector('[data-search-overlay]');
  const input = document.querySelector('[data-search-input]');
  const resultsHost = document.querySelector('[data-search-results]');

  if (!overlay || !input || !resultsHost) {
    return;
  }

  const query = input.value.trim().toLowerCase();
  const cards = getSearchableCards().map(getCardSearchData);
  const filtered = !query
    ? cards
    : cards.filter(({ title, subtitle }) =>
      `${title} ${subtitle}`.toLowerCase().includes(query)
    );

  if (!filtered.length) {
    resultsHost.innerHTML = `
      <div class="search-empty">
        <h3>No books found</h3>
        <p>Try another title or keyword.</p>
      </div>
    `;
    return;
  }

  resultsHost.innerHTML = filtered
    .map(({ title, subtitle, image }, index) => `
      <button class="search-result-item" type="button" data-search-result="${index}">
        <img src="${image}" alt="${title}">
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        <span class="search-jump">Open</span>
      </button>
    `)
    .join('');

  resultsHost.querySelectorAll('[data-search-result]').forEach((button) => {
    button.addEventListener('click', () => {
      const selected = filtered[Number(button.getAttribute('data-search-result'))];
      if (!selected) {
        return;
      }

      closeSearchPanel();
      selected.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      selected.card.classList.add('search-hit');
      window.setTimeout(() => {
        selected.card.classList.remove('search-hit');
      }, 1600);
    });
  });
}

function openSearchPanel() {
  const overlay = document.querySelector('[data-search-overlay]');
  const input = document.querySelector('[data-search-input]');
  if (!overlay || !input) {
    return;
  }

  overlay.hidden = false;
  renderSearchResults();
  window.setTimeout(() => input.focus(), 0);
}

function closeSearchPanel() {
  const overlay = document.querySelector('[data-search-overlay]');
  const input = document.querySelector('[data-search-input]');
  if (!overlay || !input) {
    return;
  }

  overlay.hidden = true;
  input.value = '';
}

function renderWishlistDrawer() {
  const itemsHost = document.querySelector('[data-wishlist-items]');
  const summaryHost = document.querySelector('[data-wishlist-summary]');
  if (!itemsHost || !summaryHost) {
    return;
  }

  const wishlistItems = getWishlist();

  if (!wishlistItems.length) {
    itemsHost.innerHTML = `
      <div class="wishlist-empty">
        <h3>No books saved yet</h3>
        <p>Tap the heart on any book card to add it here.</p>
      </div>
    `;
    summaryHost.textContent = '0 saved books';
    return;
  }

  itemsHost.innerHTML = wishlistItems
    .map((item) => `
      <article class="wishlist-item">
        <img src="${item.image}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p>${item.priceLabel}</p>
        </div>
        <button class="wishlist-remove-btn" type="button" data-wishlist-remove="${encodeURIComponent(item.title)}">Remove</button>
      </article>
    `)
    .join('');

  summaryHost.textContent = `${wishlistItems.length} saved ${wishlistItems.length === 1 ? 'book' : 'books'}`;

  itemsHost.querySelectorAll('[data-wishlist-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const title = decodeURIComponent(button.getAttribute('data-wishlist-remove'));
      saveWishlist(getWishlist().filter((item) => item.title !== title));
      syncWishlistUi();
    });
  });
}

function renderCartDrawer() {
  const cartItems = getCart();
  const itemsHost = document.querySelector('[data-cart-items]');
  const countHost = document.querySelector('[data-cart-summary-count]');
  const totalHost = document.querySelector('[data-cart-summary-total]');

  if (!itemsHost || !countHost || !totalHost) {
    return;
  }

  if (!cartItems.length) {
    itemsHost.innerHTML = `
      <p class="cd-empty">Your cart is empty.<br>Add some timeless books!</p>
    `;
    countHost.textContent = '0';
    countHost.style.display = 'none';
    totalHost.textContent = formatPrice(0);
    return;
  }

  const totalItems = getCartItemCount(cartItems);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  itemsHost.innerHTML = cartItems
    .map((item) => `
      <div class="cd-item">
        <img src="${item.image}" alt="${item.title}" onerror="this.src='assets/placeholder.png'">
        <div class="cd-item-info">
          <h4>${item.title}</h4>
          <p>${item.priceLabel}</p>
          <div class="cd-price">${formatPrice(item.price * item.qty)}</div>
          <div class="cd-qty">
            <button type="button" aria-label="Decrease quantity" data-cart-qty="${encodeURIComponent(item.title)}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button type="button" aria-label="Increase quantity" data-cart-qty="${encodeURIComponent(item.title)}" data-delta="1">+</button>
          </div>
        </div>
        <button class="cd-item-del" data-cart-remove="${encodeURIComponent(item.title)}" title="Remove">🗑</button>
      </div>
    `)
    .join('');

  countHost.textContent = String(totalItems);
  countHost.style.display = 'inline-block';
  totalHost.textContent = formatPrice(totalPrice);

  itemsHost.querySelectorAll('[data-cart-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      removeCartItem(decodeURIComponent(button.getAttribute('data-cart-remove')));
    });
  });

  itemsHost.querySelectorAll('[data-cart-qty]').forEach((button) => {
    button.addEventListener('click', () => {
      const title = decodeURIComponent(button.getAttribute('data-cart-qty'));
      const delta = Number(button.getAttribute('data-delta'));
      changeCartItemQuantity(title, delta);
    });
  });
}

function openCartDrawer() {
  const overlay = document.querySelector('[data-cart-overlay]');
  if (!overlay) {
    return;
  }

  renderCartDrawer();
  overlay.hidden = false;
  document.body.classList.add('cart-open');
}

function closeCartDrawer() {
  const overlay = document.querySelector('[data-cart-overlay]');
  if (!overlay) {
    return;
  }

  overlay.hidden = true;
  document.body.classList.remove('cart-open');
}

function openWishlistDrawer() {
  const overlay = document.querySelector('[data-wishlist-overlay]');
  if (!overlay) {
    return;
  }

  renderWishlistDrawer();
  overlay.hidden = false;
  document.body.classList.add('cart-open');
}

function closeWishlistDrawer() {
  const overlay = document.querySelector('[data-wishlist-overlay]');
  if (!overlay) {
    return;
  }

  overlay.hidden = true;
  document.body.classList.remove('cart-open');
}

function setupCartLinks() {
  document.querySelectorAll('[data-cart-toggle]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openCartDrawer();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCartDrawer();
      closeWishlistDrawer();
      closeSearchPanel();
    }
  });
}

function setupWishlistLinks() {
  document.querySelectorAll('[data-wishlist-toggle]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openWishlistDrawer();
    });
  });
}

function syncWishlistButtons() {
  document.querySelectorAll('.book-tile, .product-card').forEach((card) => {
    const button = card.querySelector('.wishlist-top');
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    if (!button) {
      return;
    }

    const active = isInWishlist(title);
    button.classList.toggle('wished', active);
    button.innerHTML = active ? '&#10084;' : '&#9825;';
  });
}

function setupSearchLinks() {
  document.querySelectorAll('[data-search-toggle]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openSearchPanel();
    });
  });
}

function syncCartUi() {
  updateCartCount();
  renderCartDrawer();
}

function syncWishlistUi() {
  updateWishlistCount();
  syncWishlistButtons();
  renderWishlistDrawer();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.book-tile, .product-card').forEach(injectActions);
  createCartDrawer();
  createWishlistDrawer();
  createSearchPanel();
  setupCartLinks();
  setupWishlistLinks();
  setupSearchLinks();
  syncCartUi();
  syncWishlistUi();
});
