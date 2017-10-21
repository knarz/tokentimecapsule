var ConvertLib = artifacts.require("./ConvertLib.sol");
var TokenTimeCapsule = artifacts.require("./TokenTimeCapsule.sol");
var TestToken = artifacts.require("./TestToken.sol");

module.exports = function(deployer, network) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, TokenTimeCapsule);
	if (network !== "live") {
		deployer.deploy(TestToken).then(() => { return deployer.deploy(TokenTimeCapsule, TestToken.address)});
	} else {
		deployer.deploy(TokenTimeCapsule);
	}
};
