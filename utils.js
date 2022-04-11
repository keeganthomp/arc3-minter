const metaDataJson = require('./NFT/_metadata.json')

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve =>
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false)
      resolve()
    })
  )
}

const getMetaDataFromFile = () => metaDataJson

module.exports = {
  keypress,
  getMetaDataFromFile,
}
