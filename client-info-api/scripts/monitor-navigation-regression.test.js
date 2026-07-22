"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  monitorFailureAction
} = require("../public/page-lifecycle");

test("ignores Safari Load failed after the monitor page is suspended for navigation", () => {
  assert.equal(
    monitorFailureAction({
      error: new TypeError("Load failed"),
      isPageSuspended: true
    }),
    "ignore"
  );
});

test("ignores a stale polling request after a newer monitor load starts", () => {
  assert.equal(
    monitorFailureAction({
      error: new TypeError("Load failed"),
      isStaleRequest: true
    }),
    "ignore"
  );
});

test("renders a genuine current network error while the page remains active", () => {
  assert.equal(
    monitorFailureAction({
      error: new TypeError("Load failed"),
      isPageSuspended: false,
      isStaleRequest: false
    }),
    "render-error"
  );
});
