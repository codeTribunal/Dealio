// Feature flags for the owner web app.

// PRODUCTS (product-seller) mode is deliberately parked for launch: Dealio ships
// services and freelance first. When false, the Products option is hidden in
// onboarding and in settings (except for a business already in PRODUCTS mode),
// and the backend rejects new PRODUCTS selections. Existing PRODUCTS businesses
// keep working and their bots keep serving. To un-park, flip this to true (and
// the matching Flutter app + backend flags). The catalog/checkout/order code
// path is left intact.
export const PRODUCTS_MODE_ENABLED = false;
