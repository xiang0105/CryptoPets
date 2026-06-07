// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract crypto_pets {
    address public owner;
    uint public petId;

    struct petAttribute {
        uint petId;
        string petName;
        uint8 petIv;
        uint8 petSkin;
    }
    mapping ( address => mapping ( uint => petAttribute)) public ownerToPets;

    constructor() {
        owner = msg.sender;
        petId = 0;
    }
    
    function addPet(string memory petName, address to, uint8 _petIv) public returns ( bool ) {
        require(to != address(0), "can not find to");
        require(msg.sender == owner, "you are not owner");
        petId = petId + 1; 
        ownerToPets[to][petId] = petAttribute(petId, petName, _petIv, 0x00);
        return true; 
    }
    
    function getPet(uint _petId) public view returns (petAttribute memory) {
        return ownerToPets[msg.sender][_petId];
    }
    
    function getTotalPet() public view returns (uint) {
        return petId;
    }
    
    function getUserPetId(address who) public view returns (uint[] memory) {
        uint[] memory myPets = new uint[](petId);
        uint counter = 0;
        
        for (uint i = 1; i <= petId; i++) {
            if (ownerToPets[who][i].petId != 0) {
               myPets[counter] = ownerToPets[who][i].petId;
               counter ++;
            }
        }
        uint[] memory result = new uint[](counter);

        for (uint i = 0; i < counter; i++) {
            result[i] = myPets[i];
        }
        return result;
    }
    
    function getPetAttribute(uint _petId) public view returns (uint, string memory, uint8, uint8) {
        require(ownerToPets[msg.sender][_petId].petId != 0, "You don't have any pet");
        return (
            ownerToPets[msg.sender][_petId].petId,
            ownerToPets[msg.sender][_petId].petName,
            ownerToPets[msg.sender][_petId].petIv,
            ownerToPets[msg.sender][_petId].petSkin
        );
    }
    function addCloth(uint8 clothId, address to, uint _petId) public returns (bool){
        require(clothId <= 7,"more than cloth number");
        require(msg.sender == owner);
        require(ownerToPets[to][_petId].petId != 0, "Target pet does not exist");
        ownerToPets[to][_petId].petSkin |= (uint8(1) << clothId);
        return true;
    }
    function sellCloth(uint8 clothId, address from, address to, uint fromPetId, uint toPetId) public returns (bool){
        require(ownerToPets[from][fromPetId].petId != 0,"some from warring");
        require(ownerToPets[to][toPetId].petId != 0,"some to warring");
        require((ownerToPets[from][fromPetId].petSkin & (uint8(1) << clothId)) != 0x00,"from have not cloth");
        require((ownerToPets[to][toPetId].petSkin & (uint8(1) << clothId)) == 0);
        ownerToPets[from][fromPetId].petSkin &= ~(uint8(1) << clothId); 
        ownerToPets[to][toPetId].petSkin |= (uint8(1) << clothId);
        return true;
    } 
}