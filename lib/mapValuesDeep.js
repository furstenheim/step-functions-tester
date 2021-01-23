const _ = require('lodash')

module.exports = mapValuesDeep

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
