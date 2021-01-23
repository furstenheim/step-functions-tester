const { promisify } = require('util')
const redis = require('redis')
const constants = require('./constants')
const FUNCTION_KEY = constants.FUNCTION_KEY
let redisClient
let redisGet
let redisSet
let functionName

exports.lambdaHandler = async function (event, context) {
  redisClient = redis.createClient()
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

  delete event[FUNCTION_KEY] // To make tests more readable

  await setExecution(event)
  const stub = await getStub()
  return stub
}

async function setExecution (obj) {
  const executionsKey = getExecutionsKey()
  const rawExecutions = await redisGet(executionsKey)
  const executions = rawExecutions || []
  executions.push(obj)
  await redisSet(executionsKey, executions)
}

async function getStub () {
  const stubsKey = getStubsKey()
  const executionsKey = getExecutionsKey()
  const [stubs, executions] = await Promise.all([redisGet(stubsKey), redisGet(executionsKey)])
  return stubs ? stubs[executions ? executions.length - 1 : 0] : null
}

function getStubsKey () {
  return `stubs:${functionName}`
}

function getExecutionsKey () {
  return `executions:${functionName}`
}
