# 前端任務

前端是玩家操作介面。所有玩家、寵物、素材、遠征、市場與交易資料都必須從後端 API 取得；前端可以暫存 view model，但不能自行判定資產、發放獎勵或產生測試資料。

## 專案基礎

- [x] 建立 Vue 3 + Vite + TypeScript frontend workspace。
  - 驗收：`frontend/package.json`、`vite.config.ts`、`tsconfig*.json` 可正常 build。
- [x] 建立 Vue Router。
  - 驗收：Home、Pets、Store、Inventory 都由 router 管理。
- [x] 建立主要頁面。
  - 驗收：`HomeView`、`PetsView`、`StoreView`、`InventoryView` 都有可用畫面。
- [x] 建立全域 app shell。
  - 驗收：登入 gate、導覽列、語系切換、音樂與說明面板可運作。
- [x] 引入 `@cryptopets/game-content`。
  - 驗收：前端使用共用寵物、素材、森林、文字與 asset 定義。
- [x] 引入 `@cryptopets/shared`。
  - 驗收：前端 API wrapper 使用 shared response/request type。

## API Client 與資料來源

- [x] 建立 `src/api/client.ts`。
  - 驗收：集中處理 API base URL、JSON header、Bearer token 與錯誤碼。
- [x] 建立 `src/api/auth.ts`。
  - 驗收：封裝 nonce 與 login API，登入成功寫入 auth token。
- [x] 建立 `src/api/game.ts`。
  - 驗收：封裝 player、resources、backpack、expedition、market、transactions、friends API。
- [x] 前後端 request 參數名稱對齊 shared type。
  - 驗收：`StartExpeditionRequest`、`ClaimRewardRequest`、`ListMarketMaterialRequest`、`ListingIdRequest`、`AddFriendRequest` 都從 shared import。
- [x] 關閉 frontend-only auth。
  - 驗收：前端不再讀 `VITE_FRONTEND_ONLY_AUTH`，登入必須走後端 nonce + signature。
- [x] 移除前端本地測試資料發放。
  - 驗收：前端不再呼叫 `createStarterPets()`，也不再本地建立 starter pets。
- [x] 移除前端本地測試狀態。
  - 驗收：`frontend/src/state/testProgress.ts` 已移除，技能點與突破不會本地改資料。
- [x] 建立後端資料 view model cache。
  - 驗收：`src/data/pets.ts`、`src/data/goodies.ts` 只作為後端資料映射後的前端暫存。

## 錢包登入流程

- [x] 建立 MetaMask 連線。
  - 驗收：可透過 `eth_requestAccounts` 取得 wallet address。
- [x] 建立後端 nonce 簽名登入。
  - 驗收：前端呼叫 `/auth/nonce`，再用 `personal_sign` 簽 message，最後呼叫 `/auth/login`。
- [x] 建立 session restore。
  - 驗收：localStorage 有 token 時呼叫 `/player` 還原登入狀態。
- [ ] 補齊錢包切換帳號處理。
  - 驗收：MetaMask account changed 時清除舊狀態並要求重新登入。
- [ ] 補齊斷線與無錢包插件提示。
  - 驗收：無 MetaMask、拒絕簽名、登入失敗都有清楚提示。
- [ ] 補齊錯鏈提示。
  - 驗收：後端或錢包回報 chain id 不符時，前端顯示不可操作原因。

## 全域資料狀態

- [x] 建立 `useGameApi()`。
  - 驗收：集中管理 player、resources、backpack、friends、marketListings、transactions、activeExpedition。
- [x] 建立 query loading/error state。
  - 驗收：每個查詢都有 loading 與 error，可供頁面顯示。
- [x] 建立 mutation loading/error state。
  - 驗收：遠征、市場、好友 mutation 有 loading 與 error。
- [x] 登入後載入全量 API 資料。
  - 驗收：確認登入後呼叫 player/resources/backpack/friends/market/transactions。
- [ ] 建立全域錯誤碼轉譯。
  - 驗收：後端錯誤碼如 `AUTH_REQUIRED`、`EXPEDITION_ALREADY_ACTIVE` 可顯示使用者可讀文字。
- [ ] 補齊重新整理策略。
  - 驗收：切頁或操作後只刷新必要 API，避免重複請求。

## 遠征頁 Home

- [x] 建立森林選擇 UI。
  - 驗收：顯示 `orange`、`apple`、`snow-peach` 的名稱、難度、時間與獎勵。
- [x] 遠征開始串接後端。
  - 驗收：按開始呼叫 `POST /start-expedition`，送 shared `petIds` 與 `expeditionType`。
- [x] 遠征進度使用後端時間。
  - 驗收：畫面以後端回傳 `startedAt`、`endsAt` 計算進度，不用前端自行決定結束時間。
- [x] 領取獎勵串接後端。
  - 驗收：完成後呼叫 `POST /claim-reward`，成功才清除 active expedition。
- [x] 領獎後刷新後端資料。
  - 驗收：成功領獎後刷新 resources、backpack、transactions、player。
- [x] 遠征 full-stack E2E 通過。
  - 驗收：nonce/login/player/backpack/start/wait/claim/backpack/transactions 全流程已驗證。
- [x] 遠征 TASK 完成後才打勾。
  - 驗收：DB migration 套用且 E2E 通過後，才將本項標記完成。
- [ ] 補齊遠征錯誤訊息轉譯。
  - 驗收：未登入、已有遠征、寵物不屬於玩家、未完成領獎等錯誤有清楚提示。
- [ ] 補齊遠征 smoke/component tests。
  - 驗收：測試開始、進度、領獎、錯誤狀態。

## 寵物頁 Pets

- [x] 從後端載入寵物資料。
  - 驗收：Pets 頁呼叫 `loadPlayerProfile()`，不使用前端自建 pets。
- [x] 顯示後端回傳的寵物狀態。
  - 驗收：名稱、元素、stage、level、stats、exp 來自 `PlayerProfile.pets`。
- [x] 顯示鏈上寵物不可用狀態。
  - 驗收：`player.chain.enabled=false` 時顯示後端回報鏈上 ownership 尚未啟用。
- [x] 建立遠征隊伍選擇 UI。
  - 驗收：可選 1 至 4 隻寵物作為遠征 petIds。
- [x] 禁止本地技能升級改資料。
  - 驗收：技能升級按鈕只顯示「後端接口未開放」，不改 local state。
- [x] 禁止本地突破改資料。
  - 驗收：突破按鈕只顯示「後端接口未開放」，不改 pet stage/stats。
- [ ] 串接後端寵物升級 API。
  - 驗收：有正式 API 後，技能升級與突破由後端判定並回傳新狀態。
- [ ] 補齊 Pets 頁 component tests。
  - 驗收：測試 loading、error、empty、chain disabled、team selection。

## 背包頁 Inventory

- [x] 串接 `GET /materials/backpack`。
  - 驗收：素材列表、coins、source、syncedAt、chain meta 都從後端取得。
- [x] 顯示素材空狀態。
  - 驗收：後端回空 inventory 時顯示空背包，而不是前端補假素材。
- [x] 顯示鏈上素材不可用狀態。
  - 驗收：`backpack.chain.enabled=false` 時顯示 local-db/source 或不可用狀態。
- [x] 建立 loading/error/retry。
  - 驗收：背包 API 載入中、失敗、重試都有 UI。
- [ ] 補齊素材操作 API。
  - 驗收：使用、丟棄、全部出售等功能有後端接口後才開啟。
- [ ] 補齊 Inventory component tests。
  - 驗收：測試素材列表、空狀態、錯誤、chain disabled。

## 商店頁 Store

- [x] 串接市場列表。
  - 驗收：購買區顯示後端 `GET /market/listings` 中非自己的 active listings。
- [x] 串接玩家上架列表。
  - 驗收：overview 顯示自己的 active listings。
- [x] 串接素材上架。
  - 驗收：從背包選素材，呼叫 `POST /market/listings`，成功後刷新 market/resources/backpack/transactions。
- [x] 串接取消上架。
  - 驗收：呼叫 `POST /market/cancel-listing`，成功後刷新相關資料。
- [x] 串接購買上架。
  - 驗收：呼叫 `POST /market/buy-listing`，成功後刷新相關資料。
- [x] 交易紀錄只顯示後端資料。
  - 驗收：不再使用前端本地 transactionHistory 假紀錄。
- [x] 移除被 `v-if=false` 隱藏的測試 UI。
  - 驗收：商店 modal 不保留重複的測試區塊或重複按鈕。
- [ ] 補齊市場錯誤訊息轉譯。
  - 驗收：素材不足、金幣不足、不可買自己 listing、listing 已不存在都有清楚提示。
- [ ] 補齊 Store component tests。
  - 驗收：測試 listing、buy、list、cancel、empty、error。

## 鏈上資料狀態

- [x] 保留鏈上資料 provider 介面。
  - 驗收：`src/web3/chainData.ts` 只保留不可用 provider，不作為玩家資料來源。
- [x] 前端不直接判定 NFT ownership。
  - 驗收：寵物持有權由 `PlayerProfile.chain` 與後端 pets 回傳決定。
- [x] 前端不直接判定 Material balance。
  - 驗收：素材餘額由 `MaterialBackpack` 回傳決定。
- [ ] 接入正式鏈上同步狀態 UI。
  - 驗收：顯示同步中、最後同步時間、鏈上延遲、資料不可用原因。

## 文字與文件

- [x] 更新 help copy。
  - 驗收：說明文字不再描述 frontend-only testing flow。
- [x] 更新 starter modal copy。
  - 驗收：說明角色是後端載入，而不是前端測試發放。
- [x] 更新 frontend README。
  - 驗收：README 描述資料來源為後端 API。
- [ ] 整理中文亂碼文字。
  - 驗收：頁面與文件中的中文 copy 都是正常 UTF-8 可讀文字。

## 測試與品質

- [x] Workspace build 通過。
  - 驗收：`npm.cmd run build` 通過 frontend、backend、shared、game-content。
- [x] 遠征 full-stack E2E 通過。
  - 驗收：實際後端與 Supabase 完成 start/claim/reward/backpack/transactions。
- [ ] 補齊 component tests。
  - 驗收：核心頁面 loading/error/empty/success 狀態都有測試。
- [ ] 補齊 E2E smoke tests。
  - 驗收：登入、遠征、背包、市場核心流程可自動跑。
- [ ] 建立 PR build/review checklist。
  - 驗收：每次合併前要求 type-check、build、相關測試與手動驗收紀錄。
