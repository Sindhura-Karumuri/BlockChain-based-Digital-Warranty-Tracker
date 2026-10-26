require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    // `npx hardhat node`
    localhost: { url: "http://127.0.0.1:8545" },
    // Ganache GUI default (use `ganache` CLI default port 8545 instead if you prefer)
    ganache: { url: "http://127.0.0.1:7545" },
  },
};
