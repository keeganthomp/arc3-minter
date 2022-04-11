const jimp = require('jimp')
const { resolve } = require('path')
const { readdir } = require('fs').promises

const LAYER_PATH = './NFT/layers/'

const isPNG = file => file.toLowerCase().includes('.png')

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(res)
    } else {
      yield res
    }
  }
}

const createComposite = async () =>
  new Promise(async (resolve, reject) => {
    try {
      const backgrounds = []
      const bodies = []
      const expressions = []

      const traitPaths = []

      for await (const f of getFiles(LAYER_PATH)) {
        const fmtFileName = f.split(LAYER_PATH.replace('.', ''))[1]
        if (isPNG(fmtFileName)) {
          if (fmtFileName.startsWith('02Skin')) {
            bodies.push(fmtFileName)
          } else if (fmtFileName.startsWith('01Background')) {
            backgrounds.push(fmtFileName)
          } else if (fmtFileName.startsWith('03Face')) {
            expressions.push(fmtFileName)
          } else {
            traitPaths.push(fmtFileName)
          }
        }
      }

      const rBg = getRandomInt(backgrounds.length - 1)
      const rBody = getRandomInt(bodies.length - 1)
      const rExpr = getRandomInt(expressions.length - 1)
      const rTrait = getRandomInt(traitPaths.length - 1)

      console.log({
        rBody,
        rExpr,
        rTrait,
      })

      const t = [
        jimp.read(LAYER_PATH + backgrounds[rBg]),
        jimp.read(LAYER_PATH + bodies[rBody]),
        jimp.read(LAYER_PATH + expressions[rExpr]),
        jimp.read(LAYER_PATH + traitPaths[rTrait]),
      ]

      const imgs = await Promise.all(t)
      const base = imgs[0]
      base.composite(imgs[1], 0, 0)
      base.composite(imgs[2], 0, 0)
      base.composite(imgs[3], 0, 0)
      base.write(`final-images/NFT${rBody + rExpr + rTrait}.png`, () => {
        const response = {
          path: `final-images/NFT${rBody + rExpr + rTrait}.png`,
          body: bodies[rBody],
          expressions: expressions[rExpr],
          traitPaths: traitPaths[rTrait],
        }
        resolve(response)
      })
      // const jimpsPromises = filePaths.map(path => jimp.read(LAYER_PATH + path))
    } catch (err) {
      reject(err)
    }
  })

createComposite()

module.exports = {
  createComposite
}
