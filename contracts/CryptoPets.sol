// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IERC165 {
    // ERC-165：讓外部工具或其他合約可以詢問本合約支援哪些標準介面。
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721Receiver {
    // ERC-721 safe transfer 接收檢查。
    // 當 NFT 被 safeTransferFrom 轉到合約地址時，接收方必須回傳指定 selector，
    // 否則轉帳會失敗，避免 NFT 被送進不會處理 NFT 的合約中。
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

/// @title CryptoPets
/// @notice 保留原草稿「玩家地址底下有寵物資料」的概念，並補上最小 ERC-721 與 pet 買賣能力。
/// @dev 本合約刻意不加入 tokenURI、經驗值、等級、前端資料欄位、手續費或拍賣。
contract CryptoPets is IERC165 {
    // ERC-721 core interface id：ownerOf、balanceOf、approve、transferFrom、safeTransferFrom 等。
    bytes4 private constant ERC721_INTERFACE_ID = 0x80ac58cd;

    // 合約管理者。維持原草稿概念：只有部署者可以建立 pet、發放 cloth。
    address public owner;
    // 全域 pet 流水號，同時作為 ERC-721 tokenId。
    uint256 public petId;

    // 原草稿的寵物資料結構。
    // petIv、petLevel 與 petSkin 維持簡單數值概念；petSkin 使用 8-bit bitmask 表示最多 8 件 cloth。
    struct PetAttribute {
        uint256 petId;
        string petName;
        uint8 petIv;
        uint256 petLevel;
        uint8 petSkin;
    }

    // Pet 掛賣資料。Pet listing 不 escrow NFT，只記錄 seller 與價格；
    // 買家購買時再次確認 seller 仍然持有該 pet。
    struct PetListing {
        address seller;
        uint256 price;
    }

    // 保留原草稿核心 mapping：某地址底下的某 petId 對應到 PetAttribute。
    // 轉移 pet 時會把資料從舊 owner 移到新 owner。
    mapping(address => mapping(uint256 => PetAttribute)) public ownerToPets;
    // tokenId => pet 掛賣資料。
    mapping(uint256 => PetListing) public petListings;

    // ERC-721 ownership：tokenId => 目前持有人。
    mapping(uint256 => address) private _petOwners;
    // ERC-721 balance：owner => 持有 pet 數量。
    mapping(address => uint256) private _petBalances;
    // ERC-721 單一 token 授權：tokenId => approved address。
    mapping(uint256 => address) private _petApprovals;
    // ERC-721 operator approval：owner => operator => approved。
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ERC-721 標準事件。
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    // 最小 pet 交易功能使用的事件。
    event PetLevelUpdated(uint256 indexed tokenId, uint256 level);
    event PetListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event PetListingCanceled(uint256 indexed tokenId);
    event PetBought(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);

    // 簡單 owner 權限，不引入 AccessControl 或多角色系統。
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        // 部署者就是唯一管理者。
        owner = msg.sender;
    }

    /// @notice 回報本合約支援 ERC-165 與 ERC-721 core。
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == ERC721_INTERFACE_ID;
    }

    /// @notice 建立一隻新寵物，同時 mint 一個 ERC-721 pet token。
    /// @dev 只有 owner 可建立；petId 自動遞增並作為 tokenId。
    function addPet(string memory petName, address to, uint8 _petIv) public onlyOwner returns (bool) {
        require(to != address(0), "zero address");

        // 先建立 ERC-721 ownership，再把原草稿的 PetAttribute 掛到持有人底下。
        petId += 1;
        _petOwners[petId] = to;
        _petBalances[to] += 1;
        ownerToPets[to][petId] = PetAttribute(petId, petName, _petIv, 1, 0);

        // ERC-721 mint 標準事件：from 為 0 address。
        emit Transfer(address(0), to, petId);
        return true;
    }

    /// @notice 取得呼叫者自己底下的某隻寵物資料。
    /// @dev 維持原草稿行為：只能用 msg.sender 查自己的 ownerToPets。
    function getPet(uint256 _petId) public view returns (PetAttribute memory) {
        return ownerToPets[msg.sender][_petId];
    }

    /// @notice 回傳目前已建立過的 pet 總數。
    function getTotalPet() public view returns (uint256) {
        return petId;
    }

    /// @notice 列出某地址目前持有的 petId。
    /// @dev 為了保留最小資料結構，這裡仍然從 1 掃到 petId；大量 pet 時不適合在鏈上交易流程中呼叫。
    function getUserPetId(address who) public view returns (uint256[] memory) {
        uint256[] memory myPets = new uint256[](petId);
        uint256 counter = 0;

        for (uint256 i = 1; i <= petId; i++) {
            if (ownerToPets[who][i].petId != 0) {
                myPets[counter] = i;
                counter++;
            }
        }

        uint256[] memory result = new uint256[](counter);
        for (uint256 i = 0; i < counter; i++) {
            result[i] = myPets[i];
        }

        return result;
    }

    /// @notice 取得呼叫者持有的 pet 完整資料。
    /// @dev 比 getPet 多了 ownership require；不是 owner 會 revert。
    function getPetAttribute(uint256 _petId) public view returns (uint256, string memory, uint8, uint256, uint8) {
        require(ownerOf(_petId) == msg.sender, "not pet owner");
        PetAttribute memory pet = ownerToPets[msg.sender][_petId];
        return (pet.petId, pet.petName, pet.petIv, pet.petLevel, pet.petSkin);
    }

    /// @notice 管理者替指定 pet 加上一件 cloth。
    /// @dev clothId 為 0 到 7，存在 petSkin bitmask 中。
    function addCloth(uint8 clothId, address to, uint256 _petId) public onlyOwner returns (bool) {
        require(clothId <= 7, "cloth out of range");
        require(ownerOf(_petId) == to, "target pet missing");

        // 例如 clothId = 2 時，設定 petSkin 的第 2 個 bit。
        ownerToPets[to][_petId].petSkin |= uint8(1) << clothId;
        return true;
    }

    /// @notice 管理者設定指定 pet 的等級。
    /// @dev 這裡的 owner 指的是合約 owner，不是 pet owner；level 必須大於 0。
    function setPetLevel(uint256 _petId, uint256 level) public onlyOwner returns (bool) {
        require(level > 0, "zero level");

        address petOwner = ownerOf(_petId);
        ownerToPets[petOwner][_petId].petLevel = level;

        emit PetLevelUpdated(_petId, level);
        return true;
    }

    /// @notice 將一件 cloth 從來源 pet 轉到目標 pet。
    /// @dev 沿用原草稿 sellCloth 名稱，但此函式不處理付款；付款請用 listPet / buyPet。
    ///      呼叫者必須是來源 pet owner、單一 token approved，或 operator approved。
    function sellCloth(uint8 clothId, address from, address to, uint256 fromPetId, uint256 toPetId)
        public
        returns (bool)
    {
        require(clothId <= 7, "cloth out of range");
        require(ownerOf(fromPetId) == from, "from pet missing");
        require(ownerOf(toPetId) == to, "to pet missing");
        require(_isPetOperator(msg.sender, fromPetId), "not approved");

        // 用 bitmask 檢查來源 pet 是否有該 cloth，且目標 pet 是否尚未擁有同一件 cloth。
        uint8 clothBit = uint8(1) << clothId;
        require((ownerToPets[from][fromPetId].petSkin & clothBit) != 0, "cloth missing");
        require((ownerToPets[to][toPetId].petSkin & clothBit) == 0, "cloth exists");

        // 從來源 pet 清掉該 bit，並在目標 pet 設定該 bit。
        ownerToPets[from][fromPetId].petSkin &= ~clothBit;
        ownerToPets[to][toPetId].petSkin |= clothBit;
        return true;
    }

    /// @notice ERC-721：查詢某地址持有多少 pet NFT。
    function balanceOf(address petOwner) public view returns (uint256) {
        require(petOwner != address(0), "zero address");
        return _petBalances[petOwner];
    }

    /// @notice ERC-721：查詢某 pet tokenId 目前屬於誰。
    function ownerOf(uint256 tokenId) public view returns (address) {
        address petOwner = _petOwners[tokenId];
        require(petOwner != address(0), "missing pet");
        return petOwner;
    }

    /// @notice ERC-721：授權某地址可以轉移單一 pet token。
    function approve(address to, uint256 tokenId) public {
        address petOwner = ownerOf(tokenId);
        require(to != petOwner, "approve owner");
        require(msg.sender == petOwner || isApprovedForAll(petOwner, msg.sender), "not approved");

        _petApprovals[tokenId] = to;
        emit Approval(petOwner, to, tokenId);
    }

    /// @notice ERC-721：查詢單一 pet token 的 approved address。
    function getApproved(uint256 tokenId) public view returns (address) {
        ownerOf(tokenId);
        return _petApprovals[tokenId];
    }

    /// @notice ERC-721：設定 operator 可否管理呼叫者所有 pet。
    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice ERC-721：查詢 operator 是否被 account 授權。
    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /// @notice ERC-721：轉移 pet token。
    /// @dev 會同步搬移 ownerToPets 裡面的 PetAttribute。
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isPetOperator(msg.sender, tokenId), "not approved");
        _transferPet(from, to, tokenId);
    }

    /// @notice ERC-721：safe transfer，無附加 data。
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    /// @notice ERC-721：safe transfer，有附加 data。
    /// @dev 若 to 是合約，必須支援 IERC721Receiver。
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "unsafe receiver");
    }

    /// @notice 將 pet 掛賣，價格單位為鏈上原生幣 wei。
    /// @dev pet 不 escrow；購買時會再次檢查 seller 仍是 owner。
    function listPet(uint256 tokenId, uint256 price) external returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "not pet owner");
        require(price > 0, "zero price");

        petListings[tokenId] = PetListing(msg.sender, price);
        emit PetListed(tokenId, msg.sender, price);
        return true;
    }

    /// @notice 取消自己的 pet 掛單。
    function cancelPetListing(uint256 tokenId) external returns (bool) {
        PetListing memory listing = petListings[tokenId];
        require(listing.seller == msg.sender, "not seller");

        delete petListings[tokenId];
        emit PetListingCanceled(tokenId);
        return true;
    }

    /// @notice 以掛單價格購買 pet。
    /// @dev msg.value 必須剛好等於 price；成交後 pet 轉給買家，ETH 轉給賣家。
    function buyPet(uint256 tokenId) external payable returns (bool) {
        PetListing memory listing = petListings[tokenId];
        require(listing.price > 0, "not listed");
        require(ownerOf(tokenId) == listing.seller, "seller changed");
        require(msg.value == listing.price, "wrong price");

        // 先刪掛單再轉移與付款，避免付款過程中被重入時重複購買同一掛單。
        delete petListings[tokenId];
        _transferPet(listing.seller, msg.sender, tokenId);
        require(_checkOnERC721Received(listing.seller, msg.sender, tokenId, ""), "unsafe receiver");
        _pay(listing.seller, msg.value);

        emit PetBought(tokenId, listing.seller, msg.sender, msg.value);
        return true;
    }

    // 判斷某地址是否可以操作指定 pet token。
    // 可操作條件：是 owner、被單一 token approve，或是被 setApprovalForAll 授權。
    function _isPetOperator(address operator, uint256 tokenId) private view returns (bool) {
        address petOwner = ownerOf(tokenId);
        return operator == petOwner || getApproved(tokenId) == operator || isApprovedForAll(petOwner, operator);
    }

    // ERC-721 pet 轉移的內部實作。
    // 除了標準 ownership/balance 外，也同步搬移原草稿的 ownerToPets 資料。
    function _transferPet(address from, address to, uint256 tokenId) private {
        require(ownerOf(tokenId) == from, "wrong owner");
        require(to != address(0), "zero address");

        PetAttribute memory pet = ownerToPets[from][tokenId];
        // 轉移後清除單一 token approval。
        delete _petApprovals[tokenId];
        // 如果 pet 正在掛賣，轉移時自動取消掛單，避免 stale listing。
        if (petListings[tokenId].price > 0) {
            delete petListings[tokenId];
            emit PetListingCanceled(tokenId);
        }
        // 從舊 owner 的原草稿 mapping 移除，再放到新 owner 底下。
        delete ownerToPets[from][tokenId];

        _petBalances[from] -= 1;
        _petBalances[to] += 1;
        _petOwners[tokenId] = to;
        ownerToPets[to][tokenId] = pet;

        emit Transfer(from, to, tokenId);
    }

    // ERC-721 safe transfer 接收檢查。
    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
        private
        returns (bool)
    {
        if (to.code.length == 0) {
            return true;
        }

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }

    // 將成交款項轉給賣家。
    // 使用 call 而不是 transfer，避免 2300 gas 限制；若付款失敗則整筆交易 revert。
    function _pay(address to, uint256 amount) private {
        (bool sent,) = payable(to).call{value: amount}("");
        require(sent, "payment failed");
    }
}
