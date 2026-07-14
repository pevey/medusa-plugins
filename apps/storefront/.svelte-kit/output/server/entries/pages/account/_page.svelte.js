import "../../../chunks/async.js";
import { a as ensure_array_like, b as save, e as escape_html, c as attributes } from "../../../chunks/root.js";
import "@medusajs/js-sdk";
import "../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/utils.js";
import "@sveltejs/kit";
import "../../../chunks/shared.js";
import "@sveltejs/kit/internal";
import "../../../chunks/query.js";
import "../../../chunks/regions.remote.js";
import "../../../chunks/products.remote.js";
import "../../../chunks/categories.remote.js";
import "../../../chunks/collections.remote.js";
import "../../../chunks/cart.remote.js";
import "../../../chunks/promotions.remote.js";
import "../../../chunks/payment.remote.js";
import "../../../chunks/braintree.remote.js";
import "../../../chunks/orders.remote.js";
import { l as login } from "../../../chunks/auth.remote.js";
import { g as getCustomer } from "../../../chunks/customer.remote.js";
import "../../../chunks/address.remote.js";
import "../../../chunks/search.remote.js";
import "../../../chunks/forms.remote.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>Account</h1> <!--[-->`);
    $$renderer2.child_block(async ($$renderer3) => {
      const each_array = ensure_array_like([(await save(getCustomer()))()]);
      for (let $$index_2 = 0, $$length = each_array.length; $$index_2 < $$length; $$index_2++) {
        let customer = each_array[$$index_2];
        if (customer) {
          $$renderer3.push("<!--[0-->");
          $$renderer3.push(`<p>Signed in as ${escape_html(customer.email)}</p>`);
        } else {
          $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<form${attributes({ ...login })}><label>Email <input${attributes({ ...login.fields.email.as("email") }, void 0, void 0, void 0, 4)}/></label> <!--[-->`);
          const each_array_1 = ensure_array_like(login.fields.email.issues());
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let issue = each_array_1[$$index];
            $$renderer3.push(`<span>${escape_html(issue.message)}</span>`);
          }
          $$renderer3.push(`<!--]--> <label>Password <input${attributes({ ...login.fields.password.as("password") }, void 0, void 0, void 0, 4)}/></label> <!--[-->`);
          const each_array_2 = ensure_array_like(login.fields.password.issues());
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let issue = each_array_2[$$index_1];
            $$renderer3.push(`<span>${escape_html(issue.message)}</span>`);
          }
          $$renderer3.push(`<!--]--> `);
          if (login.result && !login.result.ok) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<span>Login failed (${escape_html(login.result.code)})</span>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--> <button>Log in</button></form>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!--]--> <button>Log out</button>`);
  });
}
export {
  _page as default
};
