import { ethers } from 'ethers'
import type { WalletAddress } from '@cryptopets/shared'
import { env } from '../config/env.js'

export interface ChainPet {
  tokenId: string
  iv: number
  skinId: number
}

export interface ChainPetProvider {
  getWalletPets(wallet: WalletAddress): Promise<ChainPet[]>
}

const petAbi = [
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function getPet(uint256 tokenId) view returns (uint16 iv, uint16 skinId)',
]

export function isChainPetSyncEnabled() {
  return isConfiguredContract(env.NFT_CONTRACT_ADDRESS) && Boolean(env.RPC_URL)
}

export function createChainPetProvider(): ChainPetProvider {
  if (!env.RPC_URL || !env.NFT_CONTRACT_ADDRESS) {
    return emptyChainPetProvider
  }

  const provider = new ethers.JsonRpcProvider(env.RPC_URL)
  const contract = new ethers.Contract(env.NFT_CONTRACT_ADDRESS, petAbi, provider)

  return new EthersChainPetProvider(contract)
}

export const emptyChainPetProvider: ChainPetProvider = {
  async getWalletPets() {
    return []
  },
}

class EthersChainPetProvider implements ChainPetProvider {
  constructor(private readonly contract: ethers.Contract) {}

  async getWalletPets(wallet: WalletAddress): Promise<ChainPet[]> {
    const tokenIds = (await this.contract.tokensOfOwner(wallet)) as bigint[]

    return Promise.all(
      tokenIds.map(async (tokenId) => {
        const pet = (await this.contract.getPet(tokenId)) as {
          0: bigint | number
          1: bigint | number
          iv?: bigint | number
          skinId?: bigint | number
        }

        return {
          tokenId: tokenId.toString(),
          iv: Number(pet.iv ?? pet[0]),
          skinId: Number(pet.skinId ?? pet[1]),
        }
      }),
    )
  }
}

function isConfiguredContract(address: string | undefined) {
  return Boolean(address && !/^0x0{40}$/i.test(address))
}
