export type PaymentChain = 'bsc' | 'ethereum' | 'tron' | 'solana'
export type TokenKey = 'solanaToken' | 'bscToken'
export type WalletKey = 'metamask' | 'trustwallet' | 'coinbase' | 'phantom' | 'tronlink'

type PaymentNetwork = {
  id: PaymentChain
  label: string
  symbol: string
  treasury: string
  usdtAddress: string
  usdtDecimals: number
  rpcLabel: string
  explorerBaseUrl: string
  chainType: 'evm' | 'tron' | 'solana'
  evm?: {
    chainId: number
    chainIdHex: `0x${string}`
    chainName: string
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
    rpcUrls: string[]
    blockExplorerUrls: string[]
  }
}

type TargetToken = {
  id: TokenKey
  label: string
  chain: PaymentChain
  address: string
  symbol: string
  decimals: number
  description: string
  tokensPerUsdt: number
}

const env = (key: string, fallback: string) => {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

const envNumber = (key: string, fallback: number) => {
  const value = Number(import.meta.env[key])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const APP_CONFIG = {
  brand: env('VITE_APP_BRAND', 'BMverse Token Gateway'),
  supportHandle: env('VITE_SUPPORT_HANDLE', '@support'),
  settlementMode: env(
    'VITE_SETTLEMENT_MODE',
    'manual',
  ) as 'manual' | 'automatic',
  legalNote: env(
    'VITE_LEGAL_NOTE',
    'Configure your treasury wallets, pricing, and off-chain fulfillment before using this app in production.',
  ),
}

export const TARGET_TOKENS: Record<TokenKey, TargetToken> = {
  solanaToken: {
    id: 'solanaToken',
    label: 'Solana Token',
    chain: 'solana',
    address: '3euXPvCHKAPja5HHBz5SmRgcJDvbMmi9AYK3Q3TEJRUC',
    symbol: env('VITE_SOLANA_TOKEN_SYMBOL', 'SOLX'),
    decimals: envNumber('VITE_SOLANA_TOKEN_DECIMALS', 9),
    description: 'Target token minted on Solana.',
    tokensPerUsdt: envNumber('VITE_SOLANA_TOKEN_RATE', 100),
  },
  bscToken: {
    id: 'bscToken',
    label: 'BEP20 Token',
    chain: 'bsc',
    address: '0x5A09A4e79DAA90DAd3AF97eB33fBdC54d20f8888',
    symbol: env('VITE_BSC_TOKEN_SYMBOL', 'BMX'),
    decimals: envNumber('VITE_BSC_TOKEN_DECIMALS', 18),
    description: 'Target token minted on BNB Smart Chain.',
    tokensPerUsdt: envNumber('VITE_BSC_TOKEN_RATE', 100),
  },
}

export const PAYMENT_NETWORKS: Record<PaymentChain, PaymentNetwork> = {
  bsc: {
    id: 'bsc',
    label: 'BNB Smart Chain',
    symbol: 'USDT BEP20',
    treasury: env('VITE_BSC_TREASURY', 'REPLACE_WITH_BSC_TREASURY'),
    usdtAddress: env('VITE_BSC_USDT', '0x55d398326f99059fF775485246999027B3197955'),
    usdtDecimals: 18,
    rpcLabel: 'BSC mainnet',
    explorerBaseUrl: 'https://bscscan.com/tx/',
    chainType: 'evm',
    evm: {
      chainId: 56,
      chainIdHex: '0x38',
      chainName: 'BNB Smart Chain',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
      },
      rpcUrls: [env('VITE_BSC_RPC', 'https://bsc-dataseed.binance.org')],
      blockExplorerUrls: ['https://bscscan.com'],
    },
  },
  ethereum: {
    id: 'ethereum',
    label: 'Ethereum',
    symbol: 'USDT ERC20',
    treasury: env('VITE_ETH_TREASURY', 'REPLACE_WITH_ETH_TREASURY'),
    usdtAddress: env('VITE_ETH_USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7'),
    usdtDecimals: 6,
    rpcLabel: 'Ethereum mainnet',
    explorerBaseUrl: 'https://etherscan.io/tx/',
    chainType: 'evm',
    evm: {
      chainId: 1,
      chainIdHex: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: [env('VITE_ETH_RPC', 'https://ethereum-rpc.publicnode.com')],
      blockExplorerUrls: ['https://etherscan.io'],
    },
  },
  tron: {
    id: 'tron',
    label: 'Tron',
    symbol: 'USDT TRC20',
    treasury: env('VITE_TRON_TREASURY', 'REPLACE_WITH_TRON_TREASURY'),
    usdtAddress: env('VITE_TRON_USDT', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'),
    usdtDecimals: 6,
    rpcLabel: 'Tron mainnet',
    explorerBaseUrl: 'https://tronscan.org/#/transaction/',
    chainType: 'tron',
  },
  solana: {
    id: 'solana',
    label: 'Solana',
    symbol: 'USDT SPL',
    treasury: env('VITE_SOLANA_TREASURY', 'REPLACE_WITH_SOLANA_TREASURY'),
    usdtAddress: env('VITE_SOLANA_USDT', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    usdtDecimals: 6,
    rpcLabel: 'Solana mainnet-beta',
    explorerBaseUrl: 'https://explorer.solana.com/tx/',
    chainType: 'solana',
  },
}

export const DEFAULT_TOKEN: TokenKey = 'solanaToken'
export const DEFAULT_PAYMENT_CHAIN: PaymentChain = 'bsc'

export const isPlaceholderAddress = (value: string) => value.startsWith('REPLACE_WITH_')

export const shortenAddress = (value: string, size = 4) => {
  if (value.length <= size * 2 + 3) return value
  return `${value.slice(0, size + 2)}...${value.slice(-size)}`
}
