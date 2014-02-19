var testUtils = require("../testUtils");

describe("the jsDebug", function() {
  var $ = null;

  before(function(done) {
    testUtils.loadPage("/jsDebug", function(error, dom) {
      $ = dom;
      done(error);
    });
  });

  it("should have the screencast youtube video", function() {
    testUtils.assertSelectors($, "iframe", "button.stepSync");
  });

  it("should redirect to the newest gallery", function(done) {
    testUtils.get("/app/photos")
      .expect(302)
      .expect("location", "/app/photos?gallery=burning_man_2011")
      .end(done);
  });

  it("should have randomDelay route", function(done) {
    this.slow(0).timeout(0);
    testUtils.get("/jsDebug/randomDelay?requestNumber=42")
      .expect(200)
      .end(function (error, res) {
        expect(error).toBeFalsey();
        expect(res.text).toContain("42");
        expect(res.text).toContain(" ms");
        done();
      });
  });
});
