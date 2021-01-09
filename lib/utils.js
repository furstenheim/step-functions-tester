module.exports = {
  getPlatform
}
const constants = require('./constants')
const process = require('process')
const allowedPlatforms = [constants.LINUX_PLATFORM, constants.DARWIN_PLATFORM]
function getPlatform () {
  const platform = process.platform
  if (!allowedPlatforms.includes(platform)) {
    throw new Error(`Unsupported platform "${platform}" in the library consider opening a PR to add support`)
  }
  return process.platform
}
