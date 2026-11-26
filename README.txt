ESAM ELECTRIC — WEBSITE PACKAGE
================================

START THE WEBSITE
-----------------
1. Extract the ZIP file.
2. Open the EsamElectric folder in Visual Studio Code.
3. Run index.html with the Live Server extension.
4. Use the navigation to open Products or Electrical Man.

CUSTOMIZE PRODUCT DETAILS
-------------------------
The product names, prices and descriptions are still generic where the original project did not provide real product information. Replace them with accurate store information before publishing.

Quick local catalog editor:
- Open the home page with ?manage=1 at the end of its address.
  Example: http://127.0.0.1:5500/index.html?manage=1
- Click Manage catalog.
- Click the pencil icon on a product and update its name, price text, description, category and image path.
- Image paths should be relative to this folder, for example: img/new-product.jpg
- The editor saves changes in the current browser's local storage.
- Use Export catalog backup to save a JSON backup, and Import catalog backup to restore it.

IMPORTANT LIMITATION:
The quick editor is a local convenience tool, not secure administrator authentication. Changes are stored only in the browser where they were made and are not shared with customers or other devices. For a real multi-user online store, connect the catalog to a backend/database and protect administration with server-side authentication. Do not treat the ?manage=1 setting as a security feature.

STORE CONTACT SETTINGS
----------------------
Open js/store-config.js and fill in:
- whatsappNumber: store WhatsApp number, country code + number, digits only (Egypt starts with 20)
- teamMember1WhatsApp: Ahmed Samir personal WhatsApp number, country code + number, digits only
- teamMember2WhatsApp: Omar Khaled personal WhatsApp number, country code + number, digits only
- facebookUrl: the real Facebook page URL
- instagramUrl: the real Instagram page URL
- storeEmail: the real store email address

The WhatsApp cart action stays inactive until a real number is configured. The cart can still copy an order summary.
The two team WhatsApp buttons each use their own number. Add both individual numbers above to activate them; do not enter a number unless you have permission to publish it.

WHAT WORKS IN THIS STATIC VERSION
---------------------------------
- Responsive home, product catalog and electrician directory pages
- Product image preview fitted to the screen, close button and image download action
- Product search, category filtering and alphabetical sorting
- Grid/list layout switch
- Wishlist saved in the current browser
- Shopping cart with quantity controls and clear-cart action
- Copy order summary and optional WhatsApp handoff after configuring the number
- Product details editor, catalog JSON import/export
- Electrician directory search and copy-phone actions
- Light/dark theme preference and back-to-top button

NOT INCLUDED
------------
There is no real payment gateway, stock synchronization, customer account system, server-side order processing or cross-device catalog database. Those require a backend and trusted service credentials. The electrician directory currently contains sample entries from the supplied project; verify or replace every entry before publishing.
