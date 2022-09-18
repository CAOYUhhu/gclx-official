const hre = require("hardhat");

async function main() {

  const Test = await hre.ethers.getContractFactory("test");
  const test = await Test.deploy('ipfs://QmbyUfWA5fuedutDAJ5CPs4ujVAfhPhn2Hi1URhAPwYJM7/');

  await test.deployed();

  console.log("test.sol deployed to:", test.address);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
