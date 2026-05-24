# CryptoPets 專案說明

CryptoPets 是水豚寵物養成、遠征與素材交易遊戲。專案採 npm workspaces，分成前端、後端、遊戲內容與共用型別，讓每個部分的責任保持清楚。

## 分工

- `frontend/`：只負責畫面顯示、使用者互動、錢包連線入口、呼叫後端 API。圖片、音訊與語言字典都要從 `game-content` 取得。
- `backend/`：負責 API、驗證、資料庫讀寫、遊戲機制、遠征計算、市場交易，以及未來上鏈接口。
- `game-content/`：負責角色、素材、劇本、語言字典、圖片、音訊、地圖與品牌資源。
- `shared/`：只放前後端共用 TypeScript 型別，不放業務邏輯。

## 資料來源策略

目前上鏈尚未實作，所以玩家資產暫時以本地或資料庫資料代替。未來正式上鏈後：

- 錢包 address 代表玩家身份。
- 鏈上會提供玩家擁有哪些水豚 NFT。
- 鏈上會提供玩家身上有哪些素材或道具。
- 後端資料庫主要保存遊戲機制資料，例如商品市場、遠征紀錄、交易紀錄、好友關係、快取與索引。
- 前端永遠只向後端或 `game-content` 取資料，不直接判斷正式資產所有權。

## Env 總覽

根目錄提供 `.env.example` 作為總覽範本，但實際開發時請分別建立：

- `frontend/.env`：只放會進入瀏覽器的 `VITE_` 變數。
- `backend/.env`：放後端 secret、Supabase service role key、JWT secret、RPC key。

前端環境變數會被打包到瀏覽器，因此不能放私鑰、service role key、JWT secret 或付費 RPC secret。

## 開發指令

```bash
npm install
npm run dev:backend
npm run dev:frontend
npm run build
npm run type-check
```

預設服務：

- Frontend: `http://localhost:5400`
- Backend: `http://localhost:3400`

## 文件索引

- 整體：`README.md`、`TODO.md`、`TASK.md`
- 前端：`frontend/README.md`、`frontend/TODO.md`、`frontend/TASK.md`
- 後端：`backend/README.md`、`backend/TODO.md`、`backend/TASK.md`
- 遊戲內容：`game-content/README.md`、`game-content/TODO.md`、`game-content/TASK.md`
