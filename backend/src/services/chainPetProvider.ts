import { ethers } from 'ethers'
import type { WalletAddress } from '@cryptopets/shared'
import { env } from '../config/env.js'

export interface ChainPet {
  tokenId: string
  name: string
  iv: number
  level: number
  skinId: number
}

export interface ChainPetProvider {
  getWalletPets(wallet: WalletAddress): Promise<ChainPet[]>
  mintStarterPet(wallet: WalletAddress, petName: string, iv: number): Promise<string>
}

const petAbi = [
  'function getUserPetId(address who) view returns (uint256[])',
  'function ownerToPets(address owner, uint256 petId) view returns (uint256 petId, string petName, uint8 petIv, uint256 petLevel, uint8 petSkin)',
  'function addPet(string petName, address to, uint8 petIv) returns (bool)',
]

export function isChainPetSyncEnabled() {
  return isConfiguredContract(env.NFT_CONTRACT_ADDRESS) && Boolean(env.RPC_URL)
}

export function createChainPetProvider(): ChainPetProvider {
  if (!env.RPC_URL || !env.NFT_CONTRACT_ADDRESS) {
    return emptyChainPetProvider
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL)
  const runner = env.NFT_OWNER_PRIVATE_KEY ? new ethers.Wallet(env.NFT_OWNER_PRIVATE_KEY, provider) : provider
  const contract = new ethers.Contract(env.NFT_CONTRACT_ADDRESS, petAbi, runner)

  return new EthersChainPetProvider(contract)
}

export const emptyChainPetProvider: ChainPetProvider = {
  async getWalletPets() {
    return []
  },
  async mintStarterPet() {
    throw new Error('CHAIN_PET_MINTER_NOT_CONFIGURED')
  },
}

class EthersChainPetProvider implements ChainPetProvider {
  constructor(private readonly contract: ethers.Contract) {}

  async getWalletPets(wallet: WalletAddress): Promise<ChainPet[]> {
    const tokenIds = (await this.contract.getUserPetId(wallet)) as bigint[]

    return Promise.all(
      tokenIds.map(async (tokenId) => {
        const pet = (await this.contract.ownerToPets(wallet, tokenId)) as {
          1: string
          2: bigint | number
          3: bigint | number
          4: bigint | number
          petName?: string
          petIv?: bigint | number
          petLevel?: bigint | number
          petSkin?: bigint | number
        }

        return {
          tokenId: tokenId.toString(),
          name: pet.petName ?? pet[1],
          iv: Number(pet.petIv ?? pet[2]),
          level: Number(pet.petLevel ?? pet[3]),
          skinId: Number(pet.petSkin ?? pet[4]),
        }
      }),
    )
  }

  async mintStarterPet(wallet: WalletAddress, petName: string, iv: number): Promise<string> {
    if (!('addPet' in this.contract) || typeof this.contract.addPet !== 'function') {
      throw new Error('CHAIN_PET_MINTER_NOT_CONFIGURED')
    }

    const tx = await this.contract.addPet(petName, wallet, iv)
    await tx.wait()
    const tokenIds = (await this.contract.getUserPetId(wallet)) as bigint[]
    const mintedTokenId = tokenIds[tokenIds.length - 1]

    if (mintedTokenId === undefined) {
      throw new Error('CHAIN_PET_MINT_FAILED')
    }

    return mintedTokenId.toString()
  }
}

function isConfiguredContract(address: string | undefined) {
  return Boolean(address && !/^0x0{40}$/i.test(address))
}
