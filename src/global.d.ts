import type { PublicKey, Transaction } from '@solana/web3.js'
import type { TronWeb } from 'tronweb'

declare global {
  interface Window {
    ethereum?: EvmInjectedProvider
    phantom?: {
      solana?: PhantomProvider
    }
    solana?: PhantomProvider
    tronLink?: TronInjectedProvider
    tronWeb?: TronWeb & {
      defaultAddress?: {
        base58?: string
      }
      ready?: boolean
    }
    tron?: TronInjectedProvider & {
      tronWeb?: Window['tronWeb']
    }
  }
}

export interface EvmInjectedProvider {
  isMetaMask?: boolean
  isTrust?: boolean
  isTrustWallet?: boolean
  isCoinbaseWallet?: boolean
  providers?: EvmInjectedProvider[]
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
}

export interface PhantomProvider {
  isPhantom?: boolean
  publicKey?: PublicKey
  isConnected?: boolean
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>
  disconnect(): Promise<void>
  signTransaction(transaction: Transaction): Promise<Transaction>
}

export interface TronInjectedProvider {
  isTronLink?: boolean
  tronWeb?: Window['tronWeb'] | false
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
}

export {}
