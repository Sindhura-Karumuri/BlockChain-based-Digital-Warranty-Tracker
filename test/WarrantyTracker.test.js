const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WarrantyTracker", function () {
  const PRODUCT_ID = "LAP123456";
  let tracker, admin, seller, ravi, priya, stranger;
  let purchaseDate, expiryDate;

  beforeEach(async function () {
    [admin, seller, ravi, priya, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("WarrantyTracker");
    tracker = await Factory.deploy();
    await tracker.waitForDeployment();
    await tracker.addSeller(seller.address);

    purchaseDate = await time.latest();
    expiryDate = purchaseDate + 2 * 365 * 24 * 60 * 60; // about 2 years
  });

  async function register(id = PRODUCT_ID) {
    return tracker
      .connect(seller)
      .registerWarranty(id, "Dell Laptop", ravi.address, purchaseDate, expiryDate, "QmInvoiceHash");
  }

  describe("Module 1: Product Registration", function () {
    it("lets an authorised seller register a warranty", async function () {
      await expect(register())
        .to.emit(tracker, "WarrantyRegistered")
        .withArgs(PRODUCT_ID, ravi.address, expiryDate);
      const w = await tracker.getWarranty(PRODUCT_ID);
      expect(w.productName).to.equal("Dell Laptop");
      expect(w.owner).to.equal(ravi.address);
      expect(w.expiryDate).to.equal(expiryDate);
    });

    it("rejects a non-seller", async function () {
      await expect(
        tracker.connect(stranger).registerWarranty(PRODUCT_ID, "X", ravi.address, purchaseDate, expiryDate, "")
      ).to.be.revertedWith("Not an authorised seller");
    });

    it("rejects a duplicate Product ID", async function () {
      await register();
      await expect(register()).to.be.revertedWith("Product already registered");
    });

    it("rejects an invalid warranty period", async function () {
      await expect(
        tracker.connect(seller).registerWarranty(PRODUCT_ID, "X", ravi.address, expiryDate, purchaseDate, "")
      ).to.be.revertedWith("Invalid warranty period");
    });
  });

  describe("Modules 2 and 3: Verification and Status", function () {
    it("reports ACTIVE before expiry and EXPIRED after", async function () {
      await register();
      expect(await tracker.verifyWarranty(PRODUCT_ID)).to.equal("ACTIVE");
      await time.increaseTo(expiryDate + 1);
      expect(await tracker.verifyWarranty(PRODUCT_ID)).to.equal("EXPIRED");
    });

    it("reverts for an unknown product", async function () {
      await expect(tracker.verifyWarranty("NOPE")).to.be.revertedWith("Warranty not found");
      expect(await tracker.isRegistered("NOPE")).to.equal(false);
    });
  });

  describe("Module 4: Ownership Transfer", function () {
    beforeEach(register);

    it("transfers from Ravi to Priya and keeps history", async function () {
      await expect(tracker.connect(ravi).transferOwnership(PRODUCT_ID, priya.address))
        .to.emit(tracker, "OwnershipTransferred")
        .withArgs(PRODUCT_ID, ravi.address, priya.address);
      expect((await tracker.getWarranty(PRODUCT_ID)).owner).to.equal(priya.address);
      expect(await tracker.getOwnershipHistory(PRODUCT_ID)).to.deep.equal([ravi.address, priya.address]);
    });

    it("rejects a transfer by a non-owner", async function () {
      await expect(tracker.connect(stranger).transferOwnership(PRODUCT_ID, priya.address)).to.be.revertedWith(
        "Not the owner"
      );
    });

    it("rejects transfer to zero address or self", async function () {
      await expect(
        tracker.connect(ravi).transferOwnership(PRODUCT_ID, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
      await expect(tracker.connect(ravi).transferOwnership(PRODUCT_ID, ravi.address)).to.be.revertedWith(
        "Invalid new owner"
      );
    });
  });

  describe("Seller management", function () {
    it("only admin can add or remove sellers", async function () {
      await expect(tracker.connect(stranger).addSeller(stranger.address)).to.be.revertedWith("Only admin");
      await tracker.removeSeller(seller.address);
      await expect(register()).to.be.revertedWith("Not an authorised seller");
    });
  });
});
