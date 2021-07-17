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
    version: '2.1'
    services:
      ${getStepFunctionsService()}:
        ## Fix docker image version, since there are incompatibilities in network access betweeen versions
        image: amazon/aws-stepfunctions-local:1.7.6
        ports:
          - ${stepFunctionsPort}:8083
        environment:
          - LAMBDA_ENDPOINT=${utils.getLambdaEndpoint()}:${lambdaPort}
        network_mode: host
      ${getRedisService()}:
        image: redis
        ports: 
          - ${redisPort}:6379
        healthcheck:
          test: ["CMD", "redis-cli", "ping"]
          interval: 1s
          timeout: 3s
          retries: 30
        networks:
          - ${constants.DOCKER_NETWORK}
    networks:
      ${constants.DOCKER_NETWORK}:
        name: ${constants.DOCKER_NETWORK}
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

