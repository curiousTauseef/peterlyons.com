"use strict";

module.exports = {
  name: "plusParty",
  version: "1.0.0",
  async register(server) {
    server.route({
      method: "GET",
      path: "/plus-party",
      handler: async (request, h) => h.view("plus-party/plus-party")
    });
  }
};
