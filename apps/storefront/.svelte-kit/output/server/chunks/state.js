import { Store as Store$1, Admin as Admin$1, Client, Auth } from "@medusajs/js-sdk";
function createStoreReviewResource(client2) {
  return {
    list: async (productId, query, headers) => {
      return client2.fetch(`/store/reviews/${productId}`, { query, headers });
    },
    create: async (productId, body, headers) => {
      return client2.fetch(`/store/reviews/${productId}`, { method: "POST", body, headers });
    }
  };
}
function createStoreContentResource(client2) {
  return {
    list: async (query, headers) => {
      return client2.fetch(`/content`, { query, headers });
    },
    retrieve: async (slug, query, headers) => {
      return client2.fetch(`/content/${slug}`, { query, headers });
    },
    listItems: async (slug, query, headers) => {
      return client2.fetch(`/content/${slug}/items`, { query, headers });
    },
    retrieveItem: async (slug, itemSlug, query, headers) => {
      return client2.fetch(`/content/${slug}/items/${itemSlug}`, { query, headers });
    }
  };
}
function createStoreFormResource(client2) {
  return {
    submit: async (handle, body, headers) => {
      return client2.fetch(`/forms/${handle}`, { method: "POST", body, headers });
    }
  };
}
function createStoreSearchResource(client2) {
  return {
    query: async (query, headers) => {
      return client2.fetch(`/store/search`, { query, headers });
    }
  };
}
class Store {
  constructor(client2) {
    this.product = {
      list: async (query, headers) => {
        return this.client.fetch(`/store/products`, { query, headers });
      },
      retrieve: async (id, query, headers) => {
        return this.client.fetch(`/store/products/${id}`, { query, headers });
      }
    };
    this.client = client2;
    this.core = new Store$1(client2);
    this.review = createStoreReviewResource(client2);
    this.content = createStoreContentResource(client2);
    this.form = createStoreFormResource(client2);
    this.search = createStoreSearchResource(client2);
  }
  // ── Delegated core resources ─────────────────────────────────────────────
  get region() {
    return this.core.region;
  }
  get collection() {
    return this.core.collection;
  }
  get category() {
    return this.core.category;
  }
  get cart() {
    return this.core.cart;
  }
  get order() {
    return this.core.order;
  }
  get customer() {
    return this.core.customer;
  }
  get fulfillment() {
    return this.core.fulfillment;
  }
  get payment() {
    return this.core.payment;
  }
  get locale() {
    return this.core.locale;
  }
}
function createAdminReviewResource(client2) {
  return {
    list: async (query, headers) => {
      return client2.fetch(`/admin/reviews`, { query, headers });
    },
    retrieve: async (id, query, headers) => {
      return client2.fetch(`/admin/reviews/${id}`, { query, headers });
    },
    update: async (id, body, headers) => {
      return client2.fetch(`/admin/reviews/${id}`, { method: "POST", body, headers });
    },
    delete: async (id, headers) => {
      return client2.fetch(`/admin/reviews/${id}`, { method: "DELETE", headers });
    },
    batchDelete: async (ids, headers) => {
      return client2.fetch(`/admin/reviews`, { method: "DELETE", body: { ids }, headers });
    },
    approve: async (ids, headers) => {
      return client2.fetch(`/admin/reviews/approve`, { method: "POST", body: { ids }, headers });
    },
    reject: async (ids, headers) => {
      return client2.fetch(`/admin/reviews/reject`, { method: "POST", body: { ids }, headers });
    }
  };
}
function createAdminSearchResource(client2) {
  return {
    reindex: async (headers) => {
      return client2.fetch(`/admin/search/reindex`, {
        method: "POST",
        headers
      });
    }
  };
}
class Admin {
  constructor(client2) {
    this.core = new Admin$1(client2);
    this.review = createAdminReviewResource(client2);
    this.search = createAdminSearchResource(client2);
  }
  // ── Delegated core resources ─────────────────────────────────────────────
  get apiKey() {
    return this.core.apiKey;
  }
  get campaign() {
    return this.core.campaign;
  }
  get claim() {
    return this.core.claim;
  }
  get currency() {
    return this.core.currency;
  }
  get customer() {
    return this.core.customer;
  }
  get customerGroup() {
    return this.core.customerGroup;
  }
  get draftOrder() {
    return this.core.draftOrder;
  }
  get exchange() {
    return this.core.exchange;
  }
  get fulfillment() {
    return this.core.fulfillment;
  }
  get fulfillmentProvider() {
    return this.core.fulfillmentProvider;
  }
  get fulfillmentSet() {
    return this.core.fulfillmentSet;
  }
  get inventoryItem() {
    return this.core.inventoryItem;
  }
  get invite() {
    return this.core.invite;
  }
  get locale() {
    return this.core.locale;
  }
  get notification() {
    return this.core.notification;
  }
  get order() {
    return this.core.order;
  }
  get orderEdit() {
    return this.core.orderEdit;
  }
  get payment() {
    return this.core.payment;
  }
  get paymentCollection() {
    return this.core.paymentCollection;
  }
  get plugin() {
    return this.core.plugin;
  }
  get priceList() {
    return this.core.priceList;
  }
  get pricePreference() {
    return this.core.pricePreference;
  }
  get product() {
    return this.core.product;
  }
  get productCategory() {
    return this.core.productCategory;
  }
  get productCollection() {
    return this.core.productCollection;
  }
  get productTag() {
    return this.core.productTag;
  }
  get productType() {
    return this.core.productType;
  }
  get productVariant() {
    return this.core.productVariant;
  }
  get promotion() {
    return this.core.promotion;
  }
  get refundReason() {
    return this.core.refundReason;
  }
  get region() {
    return this.core.region;
  }
  get reservation() {
    return this.core.reservation;
  }
  get return() {
    return this.core.return;
  }
  get returnReason() {
    return this.core.returnReason;
  }
  get salesChannel() {
    return this.core.salesChannel;
  }
  get shippingOption() {
    return this.core.shippingOption;
  }
  get shippingOptionType() {
    return this.core.shippingOptionType;
  }
  get shippingProfile() {
    return this.core.shippingProfile;
  }
  get stockLocation() {
    return this.core.stockLocation;
  }
  get store() {
    return this.core.store;
  }
  get taxProvider() {
    return this.core.taxProvider;
  }
  get taxRate() {
    return this.core.taxRate;
  }
  get taxRegion() {
    return this.core.taxRegion;
  }
  get translation() {
    return this.core.translation;
  }
  get upload() {
    return this.core.upload;
  }
  get user() {
    return this.core.user;
  }
  get views() {
    return this.core.views;
  }
  get workflowExecution() {
    return this.core.workflowExecution;
  }
}
const ENDPOINT = "/store/ping";
class Analytics {
  constructor(client2, config2) {
    this.queue = [];
    this.timer = null;
    this.flushing = false;
    this.client = client2;
    this.salesChannelId = config2?.salesChannelId;
    this.cartId = config2?.cartId;
    this.batchSize = config2?.batchSize ?? 10;
    this.flushIntervalMs = config2?.flushInterval ?? 2e3;
    this.isBrowser = typeof window !== "undefined";
    if (this.isBrowser) {
      this.startFlushTimer();
      this.bindUnloadHandler();
    }
  }
  /**
   * Track an analytics event.
   *
   * Browser: queues the event and flushes when batch is full or on interval.
   * Server: sends immediately.
   */
  track(event, options) {
    const payload = {
      event,
      actor_id: options?.cartId ?? this.cartId,
      session_id: options?.sessionId,
      properties: options?.properties,
      sales_channel_id: options?.salesChannelId ?? this.salesChannelId
    };
    if (this.isBrowser) {
      this.queue.push(payload);
      if (this.queue.length >= this.batchSize) {
        void this.flush();
      }
    } else {
      void this.send(payload);
    }
  }
  /**
   * Identify an actor. Sends a special `_identify` event that the backend
   * routes to `analyticsService.identify()`.
   */
  identify(actorId, properties) {
    const payload = {
      event: "_identify",
      actor_id: actorId,
      properties: {
        ...properties,
        anonymous_id: this.cartId
      },
      sales_channel_id: this.salesChannelId
    };
    if (this.isBrowser) {
      this.queue.push(payload);
      void this.flush();
    } else {
      void this.send(payload);
    }
  }
  /** Update the default actor ID (typically when cart is created/loaded). */
  setCartId(cartId) {
    this.cartId = cartId;
  }
  /** Update the default sales channel ID. */
  setSalesChannelId(salesChannelId) {
    this.salesChannelId = salesChannelId;
  }
  /** Flush all queued events immediately. */
  async flush() {
    if (this.flushing || this.queue.length === 0)
      return;
    this.flushing = true;
    const batch = this.queue.splice(0);
    try {
      await Promise.all(batch.map((event) => this.send(event)));
    } catch {
      this.queue.unshift(...batch);
    } finally {
      this.flushing = false;
    }
  }
  /** Stop the flush timer and flush remaining events. Call on cleanup. */
  async destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
  async send(payload) {
    await this.client.fetch(ENDPOINT, {
      method: "POST",
      body: payload
    });
  }
  startFlushTimer() {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }
  bindUnloadHandler() {
    if (typeof document === "undefined")
      return;
    const onUnload = () => {
      if (this.queue.length === 0)
        return;
      if (typeof navigator?.sendBeacon === "function") {
        const batch = this.queue.splice(0);
        for (const event of batch) {
          const blob = new Blob([JSON.stringify(event)], {
            type: "application/json"
          });
          navigator.sendBeacon(ENDPOINT, blob);
        }
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        onUnload();
      }
    });
  }
}
class Medusa {
  constructor(config2) {
    this.client = new Client(config2);
    this.store = new Store(this.client);
    this.admin = new Admin(this.client);
    this.auth = new Auth(this.client, config2);
    this.analytics = new Analytics(this.client, config2.analytics);
  }
  setLocale(locale) {
    this.client.setLocale(locale);
  }
  getLocale() {
    return this.client.locale;
  }
}
const DEFAULT_COOKIES = {
  session: "sid",
  region: "region",
  country: "country",
  cart: "cartid"
};
function resolveConfig(config2) {
  if (!config2.baseUrl)
    throw new Error("createMedusaHandle: baseUrl is required");
  if (!config2.publishableKey)
    throw new Error("createMedusaHandle: publishableKey is required");
  return {
    baseUrl: config2.baseUrl,
    publishableKey: config2.publishableKey,
    globalHeaders: config2.globalHeaders ?? {},
    defaultRegionId: config2.defaultRegionId,
    defaultCountryCode: config2.defaultCountryCode,
    backendSessionCookie: config2.backendSessionCookie ?? "connect.sid",
    cookies: {
      session: config2.cookies?.session ?? DEFAULT_COOKIES.session,
      region: config2.cookies?.region ?? DEFAULT_COOKIES.region,
      country: config2.cookies?.country ?? DEFAULT_COOKIES.country,
      cart: config2.cookies?.cart ?? DEFAULT_COOKIES.cart
    },
    transferCartOnLogin: config2.transferCartOnLogin ?? true,
    debug: config2.debug ?? false
  };
}
let client;
let config;
function setConfig(raw) {
  if (config)
    return;
  const resolved = resolveConfig(raw);
  config = resolved;
  client = new Medusa({
    baseUrl: resolved.baseUrl,
    publishableKey: resolved.publishableKey,
    globalHeaders: resolved.globalHeaders,
    debug: resolved.debug,
    auth: { type: "session", fetchCredentials: "omit" }
  });
}
function getClient() {
  if (!client)
    throw new Error("Medusa client is not configured. Add createMedusaHandle(config) to your hooks.server.ts.");
  return client;
}
function getConfig() {
  if (!config)
    throw new Error("Medusa config is not set. Add createMedusaHandle(config) to your hooks.server.ts.");
  return config;
}
function createAuthClient() {
  const c = getConfig();
  return new Medusa({
    baseUrl: c.baseUrl,
    publishableKey: c.publishableKey,
    globalHeaders: c.globalHeaders,
    debug: c.debug,
    auth: { type: "jwt" }
  });
}
export {
  getClient as a,
  createAuthClient as c,
  getConfig as g,
  setConfig as s
};
