import './style.css'

import {
  APP_CONFIG,
  DEFAULT_PAYMENT_CHAIN,
  DEFAULT_TOKEN,
  PAYMENT_NETWORKS,
  TARGET_TOKENS,
  isPlaceholderAddress,
  shortenAddress,
  type PaymentChain,
  type TokenKey,
  type WalletKey,
} from './config'
import type { EvmInjectedProvider, PhantomProvider } from './global'
import {
  connectEvmWallet,
  ensureCorrectEvmChain,
  getEvmUsdtBalance,
  isEvmWallet,
  sendEvmUsdt,
} from './wallets/evm'
import { connectPhantom, getSolanaUsdtBalance, sendSolanaUsdt } from './wallets/solana'
import { connectTronWallet, getTronUsdtBalance, sendTronUsdt } from './wallets/tron'

type Notice = {
  type: 'info' | 'error' | 'success'
  text: string
}

type ActiveConnection =
  | {
      kind: 'evm'
      wallet: 'metamask' | 'trustwallet' | 'coinbase'
      address: string
      provider: EvmInjectedProvider
    }
  | {
      kind: 'solana'
      wallet: 'phantom'
      address: string
      provider: PhantomProvider
    }
  | {
      kind: 'tron'
      wallet: 'tronlink'
      address: string
    }
  | null

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('App root element was not found.')
}

const state: {
  selectedToken: TokenKey
  selectedPaymentChain: PaymentChain
  paymentAmount: string
  activeConnection: ActiveConnection
  busy: boolean
  balance: string
  notice: Notice | null
  txHash: string
} = {
  selectedToken: DEFAULT_TOKEN,
  selectedPaymentChain: DEFAULT_PAYMENT_CHAIN,
  paymentAmount: '100',
  activeConnection: null,
  busy: false,
  balance: '0',
  notice: null,
  txHash: '',
}

const walletLabels: Record<WalletKey, string> = {
  metamask: 'MetaMask',
  trustwallet: 'Trust Wallet',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
  tronlink: 'TronLink',
}

const walletDescriptions: Record<WalletKey, string> = {
  metamask: 'Injected EVM wallet for Ethereum and BNB Chain.',
  trustwallet: 'Injected Trust Wallet browser extension for EVM chains.',
  coinbase: 'Injected Coinbase Wallet browser extension for EVM chains.',
  phantom: 'Phantom extension for Solana payments.',
  tronlink: 'TronLink extension for TRC20 payments.',
}

const getSupportedWallets = (chain: PaymentChain): WalletKey[] => {
  if (chain === 'bsc' || chain === 'ethereum') {
    return ['metamask', 'trustwallet', 'coinbase']
  }

  if (chain === 'solana') {
    return ['phantom']
  }

  return ['tronlink']
}

const getSelectedNetwork = () => PAYMENT_NETWORKS[state.selectedPaymentChain]
const getSelectedToken = () => TARGET_TOKENS[state.selectedToken]

const estimateTokenAmount = () => {
  const amount = Number(state.paymentAmount)
  if (!Number.isFinite(amount) || amount <= 0) return '0'

  const token = getSelectedToken()
  return (amount * token.tokensPerUsdt).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

const isWalletCompatible = () => {
  if (!state.activeConnection) return false

  if (
    state.activeConnection.kind === 'evm' &&
    (state.selectedPaymentChain === 'bsc' || state.selectedPaymentChain === 'ethereum')
  ) {
    return true
  }

  if (state.activeConnection.kind === 'solana' && state.selectedPaymentChain === 'solana') {
    return true
  }

  return state.activeConnection.kind === 'tron' && state.selectedPaymentChain === 'tron'
}

const setNotice = (type: Notice['type'], text: string) => {
  state.notice = { type, text }
}

const resetTransactionState = () => {
  state.notice = null
  state.txHash = ''
}

const updateBalance = async () => {
  if (!state.activeConnection) {
    state.balance = '0'
    return
  }

  if (state.activeConnection.kind === 'evm') {
    const result = await getEvmUsdtBalance(
      state.activeConnection.provider,
      state.selectedPaymentChain as 'bsc' | 'ethereum',
      state.activeConnection.address,
    )
    state.balance = result.formatted
    return
  }

  if (state.activeConnection.kind === 'solana') {
    const result = await getSolanaUsdtBalance(state.activeConnection.provider)
    state.balance = result.formatted
    return
  }

  const result = await getTronUsdtBalance()
  state.balance = result.formatted
}

const explorerUrl = () => {
  if (!state.txHash) return ''
  return `${getSelectedNetwork().explorerBaseUrl}${state.txHash}`
}

const render = () => {
  const token = getSelectedToken()
  const network = getSelectedNetwork()
  const supportedWallets = getSupportedWallets(state.selectedPaymentChain)
  const canBuy =
    !state.busy &&
    isWalletCompatible() &&
    !isPlaceholderAddress(network.treasury) &&
    Number(state.paymentAmount) > 0

  root.innerHTML = `
    <div class="page-shell">
      <section class="hero-card panel">
        <div class="eyebrow">Cross-chain payment gateway</div>
        <div class="hero-grid">
          <div>
            <h1>${APP_CONFIG.brand}</h1>
            <p class="lede">
              Connect a wallet, choose one of your two target tokens, and accept USDT payments on BNB Smart Chain, Ethereum, Tron, or Solana.
            </p>
            <div class="hero-tags">
              <span>MetaMask</span>
              <span>Trust Wallet</span>
              <span>Coinbase Wallet</span>
              <span>Phantom</span>
              <span>TRC20 ready</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-row">
              <span>Selected token</span>
              <strong>${token.label}</strong>
            </div>
            <div class="summary-row">
              <span>Payment network</span>
              <strong>${network.label}</strong>
            </div>
            <div class="summary-row">
              <span>Current treasury</span>
              <strong>${shortenAddress(network.treasury)}</strong>
            </div>
            <div class="summary-row">
              <span>Settlement</span>
              <strong>${APP_CONFIG.settlementMode === 'manual' ? 'Manual fulfillment' : 'Automatic flow'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Choose token</h2>
            <p>These are the two sale assets configured in the app.</p>
          </div>
        </div>
        <div class="card-grid">
          ${Object.values(TARGET_TOKENS)
            .map(
              (item) => `
                <button class="select-card ${item.id === state.selectedToken ? 'active' : ''}" data-token="${item.id}">
                  <span class="network-pill">${PAYMENT_NETWORKS[item.chain].label}</span>
                  <strong>${item.label}</strong>
                  <span>${item.symbol}</span>
                  <small>${shortenAddress(item.address, 6)}</small>
                  <p>${item.description}</p>
                  <div class="metric">${item.tokensPerUsdt.toLocaleString()} ${item.symbol} / 1 USDT</div>
                </button>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Select payment network</h2>
            <p>Buy the selected token using USDT on the network your client prefers.</p>
          </div>
        </div>
        <div class="card-grid four">
          ${Object.values(PAYMENT_NETWORKS)
            .map(
              (item) => `
                <button class="select-card compact ${item.id === state.selectedPaymentChain ? 'active' : ''}" data-network="${item.id}">
                  <strong>${item.label}</strong>
                  <span>${item.symbol}</span>
                  <small>${shortenAddress(item.usdtAddress, 6)}</small>
                </button>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Connect wallet</h2>
            <p>The available wallets change with the selected payment network.</p>
          </div>
          ${
            state.activeConnection
              ? `<div class="connection-badge">Connected: ${walletLabels[state.activeConnection.wallet]} ${shortenAddress(state.activeConnection.address, 5)}</div>`
              : '<div class="connection-badge muted">No wallet connected</div>'
          }
        </div>
        <div class="wallet-grid">
          ${supportedWallets
            .map(
              (wallet) => `
                <button class="wallet-card" data-wallet="${wallet}" ${state.busy ? 'disabled' : ''}>
                  <strong>${walletLabels[wallet]}</strong>
                  <span>${walletDescriptions[wallet]}</span>
                </button>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="purchase-grid">
        <div class="panel">
          <div class="section-heading">
            <div>
              <h2>Purchase flow</h2>
              <p>Users pay USDT on the selected chain and the app shows the expected token amount.</p>
            </div>
          </div>

          <label class="field">
            <span>USDT amount</span>
            <input id="payment-amount" type="number" min="1" step="0.01" value="${state.paymentAmount}" />
          </label>

          <div class="stats-grid">
            <div class="stat-card">
              <span>Buyer balance</span>
              <strong>${Number(state.balance || '0').toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })} ${network.symbol}</strong>
            </div>
            <div class="stat-card">
              <span>Estimated receive</span>
              <strong>${estimateTokenAmount()} ${token.symbol}</strong>
            </div>
          </div>

          <div class="purchase-summary">
            <div><span>Paying on</span><strong>${network.label}</strong></div>
            <div><span>Buying</span><strong>${token.label}</strong></div>
            <div><span>Receiving to</span><strong>${state.activeConnection ? shortenAddress(state.activeConnection.address, 5) : 'Connect wallet first'}</strong></div>
            <div><span>Treasury</span><strong>${shortenAddress(network.treasury)}</strong></div>
          </div>

          <button id="buy-button" class="primary-button" ${canBuy ? '' : 'disabled'}>
            ${state.busy ? 'Processing transaction...' : `Pay ${state.paymentAmount || '0'} USDT`}
          </button>

          <div class="helper-list">
            <span>${APP_CONFIG.settlementMode === 'manual' ? 'Payments are collected on-chain, then token delivery is fulfilled manually or by your backend.' : 'Automatic settlement mode is selected, but you still need a delivery contract or backend for production.'}</span>
            <span>Current support contact: ${APP_CONFIG.supportHandle}</span>
          </div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <div>
              <h2>Configuration status</h2>
              <p>Replace placeholder treasury wallets before launch.</p>
            </div>
          </div>
          <div class="config-list">
            ${Object.values(PAYMENT_NETWORKS)
              .map(
                (item) => `
                  <div class="config-row ${isPlaceholderAddress(item.treasury) ? 'warning' : 'ok'}">
                    <div>
                      <strong>${item.label}</strong>
                      <span>${item.symbol}</span>
                    </div>
                    <small>${isPlaceholderAddress(item.treasury) ? 'Treasury missing' : shortenAddress(item.treasury)}</small>
                  </div>
                `,
              )
              .join('')}
          </div>
          <div class="note-box">
            <strong>Launch note</strong>
            <p>${APP_CONFIG.legalNote}</p>
          </div>
        </div>
      </section>

      ${
        state.notice
          ? `<section class="panel notice ${state.notice.type}">${state.notice.text}</section>`
          : ''
      }

      ${
        state.txHash
          ? `<section class="panel tx-box">
              <h2>Last transaction</h2>
              <p>${state.txHash}</p>
              <a href="${explorerUrl()}" target="_blank" rel="noreferrer">Open on explorer</a>
            </section>`
          : ''
      }
    </div>
  `

  root.querySelectorAll<HTMLElement>('[data-token]').forEach((element) => {
    element.addEventListener('click', () => {
      state.selectedToken = element.dataset.token as TokenKey
      resetTransactionState()
      render()
    })
  })

  root.querySelectorAll<HTMLElement>('[data-network]').forEach((element) => {
    element.addEventListener('click', () => {
      const nextChain = element.dataset.network as PaymentChain
      const currentKind = state.activeConnection?.kind
      state.selectedPaymentChain = nextChain
      state.balance = '0'
      resetTransactionState()

      if (
        (nextChain === 'bsc' || nextChain === 'ethereum') &&
        currentKind === 'evm'
      ) {
        void updateBalance().then(render).catch(() => render())
        render()
        return
      }

      if (currentKind && !isWalletCompatible()) {
        state.activeConnection = null
      }

      render()
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-wallet]').forEach((element) => {
    element.addEventListener('click', async () => {
      const wallet = element.dataset.wallet as WalletKey
      state.busy = true
      resetTransactionState()
      render()

      try {
        if (isEvmWallet(wallet)) {
          const result = await connectEvmWallet(wallet)
          await ensureCorrectEvmChain(
            result.provider,
            state.selectedPaymentChain as 'bsc' | 'ethereum',
          )
          state.activeConnection = {
            kind: 'evm',
            wallet,
            address: result.address,
            provider: result.provider,
          }
        } else if (wallet === 'phantom') {
          const result = await connectPhantom()
          state.activeConnection = {
            kind: 'solana',
            wallet,
            address: result.address,
            provider: result.provider,
          }
        } else {
          const result = await connectTronWallet()
          state.activeConnection = {
            kind: 'tron',
            wallet,
            address: result.address,
          }
        }

        await updateBalance()
        setNotice('success', `${walletLabels[wallet]} connected successfully.`)
      } catch (error) {
        state.activeConnection = null
        state.balance = '0'
        setNotice('error', error instanceof Error ? error.message : 'Wallet connection failed.')
      } finally {
        state.busy = false
        render()
      }
    })
  })

  root.querySelector<HTMLInputElement>('#payment-amount')?.addEventListener('input', (event) => {
    const target = event.currentTarget as HTMLInputElement
    state.paymentAmount = target.value
    resetTransactionState()
    render()
  })

  root.querySelector<HTMLButtonElement>('#buy-button')?.addEventListener('click', async () => {
    const amount = Number(state.paymentAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('error', 'Enter a valid USDT amount.')
      render()
      return
    }

    if (!state.activeConnection || !isWalletCompatible()) {
      setNotice('error', 'Connect a wallet that matches the selected payment network.')
      render()
      return
    }

    if (isPlaceholderAddress(getSelectedNetwork().treasury)) {
      setNotice('error', 'Treasury wallet is still a placeholder. Update the environment configuration first.')
      render()
      return
    }

    state.busy = true
    resetTransactionState()
    render()

    try {
      if (state.activeConnection.kind === 'evm') {
        const result = await sendEvmUsdt(
          state.activeConnection.provider,
          state.selectedPaymentChain as 'bsc' | 'ethereum',
          state.paymentAmount,
        )
        state.txHash = result.hash
      } else if (state.activeConnection.kind === 'solana') {
        const result = await sendSolanaUsdt(state.activeConnection.provider, state.paymentAmount)
        state.txHash = result.hash
      } else {
        const result = await sendTronUsdt(state.paymentAmount)
        state.txHash = result.hash
      }

      await updateBalance()
      setNotice(
        'success',
        `USDT payment submitted successfully. Expected delivery: ${estimateTokenAmount()} ${token.symbol}.`,
      )
    } catch (error) {
      setNotice('error', error instanceof Error ? error.message : 'Transaction failed.')
    } finally {
      state.busy = false
      render()
    }
  })
}

render()
