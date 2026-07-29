# BMverse Token Gateway

This project is a Vite + TypeScript dApp that lets clients:

- connect `MetaMask`, `Trust Wallet`, `Coinbase Wallet`, `Phantom`, or `TronLink`
- select one of your two target tokens
- pay with USDT on `BEP20`, `ERC20`, `TRC20`, or `Solana`

## Target tokens

- Solana token: `3euXPvCHKAPja5HHBz5SmRgcJDvbMmi9AYK3Q3TEJRUC`
- BNB Smart Chain token: `0x5A09A4e79DAA90DAd3AF97eB33fBdC54d20f8888`

## Important behavior

This MVP collects USDT payments on-chain and estimates how many target tokens the buyer should receive based on your configured rate.

By default, delivery is **manual** after payment confirmation unless you add:

- a token sale smart contract
- a backend service that verifies payment and distributes tokens automatically

## Configure before launch

1. Copy `.env.example` to `.env`
2. Replace all `REPLACE_WITH_*` treasury wallet values
3. Set token symbols, decimals, and sale rates
4. If needed, replace RPC endpoints with your own providers

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Production notes

- Trust Wallet and Coinbase Wallet support in this build depends on their injected browser extensions.
- TRC20 payment support uses TronLink-compatible browser injection.
- Automatic token fulfillment is **not** implemented in this frontend-only MVP.
- Review wallet, treasury, pricing, AML/KYC, and jurisdiction requirements before going live.
