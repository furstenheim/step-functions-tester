const dedent = require('dedent')
const constants = require('./constants')
const utils = require('./utils')

module.exports = getConfiguration

/**
 * @param {{stepFunctionsPort: number, lambdaPort: number, redisPort: number }} params
 *
 * @return string
 */
function getConfiguration ({
  stepFunctionsPort = constants.DEFAULT_STEP_FUNCTIONS_PORT,
  lambdaPort = constants.DEFAULT_LABMDA_PORT,
  redisPort = constants.DEFAULT_REDIS_PORT
}) {
  return dedent`
    version: '2'
    services:
      step_functions:
        image: amazon/aws-stepfunctions-local
        ports:
          - ${stepFunctionsPort}:8083
        environment:
          - LAMBDA_ENDPOINT=${getLambdaEndpoint()}:${lambdaPort}
        ${getNetwork()}
      redis:
        image: redis
        ports: 
          - ${redisPort}:6379
    networks:
      default:
        driver: bridge
        ipam:
          driver: default
          config:
            - subnet: 240.10.2.0/24
              gateway: 240.10.2.1
  `
}

function getLambdaEndpoint () {
  const platform = utils.getPlatform()
  if (platform === constants.DARWIN_PLATFORM) {
    return 'http://host.docker.internal'
  }
  if (platform === constants.LINUX_PLATFORM) {
    return 'http://localhost'
  }

  throw new Error(`Unsupported platform "${platform}"`)
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
