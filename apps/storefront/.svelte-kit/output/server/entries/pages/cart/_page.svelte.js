import "../../../chunks/async.js";
import { d as attr, a as ensure_array_like, b as save, e as escape_html } from "../../../chunks/root.js";
import "@medusajs/js-sdk";
import "cookie";
import "../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/utils.js";
import "@sveltejs/kit";
import "../../../chunks/shared.js";
import "@sveltejs/kit/internal";
import "../../../chunks/query.js";
import "../../../chunks/regions.remote.js";
import "../../../chunks/products.remote.js";
import { g as getCart } from "../../../chunks/cart.remote.js";
import "../../../chunks/auth.remote.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let variantId = "";
    $$renderer2.push(`<h1>Cart</h1> <form><input placeholder="variant id"${attr("value", variantId)}/> <button>Add to cart</button></form> <ul>`);
    $$renderer2.child_block(async ($$renderer3) => {
      const each_array = ensure_array_like((await save(getCart()))()?.items ?? []);
      if (each_array.length !== 0) {
        $$renderer3.push("<!--[-->");
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          $$renderer3.push(`<li>${escape_html(item.title)} × ${escape_html(item.quantity)}</li>`);
        }
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<li>Cart is empty</li>`);
      }
    });
    $$renderer2.push(`<!--]--></ul>`);
  });
}
export {
  _page as default
};
