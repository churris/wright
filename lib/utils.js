'use strict'

const fs = require('fs')
    , url = require('url')
    , net = require('net')
    , path = require('path')
    , http = require('http')
    , crypto = require('crypto')
    , cp = require('child_process')

const utils = module.exports

utils.requireChrome = function() {
  if (!fs.existsSync(utils.chromePath)) {
    console.error('\nWright requires Chrome and can\'t seem to find it at:\n' + utils.chromePath + '\n') // eslint-disable-line
    console.error('Install Chrome or set the environment variable CHROME_PATH\nif chrome is installed elsewhere.\n') // eslint-disable-line
    process.exit() // eslint-disable-line
  }
}

utils.request = function(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let data = ''

      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve(data)
          }
        } else {
          reject(new Error(data))
        }
      })
      res.on('error', reject)
    }).on('error', reject)

    setTimeout(() => {
      req.abort()
      reject()
    }, 2000)
  })
}

utils.getId = function(name) {
  return path.basename(path.join(process.cwd(), '..')) +
         '-' + name + '_' +
         crypto.createHash('sha1').update(process.cwd()).digest('hex').slice(0, 7)
}

utils.retryConnect = function(url, timeout) {
  return new Promise((resolve, reject) => {
    let timedOut = false

    setTimeout(() => {
      timedOut = true
      reject('Could not connect to ' + url)
    }, timeout)

    function connect() {
      http.get(url, resolve).on('error', () => !timedOut && connect())
    }

    connect()
  })
}

utils.promisify = function(fn) {
  return new Promise((resolve, reject) => {
    try {
      const result = fn((err, result) => err ? reject(err) : resolve(result))

      if (result && result.then)
        result.then(resolve).catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

utils.chromePath = (function() {
  if (process.env.CHROME_PATH) // eslint-disable-line
    return process.env.CHROME_PATH // eslint-disable-line

  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  } else if (process.platform === 'linux') {
    return cp.execSync('which google-chrome', { encoding: 'utf8' }).trim()
  } else if (process.platform === 'win32') {
    return [
      process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      process.env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'  // eslint-disable-line
    ].find(fs.existsSync)
  }
}())

utils.wrightDataDirectory = (function() {
  return process.platform === 'darwin'
    ? path.join(process.env.HOME, '/Library/Application Support', 'wright') // eslint-disable-line
    : process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'wright') // eslint-disable-line
      : path.join(process.env.HOME || '', '.wright') // eslint-disable-line
}())

utils.getAppDataDirectory = function(name) {
  const wrightPath = utils.wrightDataDirectory
      , projectPath = path.join(wrightPath, name)

  try {
    fs.mkdirSync(wrightPath)
  } catch (_) {
    // don't care for errors (they exist)
  }

  try {
    fs.mkdirSync(projectPath)
  } catch (_) {
    // don't care for errors (they exist)
  }

  return projectPath
}

utils.cleanUrl = function(u) {
  const obj = url.parse(u)

  if (obj.port == 80) // eslint-disable-line
    obj.host = obj.hostname

  return url.format(obj)
}

utils.slash = function(string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(string)
      , hasNonAscii = /[^\x00-\x80]+/.test(string)

  if (isExtendedLengthPath || hasNonAscii)
    return string

  return string.replace(/\\/g, '/')
}

utils.nextFreePort = function(port) {
  return new Promise((resolve, reject) => recursivePortTest(port, resolve))
}

function recursivePortTest(port, resolve) {
  utils.testPort(port)
  .then(p => resolve(p))
  .catch(() => recursivePortTest(port + 3, resolve))
}

utils.testPort = function(port, resolve) {
  const tester = net.createServer()

  return new Promise((resolve, reject) => {
    tester
    .once('error', reject)
    .once('listening', () => {
      tester.once('close', () => {
        let connected = false

        const client = net.connect(port, () => {
          connected = true
          client.destroy()
        })
        .once('error', (err) => connected = err.code !== 'ECONNREFUSED')
        .once('close', () => connected ? reject() : resolve(port))
      }).close()
    })
    .listen(port)
  })
}

utils.uninstall = function(path) {
  fs.rmdirSync(utils.wrightDataDirectory)
}
