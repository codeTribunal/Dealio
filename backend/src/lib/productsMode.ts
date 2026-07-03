// PRODUCTS (product-seller) mode is deliberately parked for launch: Dealio ships
// services and freelance first. New businesses cannot select PRODUCTS through the
// UI (gated by PRODUCTS_MODE_ENABLED in the Flutter app and web) or through the
// API (the onboarding/mode-change guards that read this flag). Existing PRODUCTS
// businesses are untouched and their bots keep serving. To un-park, flip this to
// true (and the app + web flags). The catalog/checkout/order code path stays
// intact.
export const PRODUCTS_MODE_ENABLED = false;

// 400 message returned when a new PRODUCTS selection is rejected.
export const PRODUCTS_MODE_PARKED_MESSAGE =
  'Product-seller mode is not available yet. Please choose Services or Freelance.';
