const chokidar = require('chokidar')
    , fs = require('fs')
    , path = require('path')
    , log = require('../log')
    , config = require('../config')
    , serve = require('../serve')

const watching = new Map()

module.exports = function watch(file, changed, glob) {
  if (!glob && !fs.existsSync(file))
    return log.debug(file, 'Not found on disk - restart wright to watch when present')

  if (watching.has(file))
    watching.get(file).close()
  else
    log.debug('Watching', glob ? file : path.relative(config.serve, file))

  function normalizePath(file) {
    serve.wss.clients.forEach(socket => socket.send('refresh'))
    changed(path.isAbsolute(file) ? path.relative(process.cwd(), file) : file)
  }

  watching.set(file, chokidar.watch(file, {
    ignoreInitial: true
  }).on('add', normalizePath).on('change', normalizePath))
}

module.exports.watching = watching
