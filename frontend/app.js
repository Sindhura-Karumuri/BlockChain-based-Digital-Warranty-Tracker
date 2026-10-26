// Frontend for WarrantyTracker: HTML + JavaScript + ethers.js (v6) + MetaMask
let provider, signer, account, contract, contractInfo;

const $ = (id) => document.getElementById(id);
const fmtDate = (ts) => new Date(Number(ts) * 1000).toLocaleDateString("en-GB").replaceAll("/", "-"); // DD-MM-YYYY
const short = (a) => a.slice(0, 6) + "..." + a.slice(-4);

function showStatus(msg, type = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status " + type;
  el.hidden = false;
}

function friendlyError(e) {
  const m = e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || String(e);
  return m.replace("execution reverted: ", "");
}

async function loadContractInfo() {
  if (contractInfo) return contractInfo;
  const res = await fetch("contract.json", { cache: "no-store" });
  if (!res.ok) throw new Error("contract.json not found. Run the deploy script first (see README).");
  contractInfo = await res.json();
  return contractInfo;
}

async function connect() {
  try {
    if (!window.ethereum) throw new Error("MetaMask not found. Please install the MetaMask extension.");
    const info = await loadContractInfo();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== info.chainId)
      throw new Error(`Wrong network. Switch MetaMask to chain ID ${info.chainId} (current: ${net.chainId}).`);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(info.address, info.abi, signer);
    $("account").textContent = short(account);
    $("connectBtn").textContent = "Connected";
    showStatus("Wallet connected: " + account, "ok");
  } catch (e) {
    showStatus(friendlyError(e), "error");
  }
}

function requireWallet() {
  if (!contract) throw new Error("Connect MetaMask first.");
}

// SHA-256 of the invoice file, computed in the browser. Only the hash goes on-chain.
async function hashFile(file) {
  if (!file) return "";
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function addPeriod(dateStr, amount, unit) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (unit === "years") d.setUTCFullYear(d.getUTCFullYear() + amount);
  else d.setUTCMonth(d.getUTCMonth() + amount);
  return Math.floor(d.getTime() / 1000);
}

// Module 1: Product Registration
async function registerWarranty() {
  const btn = $("registerBtn");
  try {
    requireWallet();
    const productId = $("regProductId").value.trim();
    const name = $("regName").value.trim();
    const customer = $("regCustomer").value.trim();
    const purchase = $("regPurchase").value;
    const period = parseInt($("regPeriod").value, 10);
    if (!productId || !name || !purchase || !period) throw new Error("Please fill all fields.");
    if (!ethers.isAddress(customer)) throw new Error("Invalid customer wallet address.");

    const purchaseTs = Math.floor(new Date(purchase + "T00:00:00Z").getTime() / 1000);
    const expiryTs = addPeriod(purchase, period, $("regUnit").value);
    const docHash = await hashFile($("regFile").files[0]);

    btn.disabled = true;
    showStatus("Waiting for MetaMask confirmation...");
    const tx = await contract.registerWarranty(productId, name, customer, purchaseTs, expiryTs, docHash);
    showStatus("Transaction sent. Waiting for confirmation... " + tx.hash);
    await tx.wait();
    showStatus(`Warranty registered for ${productId}. Expiry: ${fmtDate(expiryTs)}`, "ok");
  } catch (e) {
    showStatus(friendlyError(e), "error");
  } finally {
    btn.disabled = false;
  }
}

// Modules 2 and 3: Verification and Status
async function verifyWarranty() {
  const out = $("verifyResult");
  out.hidden = true;
  try {
    requireWallet();
    const productId = $("verProductId").value.trim();
    if (!productId) throw new Error("Enter a Product ID.");
    const [w, status, history] = await Promise.all([
      contract.getWarranty(productId),
      contract.verifyWarranty(productId),
      contract.getOwnershipHistory(productId),
    ]);
    const cls = status === "ACTIVE" ? "active" : "expired";
    out.innerHTML = `
      <dl>
        <dt>Product ID</dt><dd></dd>
        <dt>Product</dt><dd></dd>
        <dt>Record</dt><dd>Genuine (found on blockchain)</dd>
        <dt>Status</dt><dd><span class="badge ${cls}">${status}</span></dd>
        <dt>Purchase Date</dt><dd>${fmtDate(w.purchaseDate)}</dd>
        <dt>Expiry Date</dt><dd>${fmtDate(w.expiryDate)}</dd>
        <dt>Current Owner</dt><dd>${w.owner}</dd>
        <dt>Invoice Hash</dt><dd></dd>
        <dt>Owner History</dt><dd></dd>
      </dl>`;
    // set text safely (avoid injecting user-controlled strings as HTML)
    const dds = out.querySelectorAll("dd");
    dds[0].textContent = w.productId;
    dds[1].textContent = w.productName;
    dds[7].textContent = w.documentHash || "-";
    dds[8].textContent = history.map(short).join("  ->  ");
    out.hidden = false;
    $("status").hidden = true;
  } catch (e) {
    showStatus(friendlyError(e) === "Warranty not found" ? "No record found: not genuine or not registered." : friendlyError(e), "error");
  }
}

// Module 4: Ownership Transfer
async function transferOwnership() {
  const btn = $("transferBtn");
  try {
    requireWallet();
    const productId = $("trProductId").value.trim();
    const newOwner = $("trNewOwner").value.trim();
    if (!productId) throw new Error("Enter a Product ID.");
    if (!ethers.isAddress(newOwner)) throw new Error("Invalid new owner address.");
    btn.disabled = true;
    showStatus("Waiting for MetaMask confirmation...");
    const tx = await contract.transferOwnership(productId, newOwner);
    await tx.wait();
    showStatus(`Ownership of ${productId} transferred to ${newOwner}`, "ok");
  } catch (e) {
    showStatus(friendlyError(e), "error");
  } finally {
    btn.disabled = false;
  }
}

// UI wiring
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== t.dataset.tab));
    $("status").hidden = true;
  })
);
$("connectBtn").addEventListener("click", connect);
$("registerBtn").addEventListener("click", registerWarranty);
$("verifyBtn").addEventListener("click", verifyWarranty);
$("transferBtn").addEventListener("click", transferOwnership);
if (window.ethereum) window.ethereum.on?.("accountsChanged", () => location.reload());
