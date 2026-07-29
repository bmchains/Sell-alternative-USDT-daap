import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers'

import { PAYMENT_NETWORKS, type PaymentChain, type WalletKey } from '../config'
import type { EvmInjectedProvider } from '../global'

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

const EVM_WALLET_KEYS: WalletKey[] = ['metamask', 'trustwallet', 'coinbase']

export const isEvmWallet = (wallet: WalletKey): wallet is 'metamask' | 'trustwallet' | 'coinbase' =>
  EVM_WALLET_KEYS.includes(wallet)

const getInjectedProviders = (): EvmInjectedProvider[] => {
  if (!window.ethereum) return []
  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    return window.ethereum.providers
  }

  return [window.ethereum]
}

export const getEvmProvider = (wallet: 'metamask' | 'trustwallet' | 'coinbase') => {
  const providers = getInjectedProviders()
  if (providers.length === 0) return undefined

  return providers.find((provider) => {
    if (wallet === 'metamask') {
      return provider.isMetaMask && !provider.isTrustWallet && !provider.isCoinbaseWallet
    }

    if (wallet === 'trustwallet') {
      return provider.isTrustWallet || provider.isTrust
    }

    return provider.isCoinbaseWallet
  })
}

export const connectEvmWallet = async (wallet: 'metamask' | 'trustwallet' | 'coinbase') => {
  const provider = getEvmProvider(wallet)
  if (!provider) {
    throw new Error(`${wallet} provider not found in this browser.`)
  }

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const address = accounts?.[0]
  if (!address) {
    throw new Error('No EVM account returned by the wallet.')
  }

  const chainIdHex = (await provider.request({ method: 'eth_chainId' })) as string

  return {
    provider,
    address,
    chainIdHex,
  }
}

export const ensureCorrectEvmChain = async (
  provider: EvmInjectedProvider,
  chain: Extract<PaymentChain, 'bsc' | 'ethereum'>,
) => {
  const network = PAYMENT_NETWORKS[chain]
  if (!network.evm) {
    throw new Error('Invalid EVM payment network.')
  }

  const currentChainId = (await provider.request({ method: 'eth_chainId' })) as string
  if (currentChainId === network.evm.chainIdHex) {
    return
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.evm.chainIdHex }],
    })
  } catch {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: network.evm.chainIdHex,
          chainName: network.evm.chainName,
          nativeCurrency: network.evm.nativeCurrency,
          rpcUrls: network.evm.rpcUrls,
          blockExplorerUrls: network.evm.blockExplorerUrls,
        },
      ],
    })
  }
}

export const getEvmUsdtBalance = async (
  provider: EvmInjectedProvider,
  chain: Extract<PaymentChain, 'bsc' | 'ethereum'>,
  address: string,
) => {
  const network = PAYMENT_NETWORKS[chain]
  const browserProvider = new BrowserProvider(provider)
  const contract = new Contract(network.usdtAddress, ERC20_ABI, browserProvider)
  const balance = (await contract.balanceOf(address)) as bigint

  return {
    raw: balance,
    formatted: formatUnits(balance, network.usdtDecimals),
  }
}

export const sendEvmUsdt = async (
  provider: EvmInjectedProvider,
  chain: Extract<PaymentChain, 'bsc' | 'ethereum'>,
  amount: string,
) => {
  const network = PAYMENT_NETWORKS[chain]
  const browserProvider = new BrowserProvider(provider)
  const signer = await browserProvider.getSigner()
  const contract = new Contract(network.usdtAddress, ERC20_ABI, signer)
  const parsedAmount = parseUnits(amount, network.usdtDecimals)
  const transaction = await contract.transfer(network.treasury, parsedAmount)
  const receipt = await transaction.wait()

  return {
    hash: transaction.hash as string,
    receipt,
  }
}
