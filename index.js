module.exports = {

}

const dockerCompose = require('docker-compose')
const dockerComposeFile = require('./lib/docker-compose-file')
const sam = require('./lib/sam')
const redis = require('redis')
const { promisify } = require('util')
const constants = require('./lib/constants')
const utils = require('./lib/utils')
const AWS = require('aws-sdk')
const AWS_REGION = 'eu-west-1'
const STEP_FUNCTION_NAME = 'testStepFunction'
const STEP_FUNCTION_ARN = `arn:aws:states:us-east-1:123456789012:stateMachine:${STEP_FUNCTION_NAME}`

class TestRunner {
  async setUp () {
    await sam.runSam()
    const { endpoint: stepFunctionEndpoint } = await setUpStepFunctions()

    this.stepFunctionClient = new AWS.StepFunctions({
      endpoint: stepFunctionEndpoint,
      region: AWS_REGION,
      credentials: new AWS.Credentials({
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      })
    })

    const redisClient = redis.createClient()
    this.redisClient = redisClient

    await new Promise(function (resolve) {
      redisClient.on('connect', resolve)
      // TODO probably on error reject
    })
    const promisifiedGet = promisify(this.redisClient.get).bind(this.redisClient)
    this.redisGet = async function (key) {
      const raw = await promisifiedGet(key)
      return JSON.parse(raw)
    }

    const promisifiedSet = promisify(this.redisClient.set).bind(this.redisClient)

    this.redisSet = async function (key, obj) {
      return promisifiedSet(key, JSON.stringify(obj))
    }
  }

  async run (callStubs, stepFunctionDefinition, stepFunctionInput, options = {
    executionTimeout: constants.DEFAULT_EXECUTION_TIMEOUT, executionInterval: constants.DEFAULT_EXECUTION_INTERVAL
  }) {
    const executionTimeout = options.executionTimeout
    const executionInterval = options.executionInterval
    const stepFunctionClient = this.stepFunctionClient
    for (const functionKey in callStubs) {
      // TODO use key
      const functionExecutions = callStubs[functionKey]
      await this.redisSet(`stubs:${functionKey}`, functionExecutions)
    }
    const fixedDefinition = utils.fixStepFunction(stepFunctionDefinition)

    console.log(fixedDefinition)

    await stepFunctionClient.createStateMachine({
      definition: JSON.stringify(fixedDefinition),
      name: STEP_FUNCTION_NAME,
      roleArn: 'arn:aws:iam::012345678901:role/DummyRole'
    }).promise()

    const execution = await stepFunctionClient.startExecution({
      stateMachineArn: STEP_FUNCTION_ARN,
      name: new Date().getTime().toString(),
      input: JSON.stringify(stepFunctionInput)
    }).promise()

    let stillRunning = true
    let executionError = null
    setTimeout(function () {
      stillRunning = false
      executionError = new Error('Step function not finished withing requested timeout')
    }, executionTimeout)

    let stepFunctionResult
    while (stillRunning) {
      stepFunctionResult = await stepFunctionClient.describeExecution({ executionArn: execution.executionArn }).promise()
      if (stepFunctionResult.status === 'RUNNING') {
        await utils.waitFor(executionInterval)
      } else {
        stillRunning = false
      }
    }

    if (executionError !== null) {
      throw executionError
    }

    const executionHistory = await stepFunctionClient.getExecutionHistory({ executionArn: execution.executionArn }).promise()

    const redisClient = this.redisClient
    const executionKeys = await new Promise(function (resolve, reject) {
      redisClient.keys('executions:*', function (err, keys) {
        if (err) {
          return reject(err)
        }
        resolve(keys)
      })
    })
    const redisGet = this.redisGet
    const executions = await Promise.all(executionKeys.map(async function (key) {
      const execution = redisGet(key)
      const functionName = key.substr('executions:'.length)
      return {
        functionName,
        execution
      }
    }))

    return {
      executions,
      stepFunctionExecution: stepFunctionResult,
      stepFunctionHistory: executionHistory
    }
  }

  async cleanUp () {
    const redisClient = this.redisClient
    const keys = await new Promise(function (resolve, reject) {
      redisClient.keys('*', function (err, keys) {
        if (err) {
          return reject(err)
        }
        resolve(keys)
      })
    })
    const del = promisify(redisClient.del).bind(redisClient)
    for (const key of keys) {
      await del(key)
    }

    const { executions } = await this.stepFunctionClient.listExecutions({ stateMachineArn: STEP_FUNCTION_ARN }).promise()
    for (const execution of executions) {
      await this.stepFunctionClient.stopExecution({ executionArn: execution.executionArn }).promise()
    }
    await this.stepFunctionClient.deleteStateMachine({ stateMachineArn: STEP_FUNCTION_ARN }).promise()
  }

  async tearDown () {
    // TODO close docker and sam
  }
}
main()
  .then(function (result) {
    console.log(result)
    process.exit(0)
  }, function (err) {
    console.error('-------')
    console.error(err)
    process.exit(1)
  })

async function main () {
  const testRunner = new TestRunner()
  await testRunner.setUp()
  const result = await testRunner.run(
    {}, {
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
    }, {})
  console.log(JSON.stringify(result, null, 2))
}

/**
 *
 * @returns {Promise<{endpoint: number}>}
 */
async function setUpStepFunctions () {
  const dockerComposeConfig = dockerComposeFile({})
  const dockerResult = await dockerCompose.upAll({
    configAsString: dockerComposeConfig,
    composeOptions: [['--verbose']]
  })

  console.log(dockerResult)
  // TODO accept endpoint as parameter
  return {
    endpoint: `http://localhost:${constants.DEFAULT_STEP_FUNCTIONS_PORT}`
  }
}
