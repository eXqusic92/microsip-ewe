"use strict";

(function exposePageLifecycle(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  root.DumaPageLifecycle = api;
})(typeof globalThis === "object" ? globalThis : this, function createPageLifecycle() {
  function monitorFailureAction(options = {}) {
    const error = options.error || null;
    if (
      options.isPageSuspended === true ||
      options.isStaleRequest === true ||
      (error && error.name === "AbortError")
    ) {
      return "ignore";
    }
    return "render-error";
  }

  return {
    monitorFailureAction
  };
});
