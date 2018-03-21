"use strict";
const getTestUri = require("./get-test-uri");
const request = require("supertest");
const tap = require("tap");

let uri;

tap.beforeEach(async () => {
  uri = await getTestUri(require("../work/server"));
});

tap.test("/screen.css", test => {
  request(uri)
    .get("/screen.css")
    .expect(200)
    .expect("content-type", "text/css; charset=utf-8")
    .expect(/font-family/)
    .end(error => {
      test.error(error);
      test.end();
    });
});

tap.test("/deck.css", test => {
  request(uri)
    .get("/deck.css")
    .expect(200)
    .expect("content-type", "text/css; charset=utf-8")
    .expect(/background-color:/)
    .end(error => {
      test.error(error);
      test.end();
    });
});