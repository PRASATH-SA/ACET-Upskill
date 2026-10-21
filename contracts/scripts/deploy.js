const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("[DEPLOY] Deploying AttackEvidenceRegistry to target network...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`[DEPLOY] Deployer account: ${deployer.address}`);

  const AttackEvidenceRegistry = await hre.ethers.getContractFactory("AttackEvidenceRegistry");
  const registry = await AttackEvidenceRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log(`[DEPLOY] AttackEvidenceRegistry successfully deployed to: ${contractAddress}`);

  // Export contract deployment address for backend synchronization
  const deploymentInfo = {
    address: contractAddress,
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const outPath = path.join(__dirname, "..", "deployed-contract.json");
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`[DEPLOY] Deployment metadata saved to: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
