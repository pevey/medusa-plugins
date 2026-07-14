import "../../chunks/async.js";
import { a as ensure_array_like, b as save, e as escape_html } from "../../chunks/root.js";
import "@medusajs/js-sdk";
import "cookie";
import "../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/utils.js";
import "@sveltejs/kit";
import "../../chunks/shared.js";
import "@sveltejs/kit/internal";
import "../../chunks/query.js";
import { g as getRegions } from "../../chunks/regions.remote.js";
import { g as getProducts } from "../../chunks/products.remote.js";
import "../../chunks/cart.remote.js";
import "../../chunks/auth.remote.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>Regions</h1> <ul><!--[-->`);
    $$renderer2.child_block(async ($$renderer3) => {
      const each_array = ensure_array_like((await save(getRegions()))());
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let region = each_array[$$index];
        $$renderer3.push(`<li>${escape_html(region.name)} (${escape_html(region.currency_code)})</li>`);
      }
    });
    $$renderer2.push(`<!--]--></ul> <h1>Products</h1> <ul>`);
    $$renderer2.child_block(async ($$renderer3) => {
      const each_array_1 = ensure_array_like((await save(getProducts()))());
      if (each_array_1.length !== 0) {
        $$renderer3.push("<!--[-->");
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let product = each_array_1[$$index_1];
          $$renderer3.push(`<li>${escape_html(product.title)}</li>`);
        }
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<li>No products</li>`);
      }
    });
    $$renderer2.push(`<!--]--></ul>`);
  });
}
export {
  _page as default
};
