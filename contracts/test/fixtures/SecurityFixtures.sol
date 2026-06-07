// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface ICryptoPetsForFixture {
    function buyPet(uint256 tokenId) external payable returns (bool);
}

// 故意不實作 IERC721Receiver。
// 測試用途：證明 buyPet 目前會把 pet 轉進這種合約，導致該 pet 可能卡住。
contract NonReceiverPetBuyer {
    function buyPet(address pets, uint256 tokenId) external payable returns (bool) {
        return ICryptoPetsForFixture(pets).buyPet{value: msg.value}(tokenId);
    }
}
