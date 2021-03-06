'use strict'

const ui = require('./ui')
    , log = require('./log')
    , jail = require('./jail')
    , serve = require('./serve')
    , utils = require('./utils')
    , watch = require('./watch')
    , config = require('./config')
    , chrome = require('./chrome')
    , execute = require('./execute')

let promise

utils.requireChrome()

module.exports = function wright(options) {
  log.debugging = Boolean(options.debug)
  log('Starting wright...')

  if (promise)
    return promise

  promise = config.set(options)
  .then(execute)
  .then(serve.start)
  .then(chrome.start)
  .then(watch)
  .then(ui)
  .catch(err => {
    log.error(err)
    process.exit() // eslint-disable-line
  })

  return promise
}

module.exports.jail = jail
module.exports.chrome = chrome
module.exports.watch = require('./watch/watch')
