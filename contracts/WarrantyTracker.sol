// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WarrantyTracker
 * @notice Blockchain-Based Digital Warranty Tracker.
 *         Stores only essential warranty data on-chain (product ID, name, dates,
 *         owner and a hash of the off-chain invoice). Personal data and the full
 *         invoice must be kept off-chain.
 *
 * Modules:
 *  1. Product Registration   -> registerWarranty()
 *  2. Warranty Verification  -> getWarranty(), verifyWarranty()
 *  3. Warranty Status        -> verifyWarranty() (ACTIVE / EXPIRED)
 *  4. Ownership Transfer     -> transferOwnership(), getOwnershipHistory()
 */
contract WarrantyTracker {
    struct Warranty {
        string productId;
        string productName;
        address owner;
        uint256 purchaseDate; // Unix timestamp (seconds)
        uint256 expiryDate;   // Unix timestamp (seconds)
        string documentHash;  // hash / IPFS CID of the invoice (kept off-chain)
        bool exists;
    }

    address public admin;
    mapping(address => bool) public sellers;
    mapping(bytes32 => Warranty) private warranties;
    mapping(bytes32 => address[]) private ownershipHistory;

    event SellerAdded(address indexed seller);
    event SellerRemoved(address indexed seller);
    event WarrantyRegistered(string productId, address indexed owner, uint256 expiryDate);
    event OwnershipTransferred(string productId, address indexed from, address indexed to);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlySeller() {
        require(sellers[msg.sender], "Not an authorised seller");
        _;
    }

    constructor() {
        admin = msg.sender;
        sellers[msg.sender] = true;
        emit SellerAdded(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Seller management
    // ---------------------------------------------------------------------
    function addSeller(address seller) external onlyAdmin {
        require(seller != address(0), "Invalid address");
        sellers[seller] = true;
        emit SellerAdded(seller);
    }

    function removeSeller(address seller) external onlyAdmin {
        require(seller != admin, "Cannot remove admin");
        sellers[seller] = false;
        emit SellerRemoved(seller);
    }

    // ---------------------------------------------------------------------
    // Module 1: Product Registration
    // ---------------------------------------------------------------------
    function registerWarranty(
        string calldata productId,
        string calldata productName,
        address customer,
        uint256 purchaseDate,
        uint256 expiryDate,
        string calldata documentHash
    ) external onlySeller {
        require(bytes(productId).length > 0, "Product ID required");
        require(bytes(productName).length > 0, "Product name required");
        require(customer != address(0), "Invalid customer");
        require(expiryDate > purchaseDate, "Invalid warranty period");

        bytes32 key = _key(productId);
        require(!warranties[key].exists, "Product already registered");

        warranties[key] = Warranty(
            productId,
            productName,
            customer,
            purchaseDate,
            expiryDate,
            documentHash,
            true
        );
        ownershipHistory[key].push(customer);

        emit WarrantyRegistered(productId, customer, expiryDate);
    }

    // ---------------------------------------------------------------------
    // Modules 2 and 3: Verification and Status
    // ---------------------------------------------------------------------
    function getWarranty(string calldata productId) external view returns (Warranty memory) {
        bytes32 key = _key(productId);
        require(warranties[key].exists, "Warranty not found");
        return warranties[key];
    }

    /// @return "ACTIVE" if the expiry date has not passed, otherwise "EXPIRED".
    function verifyWarranty(string calldata productId) external view returns (string memory) {
        bytes32 key = _key(productId);
        require(warranties[key].exists, "Warranty not found");
        return block.timestamp < warranties[key].expiryDate ? "ACTIVE" : "EXPIRED";
    }

    function isRegistered(string calldata productId) external view returns (bool) {
        return warranties[_key(productId)].exists;
    }

    // ---------------------------------------------------------------------
    // Module 4: Ownership Transfer
    // ---------------------------------------------------------------------
    function transferOwnership(string calldata productId, address newOwner) external {
        bytes32 key = _key(productId);
        Warranty storage w = warranties[key];
        require(w.exists, "Warranty not found");
        require(w.owner == msg.sender, "Not the owner");
        require(newOwner != address(0) && newOwner != msg.sender, "Invalid new owner");

        address oldOwner = w.owner;
        w.owner = newOwner;
        ownershipHistory[key].push(newOwner);

        emit OwnershipTransferred(productId, oldOwner, newOwner);
    }

    function getOwnershipHistory(string calldata productId) external view returns (address[] memory) {
        return ownershipHistory[_key(productId)];
    }

    // ---------------------------------------------------------------------
    function _key(string calldata productId) private pure returns (bytes32) {
        return keccak256(bytes(productId));
    }
}
