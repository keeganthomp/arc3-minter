const algosdk = require('algosdk')
const fs = require('fs')
const { sha256 } = require('js-sha256')
const path = require('path')

const IPFS = require('./IPFS')
const { keypress } = require('../utils')
const { CURRENT_NETWORK, NETWORK } = require('../constants/network')

const isTestnet = CURRENT_NETWORK === NETWORK.TESTNET

const { MNEMONIC } = process.env

const createAlgodClient = () => {
  // Connect your client
  const algodToken = ''
  const algodServer = isTestnet ? 'https://node.testnet.algoexplorerapi.io' : ''
  const algodPort = ''
  return new algosdk.Algodv2(algodToken, algodServer, algodPort)
}

const algodClient = createAlgodClient()

/**
 * Wait until the transaction is confirmed or rejected, or until 'timeout'
 * number of rounds have passed.
 * @param {algosdk.Algodv2} algodClient the Algod V2 client
 * @param {string} txId the transaction ID to wait for
 * @param {number} timeout maximum number of rounds to wait
 * @return {Promise<*>} pending transaction information
 * @throws Throws an error if the transaction is not confirmed or rejected in the next timeout rounds
 */
const waitForConfirmation = async function (algodClient, txId, timeout) {
  if (algodClient == null || txId == null || timeout < 0) {
    throw new Error('Bad arguments')
  }

  const status = await algodClient.status().do()
  if (status === undefined) {
    throw new Error('Unable to get node status')
  }

  const startround = status['last-round'] + 1
  let currentround = startround

  while (currentround < startround + timeout) {
    const pendingInfo = await algodClient
      .pendingTransactionInformation(txId)
      .do()
    if (pendingInfo !== undefined) {
      if (
        pendingInfo['confirmed-round'] !== null &&
        pendingInfo['confirmed-round'] > 0
      ) {
        //Got the completed Transaction
        return pendingInfo
      } else {
        if (
          pendingInfo['pool-error'] != null &&
          pendingInfo['pool-error'].length > 0
        ) {
          // If there was a pool error, then the transaction has been rejected!
          throw new Error(
            'Transaction ' +
              txId +
              ' rejected - pool error: ' +
              pendingInfo['pool-error']
          )
        }
      }
    }
    await algodClient.statusAfterBlock(currentround).do()
    currentround++
  }
  throw new Error(
    'Transaction ' + txId + ' not confirmed after ' + timeout + ' rounds!'
  )
}

const getAccountInfo = acct => algodClient.accountInformation(acct.addr).do()

const getAccount = function () {
  return new Promise(async (resolve, rej) => {
    try {
      const account = algosdk.mnemonicToSecretKey(MNEMONIC.replace(/,/g, ''))
      // const accountInfo = await getAccountInfo(account)
      resolve(account)
    } catch (err) {
      console.log('err', err)
    }
  })
}

const getMetaDataFromFile = () => metaDataJson

const createAsset = async (prefix, nftMetaData, creatorAccount) => {
  const DECIMALS = 0
  const TOTAL = 1

  const arc3MetadataJSON = {}
  const creatorAddress = creatorAccount.address
  // Construct the transaction
  const params = await algodClient.getTransactionParams().do()
  // Whether user accounts will need to be unfrozen before transacting
  const defaultFrozen = false
  // Used to display asset units to user
  const unitName = `${prefix}${nftMetaData.edition}`
  // Friendly name of the asset
  const assetName = nftMetaData.name
  // Specified address can change reserve, freeze, clawback, and manager
  // If they are set to undefined at creation time, you will not be able to modify these later
  const managerAddr = creatorAddress // OPTIONAL: FOR DEMO ONLY, USED TO DESTROY ASSET WITHIN
  // Specified address is considered the asset reserve
  // (it has no special privileges, this is only informational)
  const reserveAddr = creatorAddress
  // Specified address can freeze or unfreeze user asset holdings
  const freezeAddr = undefined
  // Specified address can revoke user asset holdings and send
  // them to other addresses
  const clawbackAddr = undefined
  // how many decimals for this asset
  const decimals = DECIMALS
  // how many of this asset there will be
  const total = TOTAL

  const assetFileName = `${nftMetaData.edition}.png`
  const NFTImage = fs.readFileSync(path.resolve(__dirname, `../${nftMetaData.path}`))
  const nftFileNameSplit = assetFileName.split('.')
  const fileCat = 'image'
  const fileExt = nftFileNameSplit[1]
  // get image file
  // upload to IPFS
  const { path: imageCID } = await IPFS.putToIPFS(NFTImage)
  // get ipfs url
  const imageIPFSHash = `ipfs://${imageCID}`
  // get hash of image for integrity metadata param
  const bytes = new Uint8Array(NFTImage)
  const hash = new Uint8Array(sha256.digest(bytes))
  const imageIntegrity = 'sha256-' + Buffer.from(hash).toString('base64')

  const properties = {
    traits: {},
  }
  const { attributes } = nftMetaData

  // store extra data in properties
  attributes.forEach(attr => {
    const { trait_type: key, value } = attr
    properties.traits[key] = value
  })

  // define meta data
  // ARC3 standard fields
  arc3MetadataJSON.name = assetName
  arc3MetadataJSON.description = nftMetaData.description
  arc3MetadataJSON.image = imageIPFSHash
  arc3MetadataJSON.image_integrity = imageIntegrity
  arc3MetadataJSON.image_mimetype = `${fileCat}/${fileExt}`
  arc3MetadataJSON.properties = properties
  arc3MetadataJSON.decimals = decimals
  // arc3MetadataJSON.background_color
  // arc3MetadataJSON.external_url
  // arc3MetadataJSON.external_url_integrity
  // arc3MetadataJSON.animation_url
  // arc3MetadataJSON.animation_url_integrity
  // arc3MetadataJSON.animation_url_mimetype
  // arc3MetadataJSON.extra_metadata
  // arc3MetadataJSON.localization

  // create the hash of the metadata
  const { path: metaDataCID } = await IPFS.putToIPFS(arc3MetadataJSON, true)
  const metaDataIpfsUrl = `ipfs://${metaDataCID}/#arc3`
  // get hash of all metadata
  let metaDataHash = sha256.create()
  metaDataHash.update(arc3MetadataJSON.toString())
  metaDataHash = new Uint8Array(metaDataHash.digest())
  // signing and sending "txn" allows "addr" to create an asset
  const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
    from: creatorAddress,
    total,
    decimals,
    assetName,
    unitName,
    assetURL: metaDataIpfsUrl,
    assetMetadataHash: metaDataHash,
    defaultFrozen,
    freeze: freezeAddr,
    manager: managerAddr,
    clawback: clawbackAddr,
    reserve: reserveAddr,
    suggestedParams: params,
  })

  const rawSignedTxn = txn.signTxn(creatorAccount.sk)
  const tx = await algodClient.sendRawTransaction(rawSignedTxn).do()
  // wait for transaction to be confirmed
  await waitForConfirmation(algodClient, tx.txId, 4)
  return algodClient.pendingTransactionInformation(tx.txId).do()
}

module.exports = {
  getAccount,
  getMetaDataFromFile,
  createAsset,
}
