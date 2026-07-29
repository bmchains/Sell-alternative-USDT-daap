import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token'

import { PAYMENT_NETWORKS } from '../config'
import type { PhantomProvider } from '../global'

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC?.trim() || clusterApiUrl('mainnet-beta')

export const getPhantomProvider = () => {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana
  if (window.solana?.isPhantom) return window.solana
  return undefined
}

export const connectPhantom = async () => {
  const provider = getPhantomProvider()
  if (!provider) {
    throw new Error('Phantom provider was not found in this browser.')
  }

  const response = await provider.connect()
  return {
    provider,
    address: response.publicKey.toBase58(),
  }
}

export const getSolanaUsdtBalance = async (provider: PhantomProvider) => {
  if (!provider.publicKey) {
    throw new Error('Phantom wallet is not connected.')
  }

  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const usdtMint = new PublicKey(PAYMENT_NETWORKS.solana.usdtAddress)
  const owner = provider.publicKey
  const ata = await getAssociatedTokenAddress(usdtMint, owner)
  const accountInfo = await connection.getTokenAccountBalance(ata).catch(() => undefined)

  return {
    raw: accountInfo?.value.amount ?? '0',
    formatted: accountInfo?.value.uiAmountString ?? '0',
  }
}

export const sendSolanaUsdt = async (provider: PhantomProvider, amount: string) => {
  if (!provider.publicKey) {
    throw new Error('Phantom wallet is not connected.')
  }

  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const usdtMint = new PublicKey(PAYMENT_NETWORKS.solana.usdtAddress)
  const treasury = new PublicKey(PAYMENT_NETWORKS.solana.treasury)
  const sender = provider.publicKey
  const decimals = PAYMENT_NETWORKS.solana.usdtDecimals
  const senderAta = await getAssociatedTokenAddress(usdtMint, sender)
  const recipientAta = await getAssociatedTokenAddress(usdtMint, treasury)

  const senderTokenAccountInfo = await connection.getAccountInfo(senderAta)
  if (!senderTokenAccountInfo) {
    throw new Error('Connected wallet does not have a USDT token account on Solana.')
  }

  const recipientTokenAccountInfo = await connection.getAccountInfo(recipientAta)
  const latestBlockhash = await connection.getLatestBlockhash('confirmed')
  const rawAmount = BigInt(Math.round(Number(amount) * 10 ** decimals))

  const transaction = new Transaction({
    feePayer: sender,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  })

  if (!recipientTokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(sender, recipientAta, treasury, usdtMint),
    )
  }

  transaction.add(
    createTransferCheckedInstruction(
      senderAta,
      usdtMint,
      recipientAta,
      sender,
      rawAmount,
      decimals,
    ),
  )

  const signedTransaction = await provider.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    preflightCommitment: 'confirmed',
  })

  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    'confirmed',
  )

  return {
    hash: signature,
  }
}
