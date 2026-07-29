import { PAYMENT_NETWORKS } from '../config'
import type { TronInjectedProvider } from '../global'

const getTronProvider = (): TronInjectedProvider | undefined => {
  if (window.tronLink?.request) return window.tronLink
  if (window.tron?.request) return window.tron
  return undefined
}

const resolveTronWeb = () => {
  if (window.tronWeb) return window.tronWeb
  if (window.tron?.tronWeb) return window.tron.tronWeb
  return undefined
}

export const connectTronWallet = async () => {
  const provider = getTronProvider()
  if (!provider) {
    throw new Error('TronLink provider not found in this browser.')
  }

  await provider.request({ method: 'eth_requestAccounts' })

  const tronWeb = resolveTronWeb()
  const address = tronWeb?.defaultAddress?.base58

  if (!tronWeb || !address) {
    throw new Error('Tron wallet connected, but no active address was returned.')
  }

  return {
    provider,
    address,
  }
}

export const getTronUsdtBalance = async () => {
  const tronWeb = resolveTronWeb()
  if (!tronWeb?.defaultAddress?.base58) {
    throw new Error('Tron wallet is not connected.')
  }

  const contract = await tronWeb.contract().at(PAYMENT_NETWORKS.tron.usdtAddress)
  const balance = await contract.balanceOf(tronWeb.defaultAddress.base58).call()

  return {
    raw: String(balance),
    formatted: (Number(balance) / 10 ** PAYMENT_NETWORKS.tron.usdtDecimals).toString(),
  }
}

export const sendTronUsdt = async (amount: string) => {
  const tronWeb = resolveTronWeb()
  if (!tronWeb?.defaultAddress?.base58) {
    throw new Error('Tron wallet is not connected.')
  }

  const contract = await tronWeb.contract().at(PAYMENT_NETWORKS.tron.usdtAddress)
  const rawAmount = Math.round(Number(amount) * 10 ** PAYMENT_NETWORKS.tron.usdtDecimals)
  const txid = await contract.transfer(PAYMENT_NETWORKS.tron.treasury, rawAmount).send()

  return {
    hash: String(txid),
  }
}
