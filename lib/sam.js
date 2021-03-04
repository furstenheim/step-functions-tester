module.exports = {
  runSam
}

const spawn = require('child_process').spawn
const path = require('path')
const debug = require('debug')('step-functions-tester')

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
      debug('stdout', d.toString())
    })

    build.stderr.on('data', function (d) {
      debug('stderr', d.toString())
    })
    build.on('error', function (err) {
      debug(err)
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
      debug('stdout', d.toString())
    })

    run.stderr.on('data', function (d) {
      if (d.toString().match(/Running on .* \(Press CTRL\+C to quit\)/)) {
        resolve()
      }
      debug('stderr', d.toString())
    })
    run.on('error', function (err) {
      debug(err)
      reject(err)
    })
  })
  process.on('exit', function () {
    try {
      run.kill()
    } catch (e) {
      // TODO catch if already closed
      console.error(e)
    }
  })
  return {
    stop: function () {
      try {
        run.kill()
      } catch (e) {
        // TODO catch if already closed
        console.error(e)
      }
    }
  }
}
