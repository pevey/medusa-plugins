import "../../../chunks/async.js";
import { c as attributes, a as ensure_array_like, e as escape_html } from "../../../chunks/root.js";
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
import "../../../chunks/cart.remote.js";
import { l as login } from "../../../chunks/auth.remote.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>Account</h1> <form${attributes({ ...login })}><label>Email <input${attributes({ ...login.fields.email.as("email") }, void 0, void 0, void 0, 4)}/></label> <!--[-->`);
    const each_array = ensure_array_like(login.fields.email.issues());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let issue = each_array[$$index];
      $$renderer2.push(`<span>${escape_html(issue.message)}</span>`);
    }
    $$renderer2.push(`<!--]--> <label>Password <input${attributes({ ...login.fields.password.as("password") }, void 0, void 0, void 0, 4)}/></label> <button>Log in</button></form> <button>Log out</button>`);
  });
}
export {
  _page as default
};
