const dockerNetworkComposeName = 'step-function-tester'

module.exports = {
  DEFAULT_STEP_FUNCTIONS_PORT: 8083,
  DEFAULT_LABMDA_PORT: 3001,
  DEFAULT_REDIS_PORT: 6379,
  LINUX_PLATFORM: 'linux',
  DARWIN_PLATFORM: 'darwin',
  LAMBDA_NAME: 'MockFunction',
  LAMBDA_ARN: 'arn:aws:lambda:us-east-1:123456789012:function:MockFunction',
  DEFAULT_EXECUTION_TIMEOUT: 100000,
  DEFAULT_EXECUTION_INTERVAL: 100,
  DEFAULT_SUBNET: '240.10.2.0',
  SUBNET_REGEX: /^(\d{1,3}\.\d{1,3}\.\d{1,2})\.\d{1,3}$/,
  // The actual name in docker built by docker compose
  DOCKER_NETWORK: `test_${dockerNetworkComposeName}`,
  DOCKER_NETWORK_COMPOSE_NAME: dockerNetworkComposeName
}
