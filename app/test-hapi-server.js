"use strict";
const serverHapi = require("./server-hapi");
const tap = require("tap");

/**
 * This file works in 2 modes.
 * For unit tests, it starts a local server on a free port
 * and returns the URI for testing. The server gets stopped at the end of the
 * test suite.
 *
 * For integration testing a running instance
 * (could be local, stage, production), set the environment variable URI
 * to the base URI the tests should hit, and that will be used instead.
 */
let server;

async function getServer() {
  const uri = process.env.URI;
  if (/^https?:\/\//.test(uri)) {
    return uri;
  }
  if (!server) {
    server = await serverHapi.start({port: null, logLevel: "silent"});
  }
  return server.info.uri;
}

tap.tearDown(async () => {
  if (!server) {
    return;
  }
  await server.stop();
});

module.exports = getServer;
