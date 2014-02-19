var config = require("app/config");

function setup(app) {
  if (!config.errorPages) {
    return;
  }
  app.get(/error(\d+)/, function(req, res) {
    var code = parseInt(req.params[0], 10);
    if (code > 499) {
        res.render("errors/error500");
    } else {
        res.render("errors/error404");
    }
  });
}

module.exports = setup;
