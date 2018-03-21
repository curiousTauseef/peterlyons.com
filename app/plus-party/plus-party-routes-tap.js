"use strict";
const tap = require("tap");
const testUtils = require("../test-utils");

let uri;

tap.beforeEach(async () => {
  uri = await require("../get-test-uri")(require("../server"));
});

tap.test("the plus party page", async test => {
  const $ = await testUtils.loadDom(uri, "/plus-party");
  testUtils.assertSelectors(
    $,
    "iframe[allowfullscreen]",
    'img[alt="One plus two plus two plus one."]'
  );
  test.end();
});