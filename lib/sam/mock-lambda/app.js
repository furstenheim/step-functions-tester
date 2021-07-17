const { promisify } = require('util')
const redis = require('redis')
const constants = require('./constants')
const FUNCTION_KEY = constants.FUNCTION_KEY
let redisClient
let redisGet
let redisSet
let functionName

exports.lambdaHandler = async function (event, context, callback) {
  redisClient = redis.createClient({
    host: 'redis'
  })
  await new Promise(function (resolve) {
    redisClient.on('connect', resolve)
  })
  const promisifiedSet = promisify(redisClient.set).bind(redisClient)

  redisSet = async function (key, obj) {
    return promisifiedSet(key, JSON.stringify(obj))
  }

  const promisifiedGet = promisify(redisClient.get).bind(redisClient)
  redisGet = async function (key) {
    const raw = await promisifiedGet(key)
    return JSON.parse(raw)
  }

  functionName = event[FUNCTION_KEY]

  if (!functionName) {
    throw new Error(`Function name missing in call "${JSON.stringify(event)}"`)
  }

  await setExecution(event.input)
  const stub = await getStub()
  if (stub.exception) {
    function CustomError(message) {
      this.name = stub.exception.type
      this.message = stub.exception.message
    }
    CustomError.prototype = new Error()

    const error = new CustomError()
    return callback(error)
  }
  return stub.result
}

async function setExecution (obj) {
  const executionsKey = getExecutionsKey()
  const rawExecutions = await redisGet(executionsKey)
  const executions = rawExecutions || []
  executions.push({ functionName, payload: obj })
  await redisSet(executionsKey, executions)
}


/**
 *
 * @returns {Promise<CallStub>}
 */
async function getStub () {
  const stubsKey = getStubsKey()
  const executionsKey = getExecutionsKey()
  const [stubs, allExecutions] = await Promise.all([redisGet(stubsKey), redisGet(executionsKey)])
  const executions = allExecutions ? allExecutions.filter(execution => execution.functionName === functionName) : null
  return stubs ? stubs[executions ? executions.length - 1 : 0] : null
}

function getStubsKey () {
  return `stubs:${functionName}`
}

function getExecutionsKey () {
  return 'executions'
}
