/* app.js - SmartShop frontend logic (vanilla JS) */

/* ---------- Config ---------- */
const API_PRODUCTS = 'https://fakestoreapi.com/products';
const DELIVERY_CHARGE = 50; 
const SHIPPING_COST = 30;   
const START_BALANCE = 1000; 
const ADD_MONEY_AMOUNT = 1000;
const VALID_COUPON = 'SMART10';
const COUPON_DISCOUNT = 0.10; 

/* ---------- Simple state ---------- */
let products = [];
let filteredProducts = [];
let cart = {}; // {productId: qty}
let balance = Number(localStorage.getItem('ss_balance')) || START_BALANCE;
let appliedCoupon = null;

/* ---------- DOM refs ---------- */
const productsGrid = document.getElementById('products-grid');
const cartToggle = document.getElementById('cart-toggle');
const cartDropdown = document.getElementById('cart-dropdown');
const cartCount = document.getElementById('cart-count');
const cartItemsEl = document.getElementById('cart-items');
const subtotalText = document.getElementById('subtotal-text');
const deliveryText = document.getElementById('delivery-text');
const shippingText = document.getElementById('shipping-text');
const totalText = document.getElementById('total-text');
const couponInput = document.getElementById('coupon-input');
const applyCouponBtn = document.getElementById('apply-coupon');
const balanceEl = document.getElementById('balance');
const addMoneyBtn = document.getElementById('add-money');
const checkoutBtn = document.getElementById('checkout-btn');
const bannerContainer = document.getElementById('banner-container');
const bannerPrev = document.getElementById('banner-prev');
const bannerNext = document.getElementById('banner-next');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const categoryFilter = document.getElementById('category-filter');
const reviewsContainer = document.getElementById('reviews-carousel');
const reviewsPrev = document.getElementById('reviews-prev');
const reviewsNext = document.getElementById('reviews-next');
const navLinks = document.querySelectorAll('.nav-link');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');
const themeToggle = document.getElementById('theme-toggle');
const backToTop = document.getElementById('back-to-top');
const yearSpan = document.getElementById('year');
const contactForm = document.getElementById('contact-form');
const contactFeedback = document.getElementById('contact-feedback');
const categorySelect = categoryFilter;

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  yearSpan.textContent = new Date().getFullYear();
  updateBalanceUI();
  loadProducts();
  loadReviews();
  setupBanner();
  setupListeners();
  loadCartFromStorage();
  renderProducts();
  renderCart();
});

/* ---------- Product fetching & rendering ---------- */
async function loadProducts() {
  try {
    const res = await fetch(API_PRODUCTS);
    products = await res.json();
    filteredProducts = [...products];
    populateCategories();
    renderProducts();
  } catch (e) {
    console.error('Products load failed', e);
    products = [];
    filteredProducts = [];
  }
}

function populateCategories() {
  const cats = Array.from(new Set(products.map(p => p.category)));
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = capitalize(c);
    categorySelect.appendChild(opt);
  });
}

/* Render product cards */
function renderProducts() {
  const q = searchInput?.value?.toLowerCase() || '';
  const cat = categorySelect?.value || 'all';
  filteredProducts = products.filter(p => {
    const matchQ = p.title.toLowerCase().includes(q);
    const matchC = (cat === 'all') ? true : p.category === cat;
    return matchQ && matchC;
  });

  // sort
  const s = sortSelect.value;
  if (s === 'price-asc') filteredProducts.sort((a,b)=>a.price-b.price);
  else if (s === 'price-desc') filteredProducts.sort((a,b)=>b.price-a.price);
  else if (s === 'rating-desc') filteredProducts.sort((a,b)=> (b.rating?.rate||0) - (a.rating?.rate||0));

  productsGrid.innerHTML = '';
  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = '<p class="p-4 bg-white rounded">No products found.</p>';
    return;
  }
  filteredProducts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded p-3 shadow flex flex-col';
    card.innerHTML = `
      <img src="${p.image}" alt="${escapeHtml(p.title)}" class="h-40 object-contain mb-2">
      <h3 class="font-semibold text-sm mb-1">${truncate(p.title,60)}</h3>
      <div class="text-sm mb-2">Price: <strong>${Math.round(p.price)} BDT</strong></div>
      <div class="flex items-center gap-2 text-xs mb-2">
        <div class="px-2 py-1 bg-gray-100 rounded">Rating: ${(p.rating?.rate||0)}</div>
        <div class="text-gray-500">(${p.rating?.count||0} reviews)</div>
      </div>
      <div class="mt-auto pt-2">
        <button data-id="${p.id}" class="add-to-cart w-full px-3 py-2 bg-blue-600 text-white rounded">Add to Cart</button>
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

/* ---------- Cart & calculations ---------- */
function addToCart(productId) {
  productId = String(productId);
  if (!cart[productId]) cart[productId] = 0;
  cart[productId] += 1;
  saveCartToStorage();
  renderCart();
}

function removeFromCart(productId) {
  productId = String(productId);
  if (!cart[productId]) return;
  delete cart[productId];
  saveCartToStorage();
  renderCart();
}

function changeQty(productId, qty) {
  productId = String(productId);
  qty = Number(qty);
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCartToStorage();
  renderCart();
}

function renderCart() {
  // items
  cartItemsEl.innerHTML = '';
  let subtotal = 0;
  let itemsCount = 0;
  Object.keys(cart).forEach(id => {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    const qty = cart[id];
    const price = Math.round(p.price) * qty;
    subtotal += price;
    itemsCount += qty;

    const item = document.createElement('div');
    item.className = 'flex items-center gap-3';
    item.innerHTML = `
      <img src="${p.image}" class="w-12 h-12 object-contain" alt="">
      <div class="flex-1 text-sm">
        <div class="font-medium">${truncate(p.title,40)}</div>
        <div class="text-xs text-gray-600">${Math.round(p.price)} BDT x <input data-id="${id}" class="qty-input w-12 px-1 border rounded text-sm" value="${qty}" type="number" min="1"></div>
      </div>
      <div class="text-sm">${price} BDT</div>
      <button data-id="${id}" class="remove-item text-red-600 text-sm ml-2">Remove</button>
    `;
    cartItemsEl.appendChild(item);
  });

  // show counts
  cartCount.textContent = itemsCount;
  subtotalText.textContent = `${subtotal} BDT`;
  deliveryText.textContent = `${DELIVERY_CHARGE} BDT`;
  shippingText.textContent = `${SHIPPING_COST} BDT`;

  // coupon
  let discount = 0;
  if (appliedCoupon === VALID_COUPON) {
    discount = Math.round(subtotal * COUPON_DISCOUNT);
  }

  const total = subtotal + DELIVERY_CHARGE + SHIPPING_COST - discount;
  totalText.textContent = `${total} BDT`;

  // disable checkout if over balance
  if (total > balance) {
    checkoutBtn.disabled = true;
    checkoutBtn.classList.add('opacity-60', 'cursor-not-allowed');
    showBalanceWarning(true, total);
  } else {
    checkoutBtn.disabled = false;
    checkoutBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    showBalanceWarning(false);
  }
}

/* ---------- Coupon ---------- */
applyCouponBtn.addEventListener('click', () => {
  const code = couponInput.value.trim().toUpperCase();
  if (code === VALID_COUPON) {
    appliedCoupon = code;
    alert('Coupon applied: 10% off');
  } else {
    appliedCoupon = null;
    alert('Invalid coupon');
  }
  renderCart();
});

/* ---------- Balance / Add money ---------- */
function updateBalanceUI() {
  balanceEl.innerHTML = `Balance: <strong>${balance} BDT</strong>`;
  localStorage.setItem('ss_balance', String(balance));
  renderCart();
}

addMoneyBtn.addEventListener('click', () => {
  balance += ADD_MONEY_AMOUNT;
  updateBalanceUI();
});

/* ---------- Checkout ---------- */
checkoutBtn.addEventListener('click', () => {
  // compute total
  let subtotal = 0;
  Object.keys(cart).forEach(id => {
    const p = products.find(x => String(x.id) === String(id));
    if (!p) return;
    subtotal += Math.round(p.price) * cart[id];
  });
  let discount = (appliedCoupon === VALID_COUPON) ? Math.round(subtotal * COUPON_DISCOUNT) : 0;
  const total = subtotal + DELIVERY_CHARGE + SHIPPING_COST - discount;

  if (total > balance) {
    alert(`Not enough balance! You need ${total} BDT but have ${balance} BDT.`);
    return;
  }

  // process
  balance -= total;
  cart = {};
  appliedCoupon = null;
  couponInput.value = '';
  saveCartToStorage();
  updateBalanceUI();
  renderCart();
  alert('Purchase successful! Thanks for shopping.');
});

/* ---------- Cart storage ---------- */
function saveCartToStorage() {
  localStorage.setItem('ss_cart', JSON.stringify(cart));
}
function loadCartFromStorage() {
  const c = localStorage.getItem('ss_cart');
  if (c) {
    try { cart = JSON.parse(c); } catch { cart = {}; }
  }
}

/* ---------- Banner (carousel) ---------- */
const banners = [
  {img: 'image/banner 1.jpg', text: 'Big Sale - Up to 50% Off'},
  {img: 'image/banner 2.jpg', text: 'Up Coming'},
  {img: 'image/banner 3.jpg', text: 'Free Shipping Over 1000 BDT'}
];

let bannerIndex = 0;
let bannerInterval;

function setupBanner() {
  renderBanner();
  bannerInterval = setInterval(()=>{ bannerIndex=(bannerIndex+1)%banners.length; renderBanner(); }, 4000);
  bannerPrev.addEventListener('click', ()=>{ bannerIndex = (bannerIndex-1 + banners.length)%banners.length; renderBanner(); resetBannerInterval();});
  bannerNext.addEventListener('click', ()=>{ bannerIndex = (bannerIndex+1)%banners.length; renderBanner(); resetBannerInterval();});
}

function renderBanner() {
  bannerContainer.innerHTML = '';
  const b = banners[bannerIndex];
  const slide = document.createElement('div');
  slide.className = 'absolute inset-0';
  slide.innerHTML = `
    <img src="${b.img}" class="w-full h-full object-cover brightness-90">
    <div class="absolute left-6 bottom-6 bg-black/50 text-white p-3 rounded">
      <h3 class="text-lg font-semibold">${escapeHtml(b.text)}</h3>
    </div>
  `;
  bannerContainer.appendChild(slide);
}

function resetBannerInterval() {
  clearInterval(bannerInterval);
  bannerInterval = setInterval(()=>{ bannerIndex=(bannerIndex+1)%banners.length; renderBanner(); }, 4000);
}

/* ---------- Reviews carousel (local reviews.json) ---------- */
let reviews = [];
let reviewIndex = 0;
let reviewInterval;

async function loadReviews() {
  try {
    const res = await fetch('reviews.json');
    reviews = await res.json();
  } catch(e) {
    console.error('reviews load failed', e);
    reviews = [
      {name:'Guest','comment':'Great shop!','rating':5,'date':'2025-01-01'}
    ];
  }
  renderReview();
  reviewInterval = setInterval(()=>{ nextReview(); }, 5000);
  reviewsPrev.addEventListener('click', ()=>{ prevReview(); resetReviewInterval();});
  reviewsNext.addEventListener('click', ()=>{ nextReview(); resetReviewInterval();});
}

function renderReview() {
  if (reviews.length===0) { reviewsContainer.innerHTML = '<p>No reviews yet.</p>'; return; }
  const r = reviews[reviewIndex];
  reviewsContainer.innerHTML = `
    <div>
      <div class="text-sm font-semibold">${escapeHtml(r.name)} <span class="text-xs text-gray-500">- ${escapeHtml(r.date)}</span></div>
      <div class="text-yellow-600 text-sm">Rating: ${r.rating} / 5</div>
      <p class="mt-2 text-sm">${escapeHtml(r.comment)}</p>
    </div>
  `;
}
function nextReview(){ reviewIndex = (reviewIndex+1)%reviews.length; renderReview(); }
function prevReview(){ reviewIndex = (reviewIndex-1 + reviews.length)%reviews.length; renderReview(); }
function resetReviewInterval(){ clearInterval(reviewInterval); reviewInterval = setInterval(()=>{ nextReview(); }, 5000); }

/* ---------- Listeners (delegated) ---------- */
function setupListeners() {
  // Add to cart (delegated)
  productsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;
    const id = btn.dataset.id;
    addToCart(id);
  });

  // Cart toggle
  cartToggle.addEventListener('click', () => {
    cartDropdown.classList.toggle('hidden');
  });

  // Remove item & qty change (delegated)
  cartItemsEl.addEventListener('click', (e) => {
    const rem = e.target.closest('.remove-item');
    if (rem) {
      removeFromCart(rem.dataset.id);
      return;
    }
  });

  cartItemsEl.addEventListener('change', (e) => {
    const q = e.target.closest('.qty-input');
    if (q) {
      changeQty(q.dataset.id, Number(q.value));
    }
  });

  // Mobile menu
  mobileMenuBtn.addEventListener('click', ()=>{ mobileNav.classList.toggle('hidden'); });

  // Search & sort
  searchInput.addEventListener('input', ()=> renderProducts());
  sortSelect.addEventListener('change', ()=> renderProducts());
  categorySelect.addEventListener('change', ()=> renderProducts());

  // nav active highlight
  document.addEventListener('scroll', highlightNavOnScroll);
  navLinks.forEach(a=>a.addEventListener('click', ()=>{ setTimeout(highlightNavOnScroll, 100); }));

  // back to top
  window.addEventListener('scroll', ()=> {
    if (window.scrollY > 300) backToTop.classList.remove('hidden'); else backToTop.classList.add('hidden');
  });
  backToTop.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));

  // contact form
  contactForm.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const msg = document.getElementById('contact-msg').value.trim();
    if (!name || !email || !msg) {
      alert('Please fill all fields.');
      return;
    }
    contactFeedback.classList.remove('hidden');
    contactForm.reset();
    setTimeout(()=> contactFeedback.classList.add('hidden'), 4000);
  });

  // theme toggle (simple)
  themeToggle?.addEventListener('click', ()=>{
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
      themeToggle.textContent = 'Light';
      document.body.classList.add('bg-gray-900','text-gray-100');
    } else {
      themeToggle.textContent = 'Dark';
      document.body.classList.remove('bg-gray-900','text-gray-100');
    }
  });

  // Click outside to close cart
  document.addEventListener('click', (e) => {
    if (!cartDropdown.classList.contains('hidden')) {
      if (!cartDropdown.contains(e.target) && !cartToggle.contains(e.target)) {
        cartDropdown.classList.add('hidden');
      }
    }
  });
}

/* ---------- Helpers ---------- */
function truncate(str, n) { return str.length > n ? str.slice(0,n-1) + '…' : str; }
function capitalize(s){ return s && s[0].toUpperCase()+s.slice(1); }
function escapeHtml(s){ if (!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function showBalanceWarning(show, total) {
  const existing = document.getElementById('balance-warning');
  if (show) {
    const msg = existing || document.createElement('div');
    msg.id = 'balance-warning';
    msg.className = 'text-sm text-red-600 mt-2';
    msg.textContent = `Total (${total} BDT) exceeds your balance (${balance} BDT). Please add money.`;
    cartDropdown.appendChild(msg);
  } else {
    if (existing) existing.remove();
  }
}

/* nav highlight */
function highlightNavOnScroll() {
  const sections = ['home','products','reviews','contact'];
  let cur = 'home';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top <= 120) cur = id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('bg-gray-100', a.getAttribute('href') === '#' + cur);
  });
}

/* ---------- Persist cart UI on reload ---------- */
window.addEventListener('load', () => {
  renderCart();
});
