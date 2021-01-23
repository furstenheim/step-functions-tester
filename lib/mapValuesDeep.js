module.exports = {
  mapValuesDeep,
  fixStepFunction
}

const _ = require('lodash')
const samConstants = require('./sam/mock-lambda/constants')
const constants = require('./constants')
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
      return _.merge(value, { Parameters: { [samConstants.FUNCTION_KEY]: resource }, Resource: constants.LAMBDA_NAME })
    }
    if (key === 'IntervalSeconds') {
      return 0
    }
    if (key === 'TimeoutSeconds') {
      return 5
    }
    return value
  })
}
