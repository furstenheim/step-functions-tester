const dedent = require('dedent')
const constants = require('./constants')
const utils = require('./utils')

module.exports = {
  getConfiguration,
  getStepFunctionsService,
  getRedisService
}

/**
 * @param {{stepFunctionsPort: number, lambdaPort: number, redisPort: number }} params
 *
 * @return string
 */
function getConfiguration ({
  stepFunctionsPort = constants.DEFAULT_STEP_FUNCTIONS_PORT,
  lambdaPort = constants.DEFAULT_LABMDA_PORT,
  redisPort = constants.DEFAULT_REDIS_PORT,
  defaultSubnet = constants.DEFAULT_SUBNET
}) {
  const subnetMatch = defaultSubnet.match(constants.SUBNET_REGEX)
  if (!subnetMatch) {
    throw new Error('Subnet does not match regex')
  }
  return dedent`
    version: '2'
    services:
      ${getStepFunctionsService()}:
        image: amazon/aws-stepfunctions-local
        ports:
          - ${stepFunctionsPort}:8083
        environment:
          - LAMBDA_ENDPOINT=${utils.getLambdaEndpoint()}:${lambdaPort}
        ${getNetwork()}
      ${getRedisService()}:
        image: redis
        ports: 
          - ${redisPort}:6379
    networks:
      default:
        driver: bridge
        ipam:
          driver: default
          config:
            - subnet: ${subnetMatch[1]}.0/24
              gateway: ${subnetMatch[1]}.1
  `
}

function getStepFunctionsService () {
  return 'step_functions'
}

function getRedisService () {
  return 'redis'
}

function getNetwork () {
  const platform = utils.getPlatform()
  if (platform === constants.DARWIN_PLATFORM) {
    return dedent`networks:
                    - default    
    `
  }
  if (platform === constants.LINUX_PLATFORM) {
    return 'network_mode: host'
  }

  throw new Error(`Unsupported platform "${platform}"`)
}
