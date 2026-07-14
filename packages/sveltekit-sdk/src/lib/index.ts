export { createMedusaHandle } from './hooks'
export { requestContext as getMedusaContext } from './internal/request'
export type { MedusaHandleConfig, MedusaContext, CookieNames, AuthResult } from './types'
export { braintreeCheckoutSchema } from './schemas'

// Regions
export { getRegions } from './regions.remote'

// Catalog (prerender defaults + query twins)
export { getProducts, getProduct, getProductsQuery, getProductQuery } from './products.remote'
export {
  getProductCategories,
  getProductCategory,
  getProductCategoriesQuery,
  getProductCategoryQuery
} from './categories.remote'
export { getCollections, getCollection, getCollectionsQuery, getCollectionQuery } from './collections.remote'

// Cart
export {
  getCart,
  getCartById,
  createCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  updateCart,
  selectShippingOption,
  getShippingOptions,
  completeCart
} from './cart.remote'

// Promotions
export { addPromotion, removePromotion } from './promotions.remote'

// Payment
export { listPaymentProviders, initiatePaymentSession } from './payment.remote'
export { braintreeCheckoutForm, initiateBraintreePaymentSession } from './braintree.remote'

// Orders
export { getOrders, getOrderById } from './orders.remote'

// Auth
export { login, register, requestResetPassword, resetPassword, logout } from './auth.remote'

// Customer & addresses
export { getCustomer, updateCustomer } from './customer.remote'
export { getAddresses, saveAddress, deleteAddress } from './address.remote'

// Generic primitives
export { search } from './search.remote'
export { submitForm } from './forms.remote'
