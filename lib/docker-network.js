module.exports = {
  waitForDockerNetworkToBeFree
}

const constants = require('./constants')
const spawn = require('child_process').spawn
const debug = require('debug')('step-functions-tester')
const _ = require('lodash')
const utils = require('./utils')


/**
 * Docker network is shared between redis and Sam.
 * When disconnecting Sam this should tear down the container and unplug it from the network.
 * However, this is not always the case and we must remove it manually
 * @returns {Promise<void>}
 */
async function waitForDockerNetworkToBeFree () {
  const nIterations = 5
  for (let i = 0; i < nIterations; i++) {
    const networkStatus = await retrieveDockerNetwork()
    if (networkStatus.length !== 1) {
      throw new Error(`Expected length of 1 for network status. Found ${JSON.stringify(networkStatus)}`)
    }
    const networkContainers = networkStatus[0].Containers
    const numberOfContainers = _.size(networkContainers)

    if (numberOfContainers === 0) {
      debug('No containers attached to the network. Will tear down nevertheless')
      return
    }
    if (numberOfContainers === 1) {
      debug('Only redis is connected to docker network. Ready to tear down the network')
      return
    }
    await utils.waitFor(100)

    if (i === nIterations - 1) {
      debug('Sam leaked containers. We\'ll remove them manually')
      const samContainers = _.filter(networkContainers, function (containerInformation) {
        return containerInformation.Name !== 'test_redis_1'
      })
      for (const container of samContainers) {
        const containerName = container.Name
        await dockerStopContainer(containerName)
        await dockerRemoveContainer(containerName)
      }
    }
  }
}

async function retrieveDockerNetwork () {
  const spawnProcess = spawn('docker', ['network', 'inspect', constants.DOCKER_NETWORK])
  const {stdout, stderr} = await utils.waitForSpawn(spawnProcess)
  debug('Stderr for retrieve network', stderr)
  debug('Stdout for retrieve network', stdout)
  return JSON.parse(stdout)
}


async function dockerStopContainer (containerName) {
  const spawnProcess = spawn('docker', ['container', 'stop', containerName])
  const {stdout, stderr} = await utils.waitForSpawn(spawnProcess)
  debug('Stderr for stop container', stderr)
  debug('Stdout for stop container', stdout)
}
async function dockerRemoveContainer (containerName) {
  const spawnProcess = spawn('docker', ['container', 'rm', containerName])
  const {stdout, stderr} = await utils.waitForSpawn(spawnProcess)
  debug('Stderr for rm container', stderr)
  debug('Stdout for rm container', stdout)
}
