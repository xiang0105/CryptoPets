// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IERC165 {
    // ERC-165：讓外部工具或其他合約可以詢問本合約支援哪些標準介面。
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC1155Receiver is IERC165 {
    // ERC-1155 單筆素材 safe transfer 接收檢查。
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data)
        external
        returns (bytes4);

    // ERC-1155 批次素材 safe transfer 接收檢查。
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data)
        external
        returns (bytes4);
}

/// @title CryptoMaterials
/// @notice 最小 ERC-1155 素材合約，負責可堆疊素材的儲存、轉移與買賣。
/// @dev 本合約刻意不加入 URI 管理、素材名稱、手續費、拍賣或遊戲消耗規則。
contract CryptoMaterials is IERC165 {
    // ERC-1155 core interface id：balanceOf(address,id)、safeTransferFrom、safeBatchTransferFrom 等。
    bytes4 private constant ERC1155_INTERFACE_ID = 0xd9b67a26;

    // 合約管理者。只有部署者可以鑄造 material。
    address public owner;
    // 全域 material 掛單流水號。
    uint256 public materialListingId;

    // Material 掛賣資料。Material listing 會先把素材 escrow 到本合約，
    // 避免賣家掛單後又把素材轉走。
    struct MaterialListing {
        address seller;
        uint256 materialId;
        uint256 amount;
        uint256 price;
        bool active;
    }

    // listingId => material 掛賣資料。
    mapping(uint256 => MaterialListing) public materialListings;

    // ERC-1155 material balance：materialId => owner => amount。
    mapping(uint256 => mapping(address => uint256)) private _materialBalances;
    // ERC-1155 operator approval：owner => operator => approved。
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ERC-1155 標準事件。
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    // 最小素材交易功能使用的事件。
    event MaterialListed(uint256 indexed listingId, address indexed seller, uint256 indexed materialId, uint256 amount, uint256 price);
    event MaterialListingCanceled(uint256 indexed listingId);
    event MaterialBought(uint256 indexed listingId, address indexed seller, address indexed buyer, uint256 materialId, uint256 amount, uint256 price);

    // 簡單 owner 權限，不引入 AccessControl 或多角色系統。
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        // 部署者就是唯一管理者。
        owner = msg.sender;
    }

    /// @notice 回報本合約支援 ERC-165 與 ERC-1155 core。
    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == ERC1155_INTERFACE_ID;
    }

    /// @notice 鑄造 material 給指定地址。
    /// @dev material 是 ERC-1155 可堆疊素材；materialId 由呼叫端自行定義。
    ///      這個函式保留作為 ERC-1155 語意上的 mint，實際邏輯與 increaseMaterial 相同。
    function mintMaterial(address to, uint256 materialId, uint256 amount) external onlyOwner returns (bool) {
        _increaseMaterial(to, materialId, amount);
        return true;
    }

    /// @notice 管理者增加指定地址的 material 數量。
    /// @dev 只有合約 owner 可以操作；等同於 mint 指定 material。
    function increaseMaterial(address to, uint256 materialId, uint256 amount) external onlyOwner returns (bool) {
        _increaseMaterial(to, materialId, amount);
        return true;
    }

    /// @notice 管理者減少指定地址的 material 數量。
    /// @dev 只有合約 owner 可以操作；會發出 ERC-1155 burn 語意的 TransferSingle，to 為 0 address。
    function decreaseMaterial(address from, uint256 materialId, uint256 amount) external onlyOwner returns (bool) {
        require(from != address(0), "zero address");
        require(from != address(this), "escrow protected");
        require(amount > 0, "zero amount");

        uint256 fromBalance = _materialBalances[materialId][from];
        require(fromBalance >= amount, "not enough material");

        _materialBalances[materialId][from] = fromBalance - amount;
        emit TransferSingle(msg.sender, from, address(0), materialId, amount);
        return true;
    }

    function _increaseMaterial(address to, uint256 materialId, uint256 amount) private {
        require(to != address(0), "zero address");
        require(amount > 0, "zero amount");

        _materialBalances[materialId][to] += amount;
        // ERC-1155 mint 標準事件：from 為 0 address。
        emit TransferSingle(msg.sender, address(0), to, materialId, amount);
        // 如果素材被 mint 到合約地址，接收方必須能處理 ERC-1155。
        require(_checkOnERC1155Received(address(0), to, materialId, amount, ""), "unsafe receiver");
    }

    /// @notice ERC-1155：查詢某地址持有某 materialId 的數量。
    function balanceOf(address account, uint256 materialId) public view returns (uint256) {
        require(account != address(0), "zero address");
        return _materialBalances[materialId][account];
    }

    /// @notice ERC-1155：批次查詢多個 account/materialId 的餘額。
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        public
        view
        returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    /// @notice ERC-1155：設定 operator 可否管理呼叫者所有 material。
    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice ERC-1155：查詢 operator 是否被 account 授權。
    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /// @notice ERC-1155：轉移單一 material。
    /// @dev 若 to 是合約，必須支援 IERC1155Receiver。
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "not approved");
        _safeTransferMaterial(from, to, id, amount, data);
    }

    /// @notice ERC-1155：批次轉移多種 material。
    /// @dev 這裡逐筆扣款後發出 TransferBatch，最後檢查接收方是否能接收。
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "not approved");
        require(ids.length == amounts.length, "length mismatch");
        require(to != address(0), "zero address");

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 fromBalance = _materialBalances[id][from];
            require(fromBalance >= amount, "not enough material");

            _materialBalances[id][from] = fromBalance - amount;
            _materialBalances[id][to] += amount;
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);
        require(_checkOnERC1155BatchReceived(from, to, ids, amounts, data), "unsafe receiver");
    }

    /// @notice 掛賣 material，價格單位為鏈上原生幣 wei。
    /// @dev material 會先轉進本合約 escrow，確保買家購買時素材一定存在。
    function listMaterial(uint256 materialId, uint256 amount, uint256 price) external returns (uint256) {
        require(amount > 0, "zero amount");
        require(price > 0, "zero price");

        // 內部 escrow 不做 receiver callback，因為接收方就是本合約自己。
        _transferMaterial(msg.sender, address(this), materialId, amount);

        materialListingId += 1;
        materialListings[materialListingId] = MaterialListing(msg.sender, materialId, amount, price, true);

        emit MaterialListed(materialListingId, msg.sender, materialId, amount, price);
        return materialListingId;
    }

    /// @notice 取消自己的 material 掛單，並把 escrow 的素材退回。
    function cancelMaterialListing(uint256 listingId) external returns (bool) {
        MaterialListing storage listing = materialListings[listingId];
        require(listing.active, "not listed");
        require(listing.seller == msg.sender, "not seller");

        listing.active = false;
        _safeTransferMaterial(address(this), listing.seller, listing.materialId, listing.amount, "");

        emit MaterialListingCanceled(listingId);
        return true;
    }

    /// @notice 以掛單價格購買 material。
    /// @dev msg.value 必須剛好等於 price；成交後素材給買家，ETH 給賣家。
    function buyMaterial(uint256 listingId) external payable returns (bool) {
        MaterialListing storage listing = materialListings[listingId];
        require(listing.active, "not listed");
        require(msg.value == listing.price, "wrong price");

        // 先把 storage 需要的值複製出來，接著關閉掛單，再做外部互動。
        address seller = listing.seller;
        uint256 materialId = listing.materialId;
        uint256 amount = listing.amount;
        uint256 price = listing.price;

        listing.active = false;
        _safeTransferMaterial(address(this), msg.sender, materialId, amount, "");
        _pay(seller, msg.value);

        emit MaterialBought(listingId, seller, msg.sender, materialId, amount, price);
        return true;
    }

    // ERC-1155 safe transfer 內部實作：先移動餘額，再檢查接收方。
    function _safeTransferMaterial(address from, address to, uint256 id, uint256 amount, bytes memory data) private {
        _transferMaterial(from, to, id, amount);
        require(_checkOnERC1155Received(from, to, id, amount, data), "unsafe receiver");
    }

    // ERC-1155 material 內部移帳。
    // 這個函式不檢查 receiver，供本合約 escrow 等內部流程使用。
    function _transferMaterial(address from, address to, uint256 id, uint256 amount) private {
        require(to != address(0), "zero address");
        uint256 fromBalance = _materialBalances[id][from];
        require(fromBalance >= amount, "not enough material");

        _materialBalances[id][from] = fromBalance - amount;
        _materialBalances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }

    // ERC-1155 單筆 safe transfer 接收檢查。
    function _checkOnERC1155Received(address from, address to, uint256 id, uint256 amount, bytes memory data)
        private
        returns (bool)
    {
        if (to.code.length == 0) {
            return true;
        }

        try IERC1155Receiver(to).onERC1155Received(msg.sender, from, id, amount, data) returns (bytes4 retval) {
            return retval == IERC1155Receiver.onERC1155Received.selector;
        } catch {
            return false;
        }
    }

    // ERC-1155 批次 safe transfer 接收檢查。
    function _checkOnERC1155BatchReceived(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length == 0) {
            return true;
        }

        try IERC1155Receiver(to).onERC1155BatchReceived(msg.sender, from, ids, amounts, data) returns (bytes4 retval) {
            return retval == IERC1155Receiver.onERC1155BatchReceived.selector;
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
