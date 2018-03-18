"use strict";
const tap = require("tap");
const request = require("supertest");

const pages = [
  "/app/photos",
  "/bands",
  "/favorites",
  "/oberlin",
  "/persblog",
  "/photos"
];

let uri;
tap.beforeEach(async () => {
  uri = await require("./get-test-uri")(require("./server"));
});

pages.forEach(page => {
  tap.test(`${page} should redirect to .org`, test => {
    request(uri)
      .get(page)
      .expect(301)
      .expect("location", `https://peterlyons.org${page}`)
      .end(error => {
        test.error(error);
        test.end();
      });
  });
});

tap.test("should maintain photo gallery path and query", test => {
  const page = "/app/photos?gallery=fall_2009&photo=020_paint_and_blinds";
  request(uri)
    .get(page)
    .expect(301)
    .expect("location", `https://peterlyons.org${page}`)
    .end(error => {
      test.error(error);
      test.end();
    });
});
