"use strict";
const request = require("supertest");
const tap = require("tap");

let server;

tap.beforeEach(async () => {
  server = await require("../test-hapi-server")();
});

tap.test("/screen.css", test => {
  request(server.info.uri)
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
  request(server.info.uri)
    .get("/deck.css")
    .expect(200)
    .expect("content-type", "text/css; charset=utf-8")
    .expect(/background-color:/)
    .end(error => {
      test.error(error);
      test.end();
    });
});