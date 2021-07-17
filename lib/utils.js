module.exports = {
  getPlatform,
  mapValuesDeep,
  fixStepFunction,
  waitFor,
  waitForSpawn,
  getLambdaEndpoint
}
const constants = require('./constants')
const samConstants = require('./sam/mock-lambda/constants')
const process = require('process')
const _ = require('lodash')
const allowedPlatforms = [constants.LINUX_PLATFORM, constants.DARWIN_PLATFORM]
const debug = require('debug')('step-functions-tester')
function getPlatform () {
  const platform = process.platform
  if (!allowedPlatforms.includes(platform)) {
    throw new Error(`Unsupported platform "${platform}" in the library consider opening a PR to add support`)
  }
  return process.platform
}
/**
 * @callback recursiveMapValuesCallback
 * @param value
 * @param key
 */

/**
 *
 * @param {any} obj
 * @param cb
 */
function mapValuesDeep (obj, cb) {
  if (Array.isArray(obj)) {
    return obj.map(item => mapValuesDeep(item, cb))
  }
  // e.g numbers, booleans, strings
  if (!_.isPlainObject(obj)) {
    return obj
  }

  const result = _.mapValues(obj, cb)
  return _.mapValues(result, function (value) {
    return mapValuesDeep(value, cb)
  })
}

function fixStepFunction (definition) {
  return mapValuesDeep(definition, function (value, key, obj) {
    // Ensure as much as possible that we are modifying a step of the step function.
    // We need to balance between not missing a step and modifying parameters by mistake
    if (_.isObject(value) && value.Type === 'Task' && value.Resource) {
      const resource = value.Resource
      const parameters = value.Parameters
      const inputKey = parameters ? 'input' : 'input.$'
      // If parameters not provided, send the whoe step function step
      const inputValue = parameters || '$'
      return _.assign(value, { Parameters: { [samConstants.FUNCTION_KEY]: resource, [inputKey]: inputValue }, Resource: constants.LAMBDA_ARN })
    }

    if (_.isObject(value) && value.Type === 'Wait' && 'Seconds' in value) {
      return _.assign(value, { Seconds: 0 })
    }
    if (key === 'IntervalSeconds') {
      return 0
    }
    if (key === 'TimeoutSeconds') {
      return 10
    }
    return value
  })
}

function getLambdaEndpoint () {
  const platform = getPlatform()
  if (platform === constants.DARWIN_PLATFORM) {
    return 'http://host.docker.internal'
  }
  if (platform === constants.LINUX_PLATFORM) {
    return 'http://127.0.0.1'
  }

  throw new Error(`Unsupported platform "${platform}"`)
}

function waitFor (timeout) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })
}

function waitForSpawn (process) {
  return new Promise(function (resolve, reject) {
    let stdout = ''
    let stderr = ''
    process.on('close', function (code) {
      if (code === 0) {
        return resolve({ stdout, stderr })
      }
      debug('stdout on error', stdout)
      debug('stderr on error', stderr)
      return reject(new Error(`Wrong exit code for spawn ${code}`))
    })
    process.stdout.on('data', function (d) {
      stdout += d.toString()
    })
    process.stderr.on('data', function (d) {
      stderr += d.toString()
    })
    process.on('error', function (err) {
      debug(err)
      reject(err)
    })
  })
}
