var testUtils = require('app/testUtils')

describe('the Finding Inconsistencies MongoDB slide deck', function () {
  var $ = null
  before(function (done) {
    testUtils.loadPage('/white_glove', function (error, dom) {
      $ = dom
      done(error)
    })
  })

  it('should be a slide deck', function () {
    testUtils.assertDeck($)
  })

  it('should mention some relevant words', function () {
    testUtils.assertSubstrings(
      $, 'Schemaless', 'inconsistent', 'data', 'MongoDB')
  })
})