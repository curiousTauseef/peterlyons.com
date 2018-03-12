"use strict";
const boom = require("boom");

async function setup(server) {
  server.route({
    method: "GET",
    path: "/unit-test-error-500", // catch-all path
    handler: async () => {
      throw boom.internal("unit-test-500-error");
    }
  });

  server.ext("onPreResponse", async (request, h) => {
    if (!request.response.isBoom) {
      return h.continue;
    }
    const code = request.response.output.statusCode;
    switch (code) {
      case 500:
      case 404:
        return h.view(`errors/error${code}`).code(code);
      default:
        request.logger.warn(request.response);
        return h.continue;
    }
  });
}
module.exports = setup;
