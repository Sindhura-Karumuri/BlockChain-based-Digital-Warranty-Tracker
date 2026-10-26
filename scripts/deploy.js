// Deploys WarrantyTracker and writes the address + ABI to frontend/contract.json
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("WarrantyTracker");
  const tracker = await Factory.deploy();
  await tracker.waitForDeployment();
  const address = await tracker.getAddress();
  const { chainId } = await hre.ethers.provider.getNetwork();

  const artifact = await hre.artifacts.readArtifact("WarrantyTracker");
  const out = path.join(__dirname, "..", "frontend", "contract.json");
  fs.writeFileSync(out, JSON.stringify({ address, chainId: Number(chainId), abi: artifact.abi }, null, 2));

  console.log("WarrantyTracker deployed to:", address);
  console.log("Chain ID:", chainId.toString());
  console.log("Saved ABI + address to", out);
  console.log("The deployer account is the admin and the first authorised seller.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
