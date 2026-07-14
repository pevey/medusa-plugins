## 0.5.0

- Reorganize non-remote functions into three folders: /internal, /helpers, and /server. This will enable import of requestContext() from sveltekit-medusa-sdk/server instead of straight from the barrel to avoid rolldown throwing guard errors incorrectly based on incomplete tree-shaking.

## 0.4.1

- Propagate errors on prerender (can be muted by configuring Sveltekit app using the library to warn instead of error on http errors during build)

## 0.4.0

- Allow region id to be passed into getProducts() and getProduct() ti allow prerendering for multi-region stores

## 0.2.0

- Fix workspace package ref in dist

## 0.1.0

- Initial release
