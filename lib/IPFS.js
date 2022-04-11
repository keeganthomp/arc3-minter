const { create } = require('ipfs-http-client')

const IPFS_GATEWAY = 'https://ipfs.infura.io:5001/api/v0'

async function putToIPFS(item, isObject) {
  /* Create an instance of the client */
  const client = create(IPFS_GATEWAY)
  if (isObject) {
    return client.add(JSON.stringify(item))
  } else {
    /* upload the file */
    return client.add(item)
  }
}

module.exports = {
  putToIPFS,
}
