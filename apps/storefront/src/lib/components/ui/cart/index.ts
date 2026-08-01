import Root from './cart.svelte'
import Trigger from './cart-trigger.svelte'
import Badge from './cart-badge.svelte'
import Sheet from './cart-sheet.svelte'
import Content from './cart-content.svelte'
import Header from './cart-header.svelte'
import Items from './cart-items.svelte'
import Item from './cart-item.svelte'
import Image from './cart-image.svelte'
import Title from './cart-title.svelte'
import Price from './cart-price.svelte'
import ItemSubtotal from './cart-item-subtotal.svelte'
import Quantity from './cart-quantity.svelte'
import Remove from './cart-remove.svelte'
import Subtotal from './cart-subtotal.svelte'
import Checkout from './cart-checkout.svelte'
import Empty from './cart-empty.svelte'

// `Trigger`, `Content` and `Header` are the drawer's sheet parts, flattened onto this barrel so a
// consumer never has to reach for the raw shadcn `Sheet` alongside `Cart`:
//   <Cart.Root>
//     <Cart.Sheet>
//       <Cart.Trigger />
//       <Cart.Content>
//         <Cart.Header />
//         <Cart.Items>…</Cart.Items>
//       </Cart.Content>
//     </Cart.Sheet>
//   </Cart.Root>
// `Cart.Sheet` is optional — the same parts render inline on a /cart page without it.
export { Root, Trigger, Badge, Sheet, Content, Header, Items, Item, Image, Title, Price, ItemSubtotal, Quantity, Remove, Subtotal, Checkout, Empty }
export {
	getCartContext,
	getCartContextOptional,
	setCartContext,
	getCartLineContext,
	setCartLineContext,
	getCartSheetContextOptional,
	setCartSheetContext
} from './ctx.svelte.js'
export type { CartContext, CartLineContext, CartSheetContext } from './ctx.svelte.js'
export type { CartLine, CartQuery, LineHrefFn } from './types.js'
export { formatPrice } from './format-price.js'
export * as logic from './cart-logic.js'
