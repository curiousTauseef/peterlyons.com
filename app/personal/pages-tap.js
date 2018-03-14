"use strict";
const request = require("supertest");
const tap = require("tap");

const pathExps = [
  ["/", /personal site of Peter Lyons/],
  ["/bands", /Gora Gora Orkestar/],
  ["/favorites", /Bobby McFerrin/],
  ["/oberlin", /conservatory/i]
];

let server;

tap.beforeEach(async () => {
  server = await require("./test-server")();
});

tap.test("Personal pages smoke tests", test => {
  require("../test-responses")(
    "Pages (pug templates)",
    server.info.uri,
    pathExps
  );
  test.end();
});

tap.test("css", test => {
  request(server.info.uri)
    .get("/screen.css")
    .expect(200)
    .expect("content-type", "text/css; charset=utf-8")
    .expect(/background-color:/)
    .end(error => {
      test.error(error);
      test.end();
    });
});

tap.test("personal site does not include pro nav", test => {
  request(server.info.uri)
    .get("/")
    .expect(200)
    .end((error, res) => {
      test.error(error);
      const proNav = ["Code Conventions", "Career", "Projects"];
      proNav.forEach(text => {
        tap.notOk(res.text.includes(text));
      });
      test.end();
    });
});
