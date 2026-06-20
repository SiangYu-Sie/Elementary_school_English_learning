# Supabase 雲端資料庫串接指南

本專案預設採用 **Hybrid 雙模模式**：
*   **本機模式（預設）**：若未偵測到 Supabase 金鑰，資料將儲存於瀏覽器的 `localStorage` 中。您可以立刻註冊、登入並正常進行測驗與統計，無須任何設定。
*   **雲端模式**：只要設定環境變數，專案會自動切換為 Supabase 資料庫，支援跨裝置同步與永久儲存。

---

## 串接步驟

### 第一步：建立 Supabase 專案
1. 前往 [Supabase 官網](https://supabase.com/) 登入或註冊帳號。
2. 點擊 **New Project** 建立新專案，設定專案名稱與密碼，並選擇靠近您的伺服器地區（如 `ap-northeast-1` 東京）。

### 第二步：執行 SQL 結構指令 (Schema)
1. 在 Supabase 後台左側選單，點選 **SQL Editor**。
2. 點選 **New query** 開啟新的查詢視窗。
3. 將本專案根目錄下的 [supabase_schema.sql](file:///D:/謝翔宇/個人資料/AI/專案測試/英文單字拼音練習/supabase_schema.sql) 檔案內容全部複製，貼入編輯器中。
4. 點選右下角的 **Run** 按鈕執行。這將自動為您建立：
    *   `profiles` (使用者資訊表)
    *   `quiz_records` (測驗成績紀錄表)
    *   `word_progress` (單字學習精通度進度表)
    *   Row Level Security (RLS) 安全政策，確保學生只能讀寫自己的資料。
    *   自動觸發器 (Trigger)：每當有新使用者註冊時，會自動在 `profiles` 中建立資料。

### 第三步：設定環境變數 (.env)
1. 在本專案根目錄下，建立一個名為 `.env` 的檔案。
2. 在 Supabase 後台的 **Project Settings -> API** 中，複製 **Project URL** 與 **API Key (anon/public)**。
3. 將其寫入 `.env` 檔案中，格式如下：

```env
VITE_SUPABASE_URL=您的_Project_URL
VITE_SUPABASE_ANON_KEY=您的_Anon_Public_Key
```

### 第四步：啟動開發伺服器
重啟或執行專案：
```bash
npm run dev
```
專案在偵測到環境變數後，將會自動從本地 LocalStorage 模式，無縫切換到您的 Supabase 雲端伺服器上！

---

## 常見問題
1. **如何確認已經串接成功？**
   在網站中註冊一個新帳號，接著到 Supabase 後台的 **Table Editor -> profiles**，若看到您剛剛註冊的使用者，即代表串接成功！
