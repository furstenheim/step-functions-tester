module.exports = {
  getPlatform,
  mapValuesDeep,
  fixStepFunction,
  waitFor,
  getLambdaEndpoint
}
const constants = require('./constants')
const samConstants = require('./sam/mock-lambda/constants')
const process = require('process')
const _ = require('lodash')
const allowedPlatforms = [constants.LINUX_PLATFORM, constants.DARWIN_PLATFORM]

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
      return _.assign(value, { Parameters: { [samConstants.FUNCTION_KEY]: resource, [inputKey]: parameters || '$' }, Resource: constants.LAMBDA_ARN })
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
    return 'http://localhost'
  }

  throw new Error(`Unsupported platform "${platform}"`)
}

function waitFor (timeout) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout)
  })
}
