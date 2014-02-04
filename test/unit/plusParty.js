var assert = require("assert");
var plusParty = require("app/browser/plusParty");

describe("plusParty", function () {
  describe("sum", function () {
    it("should do a basic addition", function() {
      assert(plusParty.sum(21, 21) === 42, "sum should add numbers");
    });
  });

  describe("wrap", function () {
    it("should wrap a number into an object with a value property", function() {
      var wrapped = plusParty.wrap(42);
      assert(typeof wrapped === "object");
      assert(wrapped.value === 42);
    });
  });

  describe("parseNumbers", function () {
    it("should handle simple positive integers and whitespace", function() {
      assert.deepEqual(plusParty.parseNumbers("42"), [42]);
      assert.deepEqual(plusParty.parseNumbers("42 15 666"), [42, 15, 666]);
      assert.deepEqual(plusParty.parseNumbers("0 0 79"), [0, 0, 79]);
      assert.deepEqual(plusParty.parseNumbers("   \t\n26\t\r32\n"), [26, 32]);
    });

    it("should handle simple decimal points and negatives", function() {
      assert.deepEqual(plusParty.parseNumbers("-42"), [-42]);
      assert.deepEqual(plusParty.parseNumbers("42.15 666"), [42.15, 666]);
      assert.deepEqual(plusParty.parseNumbers("0 -0 -79"), [0, 0, -79]);
      assert.deepEqual(plusParty.parseNumbers(
        "   \t\n-26.987\t\r32.005\n"), [-26.987, 32.005]);
    });

    it("should handle currency symbols", function() {
      assert.deepEqual(plusParty.parseNumbers("$42"), [42]);
      assert.deepEqual(
        plusParty.parseNumbers("$42.15 $666 £92"), [42.15, 666, 92]);
      assert.deepEqual(plusParty.parseNumbers("€0"), [0]);
    });

    it("should ignore mm/dd/yyyy dates", function() {
      assert.deepEqual(plusParty.parseNumbers("12/31/1984"), []);
      assert.deepEqual(
        plusParty.parseNumbers("6 09/20/78 17"), [6, 17]);
    });
  });

  describe("recompute", function () {
    it("should convert rawText into numbers and total", function() {
      var instance = {
        scope: {
          rawText: "I need 42 chickens and 7 mice"
        }
      };
      plusParty.recompute.call(instance);
      assert.deepEqual(instance.scope.numbers, [42, 7]);
      assert.equal(instance.scope.wrappedNumbers[0].value, 42);
      assert.equal(instance.scope.wrappedNumbers[1].value, 7);
      assert.equal(instance.scope.total, 49);
    });
  });
});