var config = require("app/config");
var bundle = require("browserify")();

bundle.require("app/browser/career");
bundle.require("app/browser/post");
bundle.require("app/browser/home");
bundle.require("app/browser/plusParty");
bundle.require("app/browser/viewGallery");
bundle.add("app/browser/navigation");

function setup(app) {
  app.get("/browser.js", function (req, res) {
    res.header("Content-Type", "text/javascript");
    bundle.bundle({debug: config.browserifyDebug}).pipe(res);
  });
}

module.exports = setup;
