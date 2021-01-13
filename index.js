module.exports = {

}

const dockerCompose = require('docker-compose')
const dockerComposeFile = require('./lib/docker-compose-file')

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
  await setUpStepFunctions()
}

async function setUpStepFunctions () {
  const dockerComposeConfig = dockerComposeFile({})
  const dockerResult = await dockerCompose.upAll({
    configAsString: dockerComposeConfig,
    composeOptions: [['--verbose']]
  })

  console.log(dockerResult)
}
