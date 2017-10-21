var TokenTimeCapsule = artifacts.require("./TokenTimeCapsule.sol")
const TestToken = artifacts.require("./TestToken.sol")

const { wait, waitUntilBlock } = require('@digix/tempo')(web3)
const abi = require('ethereumjs-abi')
const utils = require('./utils.js')

contract('TokenTimeCapsule', function(accounts) {
	let token
	let wall

	const benefactor = accounts[0]
	const beneficiary1 = accounts[1]
	const beneficiary2 = accounts[2]
	const beneficiary3 = accounts[3]
	const beneficiary4 = accounts[4]

	beforeEach(async () => {
		token = await TestToken.deployed()
		capsule = await TokenTimeCapsule.deployed()
	})

  it("it should transfer tokens to capsule via approveAndCall", async () => {
		const block = web3.eth.blockNumber + 15
		const b = abi.rawEncode(['uint256'], [0x80]).toString('hex') + abi.rawEncode(['uint256'], [0x40]).toString('hex') + utils.padLeft(beneficiary1.slice(2), 64) + abi.rawEncode(['uint256'], [block]).toString('hex')
    await token.approveAndCall(capsule.address, 100, '0x' + b, {from: benefactor})
		assert.equal((await capsule.releaseAt(beneficiary1)).toString(), block + '', 'did not properly set releaseBlock to ' + block)
		assert.equal((await capsule.releaseOf(beneficiary1)).toString(), '100', 'did not transfer 100 tokens from into capsule')
  })

  it("it should transfer tokens to capsule via lock", async () => {
		const block = web3.eth.blockNumber + 15
		await token.approve(capsule.address, 100, {from: benefactor})
    await capsule.lock(beneficiary2, 100, block, {from: benefactor})
		assert.equal((await capsule.releaseAt(beneficiary2)).toString(), block + '', 'did not properly set releaseBlock to ' + block)
		assert.equal((await capsule.releaseOf(beneficiary2)).toString(), '100', 'did not transfer 100 tokens from into capsule')
  })

  it("it should fail to release tokens before", async () => {
    capsule.release({from: beneficiary1})
			.then(assert.fail)
			.catch((err) => { assert.isTrue(!!err) })
  })

  it("it should release tokens after the releaseBlock", async () => {
		const block = web3.eth.blockNumber + 15
		const b = abi.rawEncode(['uint256'], [0x80]).toString('hex') + abi.rawEncode(['uint256'], [0x40]).toString('hex') + utils.padLeft(beneficiary3.slice(2), 64) + abi.rawEncode(['uint256'], [block]).toString('hex')
    await token.approveAndCall(capsule.address, 100, '0x' + b, {from: benefactor})
		assert.equal((await capsule.releaseAt(beneficiary3)).toString(), block + '', 'did not properly set releaseBlock to ' + block)
		assert.equal((await capsule.releaseOf(beneficiary3)).toString(), '100', 'did not transfer 100 tokens from into capsule')
		await waitUntilBlock(1, block + 1)
    await capsule.release({from: beneficiary3})
		assert.equal((await token.balanceOf(beneficiary3)).toString(), '100', 'did not release 100 tokens from capsule')
  })

  it("it should do nothing on second release call", async () => {
		const block = web3.eth.blockNumber + 15
		const b = abi.rawEncode(['uint256'], [0x80]).toString('hex') + abi.rawEncode(['uint256'], [0x40]).toString('hex') + utils.padLeft(beneficiary4.slice(2), 64) + abi.rawEncode(['uint256'], [block]).toString('hex')
    await token.approveAndCall(capsule.address, 100, '0x' + b, {from: benefactor})
		assert.equal((await capsule.releaseAt(beneficiary4)).toString(), block + '', 'did not properly set releaseBlock to ' + block)
		assert.equal((await capsule.releaseOf(beneficiary4)).toString(), '100', 'did not transfer 100 tokens from into capsule')
		await waitUntilBlock(1, block + 1)
    await capsule.release({from: beneficiary4})
		assert.equal((await token.balanceOf(beneficiary4)).toString(), '100', 'did not release 100 tokens from capsule')
    await capsule.release({from: beneficiary4})
		assert.equal((await token.balanceOf(beneficiary4)).toString(), '100', 'did not keep same balance after second release')
  })
})
