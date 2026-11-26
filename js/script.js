/* PROJECT JAVASCRIPT GUIDE
   هذا الملف يشغّل التفاعلات في الموقع مثل البحث، عرض الصور، السلة، المفضلة،
   تجهيز الطلبات، نسخ الأرقام، وروابط WhatsApp.
   غيّر إعدادات الأرقام والروابط من js/store-config.js بدلاً من تعديل منطق الدوال هنا.
*/

/* Esam Electric storefront enhancements
   Product content is editable from the browser and stored locally on this device.
   For a shared live catalog, connect this UI to a backend/API later. */
(function () {
  'use strict';

  const STORAGE = {
    catalog: 'esam-electric-catalog-v1',
    favorites: 'esam-electric-favorites-v1',
    cart: 'esam-electric-cart-v1',
    theme: 'esam-electric-theme-v1'
  };

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const safeText = (value) => String(value ?? '').trim();
  const fileNameFrom = (src) => {
    try { return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop()) || 'product-image'; }
    catch (_) { return 'product-image'; }
  };

  const cards = [...document.querySelectorAll('.product-card')];
  const products = cards.map((card, index) => {
    const image = card.querySelector('.product-image');
    const id = image ? fileNameFrom(image.getAttribute('src')) : `product-${index + 1}`;
    const title = card.querySelector('.product-name');
    const price = card.querySelector('.product-price strong');
    const description = card.querySelector('.product-notes p');
    const saved = readJSON(STORAGE.catalog, {});
    const item = saved[id] || {};
    card.dataset.productId = id;
    card.dataset.category = item.category || card.dataset.category || 'General';
    if (title && item.name) title.textContent = item.name;
    if (price && item.price) price.textContent = item.price;
    if (description && item.description) description.textContent = item.description;
    if (image && item.image) image.src = item.image;
    return {
      id, card,
      get name() { return safeText(card.querySelector('.product-name')?.textContent) || `Product ${index + 1}`; },
      get price() { return safeText(card.querySelector('.product-price strong')?.textContent) || 'Ask for price'; },
      get description() { return safeText(card.querySelector('.product-notes p')?.textContent) || 'Contact us for product details.'; },
      get image() { return card.querySelector('.product-image')?.getAttribute('src') || card.querySelector('.product-image')?.src || ''; },
      get category() { return card.dataset.category || 'General'; }
    };
  });

  let favorites = readJSON(STORAGE.favorites, []);
  let cart = readJSON(STORAGE.cart, {});

  cart = Object.fromEntries(
    Object.entries(cart).filter(([id, quantity]) =>
      products.some(p => p.id === id) &&
      Number.isFinite(Number(quantity)) &&
      Number(quantity) > 0
    ).map(([id, quantity]) => [id, Number(quantity)])
  );

  saveJSON(STORAGE.cart, cart); let activeCategory = 'All';
  let searchTerm = '';
  let sortMode = 'featured';
  let adminMode = false;

  const toast = document.createElement('div');
  toast.className = 'ee-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  /* FUNCTION notify: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  // نسخ أرقام الكهربائيين: يعمل في الصفحة الرئيسية وصفحة الدليل، مع طريقة بديلة
  // للمتصفحات التي لا تدعم Clipboard API أو عند تشغيل الموقع محلياً.
  async function copyTextToClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    field.style.pointerEvents = 'none';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); }
    finally { field.remove(); }
    if (!copied) throw new Error('Copy command was not available');
    return true;
  }

  // التقاط الضغط على أزرار النسخ في كلا الصفحتين حتى لو تم إنشاء الكارت ديناميكياً.
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.copy-number');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const number = safeText(button.dataset.copy || button.closest('td')?.querySelector('.phone-value')?.textContent).replace(/[^0-9+]/g, '');
    if (!number) {
      notify('لم يتم العثور على رقم الهاتف لنسخه.');
      return;
    }

    try {
      await copyTextToClipboard(number);
      const originalContent = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
      button.classList.add('is-copied');
      notify('تم نسخ الرقم بنجاح: ' + number);
      window.setTimeout(() => {
        if (button.isConnected) {
          button.innerHTML = originalContent;
          button.classList.remove('is-copied');
        }
      }, 1800);
    } catch (error) {
      notify('تعذر النسخ تلقائياً. اضغط مطولاً على الرقم لنسخه يدوياً.');
    }
  });

  // Add a consistent storefront toolbar above each product grid.
  const grid = document.querySelector('#Home') || document.querySelector('.products-page main .row');
  if (grid && cards.length) {
    const toolbar = document.createElement('section');
    toolbar.className = 'ee-catalog-tools container';
    toolbar.innerHTML = `
      <div class="ee-tools-heading"><div><span class="ee-kicker">FIND YOUR RIGHT FIT</span><h2>Explore our collection</h2><p>Search, organize and save products with ease.</p></div><span class="ee-results-count" aria-live="polite"></span></div>
      <div class="ee-tools-row">
        <label class="ee-search-box"><i class="fa-solid fa-magnifying-glass"></i><input type="search" class="ee-search" placeholder="Search products..." aria-label="Search products"><kbd>⌕</kbd></label>
        <label class="ee-sort-box"><span>Sort by</span><select class="ee-sort" aria-label="Sort products"><option value="featured">Featured</option><option value="name-asc">Name: A to Z</option><option value="name-desc">Name: Z to A</option></select></label>
        <button class="ee-view-toggle" type="button" aria-label="Toggle product layout" title="Toggle layout"><i class="fa-solid fa-list"></i></button>
      </div>
      <div class="ee-category-chips" aria-label="Product categories"></div>`;
    grid.parentElement.insertBefore(toolbar, grid);

    const chips = toolbar.querySelector('.ee-category-chips');
    /* FUNCTION renderCategoryChips: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
    function renderCategoryChips() {
      chips.innerHTML = '';
      const currentCategories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
      if (!currentCategories.includes(activeCategory)) activeCategory = 'All';
      currentCategories.forEach(category => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'ee-chip' + (category === activeCategory ? ' is-active' : '');
        button.textContent = category;
        button.addEventListener('click', () => {
          activeCategory = category;
          chips.querySelectorAll('.ee-chip').forEach(chip => chip.classList.toggle('is-active', chip === button));
          applyCatalog();
        });
        chips.appendChild(button);
      });
    }
    renderCategoryChips();
    toolbar.querySelector('.ee-search').addEventListener('input', event => { searchTerm = event.target.value.toLowerCase().trim(); applyCatalog(); });
    toolbar.querySelector('.ee-sort').addEventListener('change', event => { sortMode = event.target.value; applyCatalog(); });
    toolbar.querySelector('.ee-view-toggle').addEventListener('click', () => {
      grid.classList.toggle('ee-list-view');
      const icon = toolbar.querySelector('.ee-view-toggle i');
      icon.className = grid.classList.contains('ee-list-view') ? 'fa-solid fa-grip' : 'fa-solid fa-list';
    });
    /* FUNCTION applyCatalog: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
    function applyCatalog() {
      let visible = products.filter(product => {
        const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
        const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        return matchesCategory && haystack.includes(searchTerm);
      });
      if (sortMode === 'name-asc') visible.sort((a, b) => a.name.localeCompare(b.name));
      if (sortMode === 'name-desc') visible.sort((a, b) => b.name.localeCompare(a.name));
      const visibleSet = new Set(visible.map(p => p.id));
      products.forEach(product => { product.card.closest('[class*="col-"]')?.classList.toggle('ee-hidden', !visibleSet.has(product.id)); });
      toolbar.querySelector('.ee-results-count').textContent = `${visible.length} product${visible.length === 1 ? '' : 's'}`;
      let empty = document.querySelector('.ee-empty-state');
      if (!visible.length && !empty) { empty = document.createElement('div'); empty.className = 'ee-empty-state'; empty.innerHTML = '<i class="fa-solid fa-box-open"></i><h3>No products found</h3><p>Try another search or choose a different category.</p>'; grid.after(empty); }
      if (visible.length && empty) empty.remove();
    }
    window.eeRefreshCatalog = () => { renderCategoryChips(); applyCatalog(); };
    applyCatalog();
  }

  // Product actions: favorites, cart, details, and image preview.
  products.forEach(product => {
    const info = product.card.querySelector('.product-info');
    if (!info) return;
    const actions = document.createElement('div');
    actions.className = 'ee-product-actions';
    actions.innerHTML = `
      <button type="button" class="ee-add-cart"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>
      <button type="button" class="ee-favorite" aria-label="Add to wishlist" title="Add to wishlist"><i class="fa-regular fa-heart"></i></button>
      <button type="button" class="ee-edit-product" title="Edit product"><i class="fa-solid fa-pen"></i></button>`;
    info.appendChild(actions);
    actions.querySelector('.ee-add-cart').addEventListener('click', () => {
      cart[product.id] = (cart[product.id] || 0) + 1;
      saveJSON(STORAGE.cart, cart); updateCounts(); notify(`${product.name} added to your cart`);
    });
    const favoriteButton = actions.querySelector('.ee-favorite');
    const updateFavorite = () => {
      const active = favorites.includes(product.id);
      favoriteButton.classList.toggle('is-favorite', active);
      favoriteButton.innerHTML = `<i class="${active ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
      favoriteButton.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
    };
    updateFavorite();
    favoriteButton.addEventListener('click', () => {
      favorites = favorites.includes(product.id) ? favorites.filter(id => id !== product.id) : [...favorites, product.id];
      saveJSON(STORAGE.favorites, favorites); updateFavorite(); updateCounts();
      notify(favorites.includes(product.id) ? 'Saved to your wishlist' : 'Removed from wishlist');
    });
    actions.querySelector('.ee-edit-product').addEventListener('click', () => editProduct(product));
    product.card.querySelector('.product-image')?.addEventListener('click', () => openPreview(product));
    product.card.querySelector('.product-image')?.setAttribute('tabindex', '0');
    product.card.querySelector('.product-image')?.setAttribute('role', 'button');
    product.card.querySelector('.product-image')?.setAttribute('aria-label', `View ${product.name} image`);
    product.card.querySelector('.product-image')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPreview(product); }
    });
  });

  // Header actions and responsive cart drawer.
  const header = document.querySelector('.products-page .navbar .container, .navbar .container-fluid');
  if (header) {
    const controls = document.createElement('div');
    controls.className = 'ee-header-actions';
    controls.innerHTML = `<button class="ee-header-btn ee-wishlist-open" type="button" aria-label="Wishlist" title="Wishlist"><i class="fa-regular fa-heart"></i><span class="ee-wishlist-count">0</span></button><button class="ee-header-btn ee-cart-open" type="button" aria-label="Shopping cart" title="Shopping cart"><i class="fa-solid fa-bag-shopping"></i><span class="ee-cart-count">0</span></button><button class="ee-header-btn ee-theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme"><i class="fa-solid fa-moon"></i></button></div>`;
    header.appendChild(controls);
  }

  const drawer = document.createElement('aside');
  drawer.className = 'ee-drawer';
  drawer.setAttribute('aria-label', 'Shopping cart');
  drawer.innerHTML = `<div class="ee-drawer-backdrop"></div><div class="ee-drawer-panel"><div class="ee-drawer-head"><div><span class="ee-kicker">YOUR SELECTION</span><h2 class="ee-drawer-title">Your cart</h2></div><button class="ee-drawer-close" type="button" aria-label="Close panel">&times;</button></div><div class="ee-drawer-items"></div><div class="ee-drawer-footer"><div class="ee-drawer-total"><span>Total items</span><strong class="ee-drawer-count">0</strong></div><button class="ee-copy-order" type="button"><i class="fa-regular fa-copy"></i> Copy order summary</button><button class="ee-whatsapp-order" type="button"><i class="fa-brands fa-whatsapp"></i> ..ارسال الطلب  الواتساب</button><button class="ee-clear-cart" type="button">Clear cart</button><p>Prices and availability are confirmed by the store.</p></div></div>`;
  document.body.appendChild(drawer);

  const favoritesPanel = document.createElement('aside');
  favoritesPanel.className = 'ee-drawer ee-wishlist-drawer';
  favoritesPanel.innerHTML = `<div class="ee-drawer-backdrop"></div><div class="ee-drawer-panel"><div class="ee-drawer-head"><div><span class="ee-kicker">SAVED FOR LATER</span><h2 class="ee-drawer-title">Your wishlist</h2></div><button class="ee-drawer-close" type="button" aria-label="Close panel">&times;</button></div><div class="ee-drawer-items"></div></div>`;
  document.body.appendChild(favoritesPanel);

  /* FUNCTION updateCounts: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */

  function updateCounts() {
    const count = Object.values(cart).reduce((sum, quantity) => sum + Number(quantity), 0);
    document.querySelectorAll('.ee-cart-count').forEach(el => el.textContent = count);
    document.querySelectorAll('.ee-wishlist-count').forEach(el => el.textContent = favorites.length);
    renderDrawer(); renderWishlist();
  }
  /* FUNCTION renderDrawer: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function renderDrawer() {
    const target = drawer.querySelector('.ee-drawer-items');
    const entries = products.filter(p => cart[p.id]);
    target.innerHTML = '';
    if (!entries.length) { target.innerHTML = '<div class="ee-drawer-empty"><i class="fa-solid fa-bag-shopping"></i><h3>Your cart is empty</h3><p>Explore the collection and add products you like.</p></div>'; }
    entries.forEach(p => {
      const row = document.createElement('div'); row.className = 'ee-cart-item';
      const img = document.createElement('img'); img.src = p.image; img.alt = p.name;
      const details = document.createElement('div'); details.className = 'ee-cart-details';
      const name = document.createElement('strong'); name.textContent = p.name;
      const price = document.createElement('span'); price.textContent = p.price;
      const qty = document.createElement('div'); qty.className = 'ee-quantity';
      qty.innerHTML = `<button type="button" aria-label="Decrease quantity">−</button><span>${cart[p.id]}</span><button type="button" aria-label="Increase quantity">+</button>`;
      qty.children[0].addEventListener('click', () => { cart[p.id]--; if (cart[p.id] <= 0) delete cart[p.id]; saveJSON(STORAGE.cart, cart); updateCounts(); });
      qty.children[2].addEventListener('click', () => { cart[p.id]++; saveJSON(STORAGE.cart, cart); updateCounts(); });
      details.append(name, price, qty); row.append(img, details); target.appendChild(row);
    });
    drawer.querySelector('.ee-drawer-count').textContent = Object.values(cart).reduce((s, q) => s + q, 0);
    drawer.querySelector('.ee-drawer-footer').classList.toggle('is-empty', !entries.length);
  }
  /* FUNCTION renderWishlist: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function renderWishlist() {
    const target = favoritesPanel.querySelector('.ee-drawer-items');
    const entries = products.filter(p => favorites.includes(p.id)); target.innerHTML = '';
    if (!entries.length) { target.innerHTML = '<div class="ee-drawer-empty"><i class="fa-regular fa-heart"></i><h3>No saved products yet</h3><p>Tap the heart on a product to save it here.</p></div>'; }
    entries.forEach(p => {
      const row = document.createElement('div'); row.className = 'ee-cart-item';
      const img = document.createElement('img'); img.src = p.image; img.alt = p.name;
      const details = document.createElement('div'); details.className = 'ee-cart-details';
      const name = document.createElement('strong'); name.textContent = p.name;
      const add = document.createElement('button'); add.className = 'ee-mini-action'; add.textContent = 'Add to cart';
      add.addEventListener('click', () => { cart[p.id] = (cart[p.id] || 0) + 1; saveJSON(STORAGE.cart, cart); updateCounts(); notify('Added to cart'); });
      details.append(name, add); row.append(img, details); target.appendChild(row);
    });
  }
  /* FUNCTION openDrawer: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function openDrawer(element) { element.classList.add('is-open'); document.body.classList.add('ee-panel-open'); element.querySelector('.ee-drawer-close').focus(); }
  /* FUNCTION closeDrawers: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function closeDrawers() { document.querySelectorAll('.ee-drawer').forEach(el => el.classList.remove('is-open')); document.body.classList.remove('ee-panel-open'); }
  document.querySelector('.ee-cart-open')?.addEventListener('click', () => openDrawer(drawer));
  document.querySelector('.ee-wishlist-open')?.addEventListener('click', () => openDrawer(favoritesPanel));
  document.querySelectorAll('.ee-drawer').forEach(panel => {
    panel.querySelector('.ee-drawer-close').addEventListener('click', closeDrawers);
    panel.querySelector('.ee-drawer-backdrop').addEventListener('click', closeDrawers);
  });
  drawer.querySelector('.ee-whatsapp-order').addEventListener('click', () => {
    const number = safeText(window.ESAM_STORE_CONFIG?.whatsappNumber).replace(/\D/g, '');
    const lines = products.filter(p => cart[p.id]).map(p => `${p.name} × ${cart[p.id]} — ${p.price}`);
    if (!lines.length) return notify('Your cart is empty');
    if (!number) return notify('Add your WhatsApp number in js/store-config.js first');
    const message = `مرحباً Esam Electric 👋

أرغب في الاستفسار عن المنتجات التالية:

${products.filter(p => cart[p.id]).map(p => `اسم المنتج = ${p.name}
العدد = ${cart[p.id]}`).join('\n\n')}

من فضلكم تأكدوا من توافر المنتجات والأسعار النهائية.

شكراً لكم ❤️.`;

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });
  drawer.querySelector('.ee-clear-cart').addEventListener('click', () => { cart = {}; saveJSON(STORAGE.cart, cart); updateCounts(); notify('Cart cleared'); });
  drawer.querySelector('.ee-copy-order').addEventListener('click', async () => {
    const lines = products.filter(p => cart[p.id]).map(p => `${p.name} × ${cart[p.id]} — ${p.price}`);
    if (!lines.length) return notify('Your cart is empty');
    const summary = `Esam Electric order request\n${lines.join('\n')}\n\nPlease confirm availability and final prices.`;
    try { await navigator.clipboard.writeText(summary); notify('Order summary copied. You can send it to the store.'); }
    catch (_) { window.prompt('Copy your order summary:', summary); }
  });

  // Accessible image / product details preview with reliable local-file download.
  const modal = document.createElement('div');
  modal.className = 'ee-preview-modal';
  modal.innerHTML = `<div class="ee-preview-backdrop"></div><div class="ee-preview-dialog" role="dialog" aria-modal="true" aria-label="Product details"><button class="ee-preview-close" type="button" aria-label="Close">&times;</button><div class="ee-preview-image-wrap"><img class="ee-preview-image" alt="Product preview"></div><div class="ee-preview-info"><span class="ee-kicker">ESAM ELECTRIC</span><h2 class="ee-preview-name"></h2><p class="ee-preview-description"></p><div class="ee-preview-price"></div><div class="ee-preview-actions"><button class="ee-preview-download" type="button"><i class="fa-solid fa-download"></i> Download image</button><button class="ee-preview-cart" type="button"><i class="fa-solid fa-cart-plus"></i> Add to cart</button></div></div></div>`;
  document.body.appendChild(modal);
  let selectedProduct = null;
  /* FUNCTION openPreview: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function openPreview(product) {
    selectedProduct = product;
    modal.querySelector('.ee-preview-image').src = product.image;
    modal.querySelector('.ee-preview-image').alt = product.name;
    modal.querySelector('.ee-preview-name').textContent = product.name;
    modal.querySelector('.ee-preview-description').textContent = product.description;
    modal.querySelector('.ee-preview-price').textContent = product.price;
    modal.classList.add('is-open'); document.body.classList.add('ee-panel-open');
    modal.querySelector('.ee-preview-close').focus();
  }
  /* FUNCTION closePreview: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function closePreview() { modal.classList.remove('is-open'); document.body.classList.remove('ee-panel-open'); modal.querySelector('.ee-preview-image').removeAttribute('src'); selectedProduct = null; }
  modal.querySelector('.ee-preview-close').addEventListener('click', closePreview);
  modal.querySelector('.ee-preview-backdrop').addEventListener('click', closePreview);
  modal.querySelector('.ee-preview-cart').addEventListener('click', () => {
    if (!selectedProduct) return;
    cart[selectedProduct.id] = (cart[selectedProduct.id] || 0) + 1; saveJSON(STORAGE.cart, cart); updateCounts(); notify('Added to cart');
  });
  modal.querySelector('.ee-preview-download').addEventListener('click', () => {
    if (!selectedProduct) return;
    const anchor = document.createElement('a');
    anchor.href = selectedProduct.image;
    anchor.download = fileNameFrom(selectedProduct.image);
    anchor.target = '_blank'; anchor.rel = 'noopener';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    notify('Image download requested');
  });

  // Simple local catalog editor. Changes are stored in this browser only.
  /* FUNCTION editProduct: دالة مسؤولة عن الجزء الموضح باسمها؛ راجع محتواها قبل تعديل السلوك. */
  function editProduct(product) {
    if (!adminMode && !confirm('Open the local product editor? Changes are saved only in this browser.')) return;
    const name = prompt('Product name:', product.name); if (name === null) return;
    const price = prompt('Price or price note (e.g. Contact us):', product.price); if (price === null) return;
    const description = prompt('Short product description:', product.description); if (description === null) return;
    const category = prompt('Category (e.g. Lighting, Tools, Smart Home):', product.category); if (category === null) return;
    const imagePath = prompt('Image path (e.g. img/new-product.jpg). Leave unchanged to keep current image:', product.image); if (imagePath === null) return;
    const record = readJSON(STORAGE.catalog, {});
    record[product.id] = { name: safeText(name) || product.name, price: safeText(price) || 'Ask for price', description: safeText(description), category: safeText(category) || 'General', image: safeText(imagePath) || product.image };
    saveJSON(STORAGE.catalog, record);
    product.card.querySelector('.product-name').textContent = record[product.id].name;
    product.card.querySelector('.product-price strong').textContent = record[product.id].price;
    product.card.querySelector('.product-notes p').textContent = record[product.id].description;
    product.card.querySelector('.product-image').src = record[product.id].image;
    product.card.dataset.category = record[product.id].category;
    document.body.classList.add('ee-admin-mode');
    notify('Product updated on this device. Refresh to see saved changes.');
    if (window.eeRefreshCatalog) window.eeRefreshCatalog();
  }

  // Admin / maintenance tools: edit products, export and import the catalog.
  const admin = document.createElement('div'); admin.className = 'ee-admin-tools';
  admin.innerHTML = `<button class="ee-admin-toggle" type="button"><i class="fa-solid fa-sliders"></i> Manage catalog</button><div class="ee-admin-menu"><p>Manage your product information on this device.</p><button class="ee-export" type="button"><i class="fa-solid fa-file-export"></i> Export catalog backup</button><button class="ee-import" type="button"><i class="fa-solid fa-file-import"></i> Import catalog backup</button><button class="ee-admin-done" type="button">Close</button><input class="ee-import-file" type="file" accept="application/json" hidden></div>`;
  document.body.appendChild(admin);
  if (new URLSearchParams(location.search).get('manage') === '1') admin.classList.add('is-enabled');
  admin.querySelector('.ee-admin-toggle').addEventListener('click', () => { admin.classList.toggle('is-open'); adminMode = admin.classList.contains('is-open'); document.body.classList.toggle('ee-admin-mode', adminMode); });
  admin.querySelector('.ee-admin-done').addEventListener('click', () => { admin.classList.remove('is-open'); adminMode = false; document.body.classList.remove('ee-admin-mode'); });
  admin.querySelector('.ee-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(readJSON(STORAGE.catalog, {}), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'esam-electric-catalog.json'; a.click(); URL.revokeObjectURL(url); notify('Catalog backup exported');
  });
  const importInput = admin.querySelector('.ee-import-file');
  admin.querySelector('.ee-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0]; if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid catalog');
      saveJSON(STORAGE.catalog, imported); notify('Catalog imported. Reloading page...'); setTimeout(() => location.reload(), 700);
    } catch (_) { notify('Could not import this file. Choose a valid catalog backup.'); }
    importInput.value = '';
  });

  // Theme preference and small quality-of-life utilities.
  const savedTheme = localStorage.getItem(STORAGE.theme);
  if (savedTheme === 'dark') document.body.classList.add('ee-dark-theme');
  document.querySelector('.ee-theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('ee-dark-theme');
    localStorage.setItem(STORAGE.theme, document.body.classList.contains('ee-dark-theme') ? 'dark' : 'light');
  });
  const backTop = document.createElement('button'); backTop.className = 'ee-back-top'; backTop.type = 'button'; backTop.innerHTML = '<i class="fa-solid fa-arrow-up"></i>'; backTop.setAttribute('aria-label', 'Back to top'); document.body.appendChild(backTop);
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => backTop.classList.toggle('is-visible', window.scrollY > 450), { passive: true });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeDrawers(); if (modal.classList.contains('is-open')) closePreview(); }
  });

  // Improve existing links that still point to empty placeholders.
  document.querySelectorAll('a[href="#"]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); notify('This link needs the store contact details in js/store-config.js'); }));
  const config = window.ESAM_STORE_CONFIG || {};
  const whatsappNumber = safeText(config.whatsappNumber).replace(/\D/g, '');
  document.querySelectorAll('[data-team-whatsapp]').forEach(link => {
    const configKey = link.dataset.teamWhatsapp;
    const teamNumber = safeText(config[configKey]).replace(/\D/g, '');
    if (teamNumber) {
      const message = `Hello, I contacted you through the Esam Electric website.`;
      link.href = `https://wa.me/${teamNumber}?text=${encodeURIComponent(message)}`;
    } else {
      link.addEventListener('click', event => {
        event.preventDefault();
        notify(`Add ${configKey} in js/store-config.js to activate this WhatsApp button.`);
      });
      link.title = `Set ${configKey} in js/store-config.js`;
    }
  });
  document.querySelectorAll('a[href*="wa.me/201XXXXXXXXX"]').forEach(link => {
    if (whatsappNumber) link.href = `https://wa.me/${whatsappNumber}`;
    else { link.href = '#'; link.title = 'Set the store WhatsApp number in js/store-config.js'; link.addEventListener('click', event => { event.preventDefault(); notify('Set the store WhatsApp number in js/store-config.js first'); }); }
  });
  const facebookLink = document.querySelector('a[href*="YOUR_PAGE_USERNAME"]');
  if (facebookLink) { if (config.facebookUrl) facebookLink.href = config.facebookUrl; else { facebookLink.href = '#'; facebookLink.addEventListener('click', event => { event.preventDefault(); notify('Set the Facebook page URL in js/store-config.js first'); }); } }

  updateCounts();
})();
