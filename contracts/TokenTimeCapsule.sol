pragma solidity ^0.4.15;

// Provides the interface for an ERC20 token.
import './Token.sol';

// Adopted from https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/token/TokenTimelock.sol
// to make it possible to manage multiple accounts' tokens.
// This contract holds tokens sent to it and enables a beneficiary after a 
// the blockheight.
contract TokenTimeCapsule {
	// ERC20 basic token contract being held
	Token public token;

	struct Capsule {
		uint256 amount;
		uint256 releaseBlock;
	}

	mapping (address => Capsule) public beneficiaries;

	event Lock(address _benefactor, address _beneficiary, uint256 _amount, uint256 _releaseBlock);
	event Release(address _beneficiary, uint256 _amount);

	function TokenTimeCapsule(Token _token) {
		token = _token;
	}

	function lock(address _beneficiary, uint256 _amount, uint256 _releaseBlock) public returns (bool success) {
		require(takeCustody(msg.sender, _beneficiary, _amount, _releaseBlock));
		return true;
	}

	/**
	 * @notice Transfers tokens held by timelock to beneficiary.
	 */
	function release() public {
		require(beneficiaries[msg.sender].releaseBlock <= block.number);

		uint256 amount = beneficiaries[msg.sender].amount;
		delete beneficiaries[msg.sender];
		require(token.transfer(msg.sender, amount));
		Release(msg.sender, amount);
	}

	// If the token contract has an `approveAndCall` method then storing tokens in
	// the capsule can be done via one instead of two transactions. The address of
	// the beneficiary and releaseBlock have to be supplied via the _extraData bytes.
	function receiveApproval(
			address _from,
			uint256 _amount,
			address _token,
			bytes _extraData
			) public returns (bool success) {
		require(msg.sender == address(token));
		require(_amount >= 0);
		// We only care about the first 64 bytes, which should hold our address and releaseBlock.
		require(_extraData.length >= 64);

		address _beneficiary = 0x0;
		uint256 _releaseBlock = 0;
		assembly {
			// Load the raw bytes into the respective variables to avoid any sort of costly
			// conversion.
			_beneficiary := mload(add(_extraData, 0x20))
			_releaseBlock := mload(add(_extraData, 0x40))
		}
		require(_beneficiary != 0x0);
		require(takeCustody(_from, _beneficiary, _amount, _releaseBlock));

		return true;
	}

	function releaseAt(address _beneficiary) public constant returns (uint256 releaseBlock) {
		return beneficiaries[_beneficiary].releaseBlock;
	}

	function releaseOf(address _beneficiary) public constant returns (uint256 amount) {
		return beneficiaries[_beneficiary].amount;
	}

	// This takes a given amount of tokens into custody of the contract.
	function takeCustody(address _benefactor, address _beneficiary, uint256 _amount, uint256 _releaseBlock) private returns (bool success) {
		require(_releaseBlock > block.number);
		require(beneficiaries[_beneficiary].amount + _amount > beneficiaries[_beneficiary].amount);
		require(Token(token).transferFrom(_benefactor, this, _amount));

		beneficiaries[_beneficiary].amount += _amount;
		beneficiaries[_beneficiary].releaseBlock = _releaseBlock;

		Lock(_benefactor, _beneficiary, _amount, _releaseBlock);
		return true;
	}
}

