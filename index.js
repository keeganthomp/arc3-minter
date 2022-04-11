const { getAccount, createAsset } = require('./lib/Algorand')
// const { getMetaDataFromFile, keypress } = require('./utils')
const { createComposite } = require('./lib/Composit')
require('dotenv').config()


const PREFIX = 'EVIE'

console.log('process.env', process.env)

const mintNft = (nftMetaData, user) => createAsset(PREFIX, nftMetaData, user)

async function createNFT() {
  try {
    const COST_FOR_NFT = 0.001
    const comp = await createComposite()
    console.log('comp', comp)
    // // get user/creator account
    // const account = await getAccount()
    // const startingAmount = account.amount
    // console.log('')
    // console.log('User account balance: %d microAlgos', startingAmount)
    // // get nft metadata
    // const nftMetaData = getMetaDataFromFile()
    // // grabbing small amount to test
    // const slicedNftMetaData = nftMetaData.slice(0, 1)
    // const numberOfNFTsToCreate = slicedNftMetaData.length
    // const totalCost = COST_FOR_NFT * numberOfNFTsToCreate
    // console.log(`Please ensure the account has at least ${totalCost} ALGO.`)
    // console.log('')
    // console.log('Press any key to continue')
    // await keypress()

    // console.log('Minting NFTs. Please wait...')
    // const promises = slicedNftMetaData.map(
    //   async nftMetaData => await mintNft(nftMetaData, account)
    // )
    const results = await Promise.all(promises)
    console.log('')
    console.log('results', results)
  } catch (err) {
    console.log('err', err)
  }
  process.exit()
}

createNFT()
