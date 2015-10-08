var _ = require('lodash')
var async = require('async')
var bcrypt = require('bcryptjs')
var blogIndicesBySlug = {}
var config = require('config3')
var bodyParser = require('body-parser')
var events = require('events')
var execFile = require('child_process').execFile
var express = require('express')
var fs = require('fs')
var glob = require('glob')
var httpErrors = require('httperrors')
var log = require('bole')(__filename)
var markdown = require('markdown-js').makeHtml
var middleware = require('./middleware')
var moment = require('moment')
var path = require('path')
var Post = require('./Post')

var postLinks = {}

function BlogIndex(URI, title) {
  this.URI = URI
  this.title = title || ''
  this.blogTitle = this.title
}

function loadBlogMW(req, res, next) {
  res.blog = blogIndicesBySlug[req.params.blogSlug]
  // Avoid esformatter bug when line ends in []. Do not remove this comment.
  next()
}

function presentPost(post) {
  var presented = _.clone(post)
  presented.title = presented.title.trim()
  presented.date = moment(post.publish_date).format('MMM DD, YYYY')
  return presented
}

function loadPostMW(req, res, next) {
  var blog = req.params[0]
  // Avoid esformatter bug when line ends in []. Do not remove this comment.
  var post = new Post()
  post.base = config.blog.postBasePath
  post.load(path.join(post.base, req.path + '.json'), blog, function(error) {
    if (error && error.code === 'ENOENT') {
      next(new httpErrors.NotFound(req.path))
      return
    }
    if (error) {
      next(error)
      return
    }
    res.post = post
    post.presented = presentPost(post)
    var links = postLinks[post.uri()]
    post.previous = links.previous
    post.next = links.next
    res.viewPath = post.viewPath()
    next()
  })
}

function html(req, res, next) {
  if (!/\.html$/.test(res.viewPath)) {
    next()
    return
  }
  fs.readFile(res.viewPath, 'utf8', function(error, htmlText) {
    if (error && error.code === 'ENOENT') {
      next(new httpErrors.NotFound(req.path))
      return
    }
    res.html = htmlText
    next(error)
  })
}

function markdownToHTML(req, res, next) {
  if (!/\.md$/.test(res.viewPath)) {
    next()
    return
  }
  fs.readFile(res.viewPath, 'utf8', function(error, markdownText) {
    if (error && error.code === 'ENOENT') {
      next(new httpErrors.NotFound(req.path))
      return
    }
    if (error) {
      next(error)
      return
    }
    res.html = markdown(markdownText)
    next(error)
  })
}

function renderPost(req, res, next) {
  var locals = {
    post: res.post,
    postContent: res.html
  }
  res.app.render('blogs/viewPost', locals, function(error, html2) {
    if (error) {
      next(error)
      return
    }
    res.html = html2
    next()
  })
}

function previewMarkdown(req, res, next) {
  res.html = markdown(req.text)
  next()
}

var convertMiddleware = [
  middleware.text,
  previewMarkdown,
  middleware.domify,
  middleware.flickr,
  middleware.youtube,
  middleware.undomify,
  middleware.send
]

var viewPostMiddleware = [
  loadPostMW,
  html,
  markdownToHTML,
  renderPost,
  middleware.domify,
  middleware.flickr,
  middleware.youtube,
  middleware.undomify,
  middleware.send
]

function loadPost(URI, file, callback) {
  var post = new Post()
  post.base = config.blog.postBasePath
  post.load(file, URI, function(error) {
    if (error) {
      callback(error)
      return
    }
    post.presented = presentPost(post)
    callback(null, post)
  })
}

function loadBlog(URI, callback) {
  var basePath = path.join(config.blog.postBasePath, URI)
  basePath = path.normalize(basePath)
  glob(basePath + '/**/*.json', function(error, files) {
    if (error) {
      callback(error)
      return
    }
    var boundLoad = loadPost.bind(null, URI)
    async.map(files, boundLoad, function(error2, posts) {
      if (error2) {
        callback(error2)
        return
      }
      posts = _.sortBy(posts, function(post) {
        return post.publish_date
      }).reverse()
      posts.forEach(function(post, index) {
        /* eslint no-ternary:0 */
        postLinks[post.uri()] = {
          next: index > 0 ? posts[index - 1] : null,
          previous: index < posts.length ? posts[index + 1] : null
        }
      })
      callback(error, posts)
    })
  })
}

function verifyPassword(password, hash, callback) {
  bcrypt.compare(password, hash, function(error, correctPassword) {
    if (error) {
      callback(error)
      return
    }
    if (!correctPassword) {
      callback('incorrect password')
      return
    }
    callback()
  })
}

function newBlogPrepare(callback) {
  var script = config.blog.newBlogPreparePath
  execFile(script, [], function(error, stdout, stderr) {
    if (error) {
      log.error({
        err: error,
        stdout: stdout,
        stderr: stderr
      }, 'Error preparing git repo for new blog')
      callback(error)
      return
    }
    log.info({
      stdout: stdout.toString(),
      stderr: stderr.toString()
    }, 'new blog prepare succeeded')
    callback()
  })
}

function savePost(req, callback) {
  var post = new Post(req.params.blogSlug, req.body.title, new Date(), 'md')
  post.content = (req.body.content || '').trim() + '\n'
  post.base = config.blog.postBasePath
  post.save(callback)
}

function newBlogFinalize(token, post, callback) {
  var script = config.blog.newBlogFinalizePath
  execFile(script, [], function(error, stdout, stderr) {
    if (error) {
      log.error({
        err: error,
        stdout: stdout,
        stderr: stderr
      }, 'Error finalizing git commit/push for new blog')
      callback(error)
      return
    }
    log.info({
      stdout: stdout.toString(),
      stderr: stderr.toString()
    }, 'new blog finalized successfully')
    callback(null, post)
  })
}

function createPost(req, res) {
  var password = req.body.password
  var work = [
    async.apply(fs.readFile, config.blog.hashPath, 'utf8'),
    async.apply(verifyPassword, password),
    async.apply(newBlogPrepare),
    async.apply(savePost, req),
    async.apply(newBlogFinalize, password)
  ]
  async.waterfall(work, function(error, post) {
    if (error) {
      log.error(error, 'Could not save blog post' + req.body.title)
      return res.status(500).send(error)
    }
    var response = post.metadata()
    response.uri = post.uri()
    res.send(response)
    loadBlog(post.blog, function(error2, posts) {
      var blog
      blog = blogIndicesBySlug[post.blog]
      blog.posts = posts
      delete blog.cachedFeedXML
    })
  })
}

function feedRenderPost(req, post, callback) {
  var fakeRes = {
    post: post,
    viewPath: post.viewPath()
  }
  async.applyEachSeries([
    html,
    markdownToHTML,
    middleware.domify,
    middleware.flickr,
    middleware.youtube,
    middleware.undomify,
    function storeContent(req2, fakeRes2, next) {
      fakeRes2.post.content = fakeRes2.html
      next()
    }
  ], req, fakeRes, function(error) {
    if (error) {
      callback(error)
      return
    }
    callback(null, post)
  })
}

function feed(req, res, next) {
  res.type('xml')
  if (res.blog.cachedFeedXML) {
    res.send(res.blog.cachedFeedXML)
    return
  }
  var recentPosts = res.blog.posts.slice(0, 10)
  var locals = {
    title: res.blog.title,
    URI: res.blog.URI,
    pretty: true
  }
  var boundRender = feedRenderPost.bind(null, req)
  async.map(recentPosts, boundRender, function(error, renderedPosts) {
    if (error) {
      next(error)
      return
    }
    locals.posts = renderedPosts
    res.app.render('blogs/feed', locals, function(error2, feedXML) {
      if (error2) {
        next(error2)
        return
      }
      res.blog.cachedFeedXML = feedXML
      res.send(feedXML)
    })
  })
}

function flushCache(req, res, next) {
  delete res.blog.cachedFeedXML
  loadBlog(res.blog.URI, function(error, posts) {
    if (error) {
      next(error)
      return
    }
    res.blog.posts = posts
    res.redirect('/' + res.blog.URI)
  })
}

function setup(app) {
  var problog = new BlogIndex('problog', "Pete's Points")
  var persblog = new BlogIndex('persblog', 'The Stretch of Vitality')
  blogIndicesBySlug[problog.URI] = problog
  blogIndicesBySlug[persblog.URI] = persblog
  function _load(blog, next) {
    loadBlog(blog.URI, function(error, posts) {
      blog.posts = posts
      next(error)
    })
  }
  function doneLoading(error) {
    if (error) {
      throw error
    }
    setup.loaded = true
    setup.events.emit('ready')
  }
  async.forEach([problog, persblog], _load, doneLoading)
  app.use('/blogs', express.static(path.join(__dirname, '/browser')))
  var blogRoute = '/:blogSlug(persblog|problog)'
  app.get(blogRoute, loadBlogMW, function(req, res) {
    res.render('blogs/' + req.params.blogSlug, res.blog)
  })
  app.get(blogRoute + '/post', function(req, res) {
    res.render('blogs/post')
  })
  app.post(blogRoute + '/post', bodyParser.json(), createPost)
  app.get(blogRoute + '/feed', loadBlogMW, feed)
  app.get(blogRoute + '/flushCache}', loadBlogMW, flushCache)
  app.get(
    new RegExp('/(persblog|problog)/\\d{4}/\\d{2}/\\w+'),
    viewPostMiddleware
  )
  app.post('/convert', convertMiddleware)
}

module.exports = setup
_.extend(module.exports, {
  events: new events.EventEmitter(),
  presentPost: presentPost,
  BlogIndex: BlogIndex,
  verifyPassword: verifyPassword
})
