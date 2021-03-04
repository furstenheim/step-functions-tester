/* globals describe it before afterEach after */
const TestRunner = require('../index')
const { expect } = require('chai')
let testRunner
describe('Step function tester', function () {
  this.timeout('30s')
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
      console.log('running')
      const { executions } = await testRunner.run(callStubs, stepFunctionDefinition, stepFunctionInput)
      console.log(JSON.stringify(executions))
      expect(executions).deep.equal(expectedExecutions)
    })
  })
  function getTests () {
    return [
      {
        name: 'Test with parameters',
        callStubs: {
          MyFirstLambda: [{ count: 3 }]
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
            step: 1,
            index: 1,
            count: 3,
            continue: true
          },
          {
            step: 2,
            index: 1,
            count: 3,
            continue: true
          },
          {
            step: 3,
            index: 1,
            count: 3,
            continue: false
          }],
          IteratedLambda: [
            {
              result: 'first'
            },
            {
              result: 'second'
            },
            {
              result: 'third'
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
          MyFirstLambda: [{ count: 3 }]
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
      }
    ]
  }
})
