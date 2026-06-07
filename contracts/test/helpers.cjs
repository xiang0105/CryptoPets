const fs = require('node:fs')
const path = require('node:path')
const { expect } = require('chai')
const { ethers } = require('ethers')
const ganache = require('ganache')
const solc = require('solc')

const contractsRoot = path.resolve(__dirname, '..')

let compiledContracts

function collectSoliditySources(dir, sources = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectSoliditySources(fullPath, sources)
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.sol')) {
      const relativePath = path.relative(contractsRoot, fullPath).replaceAll(path.sep, '/')
      sources[relativePath] = { content: fs.readFileSync(fullPath, 'utf8') }
    }
  }

  return sources
}

function compileAllContracts() {
  if (compiledContracts) {
    return compiledContracts
  }

  const input = {
    language: 'Solidity',
    sources: collectSoliditySources(contractsRoot),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  const errors = (output.errors ?? []).filter((error) => error.severity === 'error')

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.formattedMessage).join('\n'))
  }

  compiledContracts = output.contracts
  return compiledContracts
}

function getCompiledContract(contractName) {
  const contracts = compileAllContracts()

  for (const fileContracts of Object.values(contracts)) {
    if (fileContracts[contractName]?.evm.bytecode.object) {
      return fileContracts[contractName]
    }
  }

  throw new Error(`Contract not found: ${contractName}`)
}

async function createChain() {
  const ganacheProvider = ganache.provider({
    logging: { quiet: true },
    wallet: {
      totalAccounts: 8,
      defaultBalance: 1000,
    },
  })
  const provider = new ethers.BrowserProvider(ganacheProvider)
  const signers = []

  for (let index = 0; index < 8; index++) {
    signers.push(await provider.getSigner(index))
  }

  return { provider, signers }
}

async function deployContract(contractName, signer, args = []) {
  const compiled = getCompiledContract(contractName)
  const factory = new ethers.ContractFactory(compiled.abi, compiled.evm.bytecode.object, signer)
  const contract = await factory.deploy(...args)
  await contract.waitForDeployment()
  return contract
}

async function mine(transactionPromise) {
  const transaction = await transactionPromise
  return transaction.wait()
}

async function getRawBalance(provider, address) {
  return BigInt(await provider.send('eth_getBalance', [address, 'latest']))
}

function errorText(error) {
  return [
    error?.shortMessage,
    error?.reason,
    error?.info?.error?.message,
    error?.message,
  ].filter(Boolean).join('\n')
}

async function expectRevert(promise, message) {
  try {
    const result = await promise

    if (result?.wait) {
      await result.wait()
    }
  } catch (error) {
    if (message) {
      expect(errorText(error)).to.include(message)
    }
    return
  }

  throw new Error(`Expected transaction to revert with: ${message}`)
}

module.exports = {
  createChain,
  deployContract,
  expectRevert,
  getRawBalance,
  mine,
}
