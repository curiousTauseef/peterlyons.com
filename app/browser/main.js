// @TODO navigation, career, create post, deck, plusParty
function dispatch (path) {
  path = path || window.location.pathname
  switch (path) {
    case '/app/photos-react':
    case '/photos-react':
      require('../photosReact/browser-main')
      break
    case '':
      break
    default:
  }
}

dispatch()
