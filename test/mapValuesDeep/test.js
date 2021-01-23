/* globals describe it */
const mapValuesDeep = require('../../lib/mapValuesDeep').mapValuesDeep
const fixStepFunction = require('../../lib/mapValuesDeep').fixStepFunction
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

describe('Fix step function', function () {
  const tests = [
    {
      name: 'Simple step function',
      obj: {
        StartAt: 'FirstStep',
        States: {
          FirstStep: {
            Type: 'Task',
            Resource: 'MyFirstLambda',
            ResultPath: '$.firstResult',
            Next: 'SecondStep',
            TimeoutSeconds: 10
          },
          SecondStep: {
            Type: 'Choice',
            Choices: [
              {
                Variable: '$.firstResult.count',
                NumericGreaterThan: 4,
                Next: 'Final'
              },
              {
                Variable: '$.firstResult.count',
                NumericLessThanEquals: 4,
                Next: 'Final'
              }
            ]
          },
          Final: {
            Type: 'Task',
            Resource: 'FinalLambda',
            Parameters: {
              SomeEndParameters: '$.firstResult.count'
            },
            End: true
          }
        }
      },
      expected: {
        StartAt: 'FirstStep',
        States: {
          FirstStep: {
            Next: 'SecondStep',
            Parameters: {
              __function_key: 'MyFirstLambda'
            },
            Resource: 'MockFunction',
            ResultPath: '$.firstResult',
            TimeoutSeconds: 5,
            Type: 'Task'
          },
          SecondStep: {
            Choices: [
              {
                Next: 'Final',
                NumericGreaterThan: 4,
                Variable: '$.firstResult.count'
              },
              {
                Next: 'Final',
                NumericLessThanEquals: 4,
                Variable: '$.firstResult.count'
              }
            ],
            Type: 'Choice'
          },
          Final: {
            End: true,
            Parameters: {
              SomeEndParameters: '$.firstResult.count',
              __function_key: 'FinalLambda'
            },
            Resource: 'MockFunction',
            Type: 'Task'
          }
        }
      }
    }
  ]

  tests.forEach(t => it(t.name, function () {
    expect(fixStepFunction(t.obj)).deep.equal(t.expected)
  }))
})
