/* globals describe it **/
const mapValuesDeep = require('../../lib/mapValuesDeep')
const _ = require('lodash')
const { expect } = require('chai')
describe('Map Values Deep', function () {
  const tests = [
    {
      name: 'map on object',
      obj: {
        a: 1
      },
      callback: function (value, key) {
        return 2 * value
      },
      expected: {
        a: 2
      }
    },
    {
      name: 'deep map on object',
      obj: {
        a: {
          b: 'a',
          c: '3'
        },
        d: 4
      },
      callback: function (value, key) {
        if (_.isNumber(value) || _.isString(value)) {
          return value + value
        }
        return value
      },
      expected: {
        a: {
          b: 'aa',
          c: '33'
        },
        d: 8
      }
    },
    {
      name: 'Use current object',
      obj: {
        a: {
          b: 'a',
          c: '3'
        },
        d: 4
      },
      callback: function (value, key, obj) {
        if (obj.c && key === 'b') {
          return value + obj.c
        }
        return value
      },
      expected: {
        a: {
          b: 'a3',
          c: '3'
        },
        d: 4
      }
    }
  ]

  tests.forEach(t => it(t.name, function () {
    expect(mapValuesDeep(t.obj, t.callback)).deep.equal(t.expected)
  }))
})
