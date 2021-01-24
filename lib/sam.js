module.exports = {
  runSam
}

const spawn = require('child_process').spawn
const path = require('path')

async function runSam () {
  const build = spawn('sam', ['build'], {
    cwd: path.join(__dirname, 'sam')
  })
  await new Promise(function (resolve, reject) {
    build.on('close', function (code) {
      if (code === 0) {
        return resolve()
      }
      return reject(new Error(`Wrong exit code from build ${code}`))
    })
    build.stdout.on('data', function (d) {
      console.log('stdout', d.toString())
    })

    build.stderr.on('data', function (d) {
      console.log('stderr', d.toString())
    })
    build.on('error', function (err) {
      console.log(err)
      reject(err)
    })
  })

  const run = spawn('sam', ['local', 'start-lambda', '--docker-network', 'host'], {
    cwd: path.join(__dirname, 'sam')
  })
  await new Promise(function (resolve, reject) {
    run.on('close', function (code) {
      if (code === 0) {
        return resolve()
      }
      return reject(new Error(`Wrong exit code from run ${code}`))
    })
    run.stdout.on('data', function (d) {
      console.log('stdout', d.toString())
    })

    run.stderr.on('data', function (d) {
      if (d.toString().match(/Running on .* \(Press CTRL\+C to quit\)/)) {
        resolve()
      }
      console.log('stderr', d.toString())
    })
    run.on('error', function (err) {
      console.log(err)
      reject(err)
    })
  })
  process.on('exit', function () {
    run.kill()
  })
}
