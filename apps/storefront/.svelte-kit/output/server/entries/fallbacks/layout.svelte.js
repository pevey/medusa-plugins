import "../../chunks/async.js";
import "clsx";
function Layout($$renderer, $$props) {
  let { children } = $$props;
  children($$renderer);
  $$renderer.push(`<!---->`);
}
export {
  Layout as default
};
