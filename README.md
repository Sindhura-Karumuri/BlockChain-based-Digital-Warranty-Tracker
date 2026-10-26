# Blockchain-Based Digital Warranty Tracker

A decentralized application that securely records and verifies product warranty information, so customers and service centers can check warranty validity and ownership history.

**Author:** K.M.S.L. Sindhura (23501A0565) · B.Tech CSE · PVP Siddhartha Institute of Technology
**Course:** Blockchain Technology (23CS4701B) · Guide: Mr. A. Prashant

## Problem

Customers lose bills and warranty cards, forget expiry dates, and can present fake or modified warranty documents. Service centers must verify warranties, and transferring a warranty on resale is inconvenient.

## Solution

Important warranty information is stored through a smart contract as a tamper-resistant, auditable blockchain record. The full invoice and personal data stay **off-chain**; only a hash (SHA-256 of the invoice) is stored on-chain.

| Module | Contract function | Who |
|---|---|---|
| 1. Product Registration | `registerWarranty()` | Authorised seller |
| 2. Warranty Verification | `getWarranty()` | Customer / service center |
| 3. Warranty Status | `verifyWarranty()` → `ACTIVE` / `EXPIRED` | Customer / service center |
| 4. Ownership Transfer | `transferOwnership()`, `getOwnershipHistory()` | Current owner |

## Tech stack

Solidity 0.8.19 · Hardhat (compile / test / deploy; works with Ganache too) · ethers.js v6 · MetaMask · HTML, CSS, JavaScript (no backend needed)

## Project structure

```
contracts/WarrantyTracker.sol   Smart contract
test/WarrantyTracker.test.js    Hardhat tests (10 tests)
scripts/deploy.js               Deploys and writes frontend/contract.json
frontend/                       index.html, style.css, app.js
hardhat.config.js               Networks: localhost (8545), ganache (7545)
```

## Setup

Requirements: Node.js 18+ and the MetaMask browser extension.

```bash
git clone https://github.com/Sindhura-Karumuri/BlockChain-based-Digital-Warranty-Tracker.git
cd BlockChain-based-Digital-Warranty-Tracker
npm install
npx hardhat compile
npx hardhat test
```

## Run locally

**Option A: Hardhat node**

```bash
# terminal 1
npx hardhat node                # prints 20 test accounts with private keys

# terminal 2
npm run deploy:local            # writes frontend/contract.json
npm run serve                   # http://localhost:3000
```

**Option B: Ganache** (GUI on port 7545, or `ganache` CLI)

```bash
npm run deploy:ganache
npm run serve
```
If you use the Ganache CLI on port 8545, change the `ganache` URL in `hardhat.config.js`.

### MetaMask setup

1. Add a network: RPC URL `http://127.0.0.1:8545` (Hardhat, chain ID `31337`) or `http://127.0.0.1:7545` (Ganache GUI; check its chain ID, commonly `1337`).
2. Import test accounts using the private keys printed by Hardhat or shown in Ganache. **Use test accounts only; never import a real wallet key.**
3. The account that deployed the contract (account #0) is the admin and the first authorised seller.

## Demo (Ravi's laptop)

1. **Seller (account #0)** → *Seller Dashboard*: Product ID `LAP123456`, name `Dell Laptop`, customer = Ravi's address, purchase date `10-09-2026`, warranty `2 Years` → Register.
2. **Anyone** → *Verify Warranty*: `LAP123456` → shows Genuine, ACTIVE, purchase date, expiry `10-09-2028`, owner Ravi.
3. **Ravi** (switch MetaMask account) → *Transfer Ownership*: `LAP123456` → Priya's address.
4. Verify again: owner is Priya and the history shows Ravi → Priya.

To authorise more sellers, call `addSeller(address)` as admin (Hardhat console):
```bash
npx hardhat console --network localhost
> const t = await ethers.getContractAt("WarrantyTracker", "<address>")
> await t.addSeller("0x...")
```

## Testnet deployment (optional)

Add a network to `hardhat.config.js` with an RPC URL and a private key loaded from an `.env` file (never commit `.env`), then run `npx hardhat run scripts/deploy.js --network <name>`. Public networks charge transaction fees.

## Limitations

- Blockchain cannot prove that the information entered initially is truthful; sellers must be trusted/authorised.
- Public blockchain transactions can have fees; users need a wallet.
- Do not store personal information on-chain.
- Real manufacturers would need to integrate their systems.
- This is an academic prototype and has not been security audited.

## Future enhancements

QR code on product/invoice · mobile app · expiry notifications · manufacturer APIs · AI invoice extraction · IoT-based registration · multi-manufacturer support

## License

MIT
