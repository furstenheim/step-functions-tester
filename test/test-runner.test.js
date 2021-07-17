/* globals describe it before afterEach after */
const TestRunner = require('../index')
const { expect } = require('chai')
let testRunner
describe('Step function tester', function () {
  this.timeout('60s')
  before('Set up test runner', async function () {
    testRunner = new TestRunner()
    await testRunner.setUp({ defaultSubnet: '240.13.2.0' })
  })
  afterEach('Clean up', async function () {
    await testRunner.cleanUp()
  })
  after('Tear down', async function () {
    await testRunner.tearDown()
  })

  const tests = getTests()
  tests.forEach(function ({ name, only, callStubs, stepFunctionDefinition, stepFunctionInput, executions: expectedExecutions }) {
    ;(only ? it.only : it)(name, async function () {
      const { executions, stepFunctionExecution, stepFunctionHistory } = await testRunner.run(callStubs, stepFunctionDefinition, stepFunctionInput)
      expect(stepFunctionExecution.status).equals('SUCCEEDED')
      expect(executions).deep.equal(expectedExecutions)
    })
  })
  function getTests () {
    return [
      {
        name: 'Test with parameters',
        callStubs: {
          MyFirstLambda: [{ result: { count: 3 } }],
          FinalLambda: [{ result: {} }]
        },
        stepFunctionDefinition: {
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
                'SomeEndParameters.$': '$.firstResult.count'
              },
              End: true
            }
          }
        },
        stepFunctionInput: {},
        executions: [
          {
            payload: {},
            functionName: 'MyFirstLambda'
          },
          {
            payload: {
              SomeEndParameters: 3
            },
            functionName: 'FinalLambda'
          }
        ]
      },
      {
        name: 'Fetch input directly from state',
        stepFunctionDefinition: {
          StartAt: 'ConfigureCount',
          States: {
            ConfigureCount: {
              Type: 'Pass',
              Result: {
                count: 3,
                index: 0,
                step: 1
              },
              ResultPath: '$.iterator',
              Next: 'Iterator'
            },
            Iterator: {
              Type: 'Task',
              Resource: 'SomeLambda',
              ResultPath: '$.iterator',
              Next: 'IsCountReached'
            },
            IsCountReached: {
              Type: 'Choice',
              Choices: [
                {
                  Variable: '$.iterator.continue',
                  BooleanEquals: true,
                  Next: 'ExampleWork'
                }
              ],
              Default: 'Done'
            },
            ExampleWork: {
              Type: 'Task',
              Resource: 'IteratedLambda',
              ResultPath: '$.result',
              Next: 'Iterator'
            },
            Done: {
              Type: 'Pass',
              End: true
            }
          }
        },
        stepFunctionInput: {},
        callStubs: {
          SomeLambda: [{
            result: {
              step: 1,
              index: 1,
              count: 3,
              continue: true
            }
          },
          {
            result: {
              step: 2,
              index: 1,
              count: 3,
              continue: true
            }
          },
          {
            result: {
              step: 3,
              index: 1,
              count: 3,
              continue: false
            }
          }],
          IteratedLambda: [
            {
              result: {
                result: 'first'
              }
            },
            {
              result: {
                result: 'second'
              }
            },
            {
              result: {
                result: 'third'
              }
            }
          ]
        },
        executions: [{
          functionName: 'SomeLambda',
          payload: { iterator: { count: 3, index: 0, step: 1 } }
        },
        {
          functionName: 'IteratedLambda',
          payload: { iterator: { step: 1, index: 1, count: 3, continue: true } }
        },
        {
          functionName: 'SomeLambda',
          payload: {
            iterator: {
              step: 1,
              index: 1,
              count: 3,
              continue: true
            },
            result: { result: 'first' }
          }
        }, {
          functionName: 'IteratedLambda',
          payload: {
            iterator: {
              step: 2,
              index: 1,
              count: 3,
              continue: true
            },
            result: { result: 'first' }
          }
        }, {
          functionName: 'SomeLambda',
          payload:
              { iterator: { step: 2, index: 1, count: 3, continue: true }, result: { result: 'second' } }
        }]
      },
      {
        name: 'Accept step function input',
        callStubs: {
          MyFirstLambda: [{ result: { count: 3 } }],
          FinalLambda: [{}]
        },
        stepFunctionDefinition: {
          StartAt: 'FirstStep',
          States: {
            FirstStep: {
              Type: 'Task',
              Resource: 'MyFirstLambda',
              ResultPath: '$.firstResult',
              Next: 'Final',
              TimeoutSeconds: 10
            },
            Final: {
              Type: 'Task',
              Resource: 'FinalLambda',
              Parameters: {
                'SomeEndParameters.$': '$.firstResult.count'
              },
              End: true
            }
          }
        },
        stepFunctionInput: {
          some: 'true',
          another: 'false'
        },
        executions: [

          {
            payload:
              {
                some: 'true',
                another: 'false'
              },
            functionName: 'MyFirstLambda'
          },
          {
            payload:
              {
                SomeEndParameters: 3
              },
            functionName: 'FinalLambda'
          }
        ]
      },
      {
        name: 'Error handling',
        callStubs: {
          MyFirstLambda: [{
            exception: {
              type: 'MyError',
              message: 'Some exception'
            }
          }],
          FinalLambda1: [
            {
              result: {}
            }
          ]
        },
        stepFunctionDefinition: {
          StartAt: 'FirstStep',
          States: {
            FirstStep: {
              Type: 'Task',
              Resource: 'MyFirstLambda',
              ResultPath: '$.firstResult',
              Next: 'Final',
              TimeoutSeconds: 10,
              Catch: [
                {
                  ErrorEquals: ['MyError'],
                  ResultPath: '$.error-info',
                  Next: 'Final1'
                },
                {
                  ErrorEquals: ['States.All'],
                  Next: 'Final2'
                }
              ]
            },
            Final1: {
              Type: 'Task',
              Resource: 'FinalLambda1',
              Parameters: {
                'SomeEndParameters.$': '$.error-info'
              },
              End: true
            },
            Final2: {
              Type: 'Task',
              Resource: 'FinalLambda2',
              Parameters: {
                'SomeEndParameters.$': '$.error-info'
              },
              End: true
            },
            Final: {
              Type: 'Task',
              Resource: 'FinalLambda',
              Parameters: {
                'SomeEndParameters.$': '$.error-info'
              },
              End: true
            }
          }
        },
        stepFunctionInput: {
          some: 'true',
          another: 'false'
        },
        executions: [
          {
            payload:
              {
                some: 'true',
                another: 'false'
              },
            functionName: 'MyFirstLambda'
          },
          {
            payload:
              {
                SomeEndParameters: {
                  Cause: '{"errorType":"MyError","errorMessage":"Some exception","trace":["Error","    at Runtime.exports.lambdaHandler [as handler] (/var/task/app.js:42:29)","    at processTicksAndRejections (internal/process/task_queues.js:97:5)"]}',

                  Error: 'MyError'
                }
              },
            functionName: 'FinalLambda1'
          }
        ]
      },
      {
        name: 'Wait task',
        callStubs: {
        },
        stepFunctionDefinition: {
          StartAt: 'FirstStep',
          States: {
            FirstStep: {
              Type: 'Wait',
              Next: 'Final',
              Seconds: 1000
            },
            Final: {
              Type: 'Wait',
              Seconds: 0,
              End: true
            }
          }
        },
        stepFunctionInput: {
          some: 'true',
          another: 'false'
        },
        executions: null
      }
    ]
  }
})
