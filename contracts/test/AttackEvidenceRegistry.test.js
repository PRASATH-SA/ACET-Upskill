const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AttackEvidenceRegistry", function () {
  let registry;
  let owner;
  let operator;
  let unauthorized;

  beforeEach(async function () {
    [owner, operator, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AttackEvidenceRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("should deploy with owner set and authorized as operator", async function () {
    expect(await registry.owner()).to.equal(owner.address);
    expect(await registry.authorizedOperators(owner.address)).to.be.true;
  });

  it("should allow owner to authorize new operator", async function () {
    await registry.setOperator(operator.address, true);
    expect(await registry.authorizedOperators(operator.address)).to.be.true;
  });

  it("should prevent unauthorized addresses from registering evidence", async function () {
    await expect(
      registry.connect(unauthorized).registerEvidence(
        "INC-TEST-001",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "1.0",
        "1.0.0",
        "HUMAN_CONFIRMED"
      )
    ).to.be.revertedWith("AttackEvidenceRegistry: unauthorized operator");
  });

  it("should allow operator to register evidence and retrieve it", async function () {
    const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    await registry.registerEvidence("INC-TEST-001", hash, "1.0", "1.0.0", "HUMAN_CONFIRMED");

    const record = await registry.getEvidence("INC-TEST-001");
    expect(record.id).to.equal("INC-TEST-001");
    expect(record.hashDigest).to.equal(hash);
    expect(record.schemaVer).to.equal("1.0");
    expect(record.modelVer).to.equal("1.0.0");
    expect(record.status).to.equal("HUMAN_CONFIRMED");
    expect(record.submitter).to.equal(owner.address);
  });

  it("should verify evidence hash correctly", async function () {
    const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    await registry.registerEvidence("INC-TEST-002", hash, "1.0", "1.0.0", "AUTOMATED");

    const [matches, exists] = await registry.verifyEvidenceHash("INC-TEST-002", hash);
    expect(exists).to.be.true;
    expect(matches).to.be.true;

    const [wrongMatches, wrongExists] = await registry.verifyEvidenceHash("INC-TEST-002", "wronghash123");
    expect(wrongExists).to.be.true;
    expect(wrongMatches).to.be.false;

    const [notFoundMatches, notFoundExists] = await registry.verifyEvidenceHash("NON-EXISTENT", hash);
    expect(notFoundExists).to.be.false;
    expect(notFoundMatches).to.be.false;
  });

  it("should prevent duplicate registration for immutable incident IDs", async function () {
    const hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    await registry.registerEvidence("INC-TEST-003", hash, "1.0", "1.0.0", "HUMAN_CONFIRMED");

    await expect(
      registry.registerEvidence("INC-TEST-003", hash, "1.0", "1.0.0", "HUMAN_CONFIRMED")
    ).to.be.revertedWith("Evidence for this incident is already registered (immutable)");
  });
});
