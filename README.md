# Teams AI News 自動日報系統

從 Microsoft Teams 頻道抓取 AI 新聞訊息，透過 Claude Code Skills 自動生成中文日報、雙語導讀與總覽索引。

---

## 整體流程

```
Teams 頻道
    │
    │ Step 1：抓取訊息
    ▼
archive/AI news/messages_YYYY-MM-DDT....json   ← 原始訊息 JSON
    │
    │ Step 2：生成日報（Claude Code Skill）
    ▼
docs/daily_report_YYYY-MM-DD.html       ← 每日 AI 新聞日報
    │
    │ Step 3：生成雙語導讀（Claude Code Skill）
    ▼
docs/YYYY-MM-DD/article_N.html          ← 英文必讀文章中文導讀
    │
    │ Step 4：生成總覽索引（Claude Code Skill）
    ▼
docs/index.html                         ← 所有日報的入口頁
```

---

## 目錄結構

```
ai news/
├── index.js                  # 主程式入口（CLI）
├── config.json               # 設定檔（Azure、頻道、排程）
├── package.json
│
├── src/
│   ├── auth.js               # Microsoft 身份驗證（MSAL Device Code Flow）
│   ├── graph.js              # Microsoft Graph API 呼叫
│   ├── fetcher.js            # 抓取邏輯（時間範圍、儲存）
│   └── archive.js            # 檔案儲存與狀態管理
│
├── archive/
│   └── AI news/
│       └── messages_YYYY-MM-DDT....json   # 原始訊息存檔
│
├── docs/
│   ├── index.html                         # 日報總覽（Step 4 產出）
│   ├── daily_report_YYYY-MM-DD.html       # 每日日報（Step 2 產出）
│   └── YYYY-MM-DD/
│       └── article_N.html                 # 雙語導讀（Step 3 產出）
│
└── .claude/
    └── skills/
        ├── teams-ai-daily/    # Step 2 Skill
        ├── teams-ai-translate/ # Step 3 Skill
        └── teams-ai-total/    # Step 4 Skill
```

---

## 環境設定

### 1. 安裝相依套件

```bash
npm install
```

### 2. 設定 config.json

```json
{
  "azure": {
    "clientId": "YOUR_AZURE_APP_CLIENT_ID",
    "tenantId": "YOUR_AZURE_TENANT_ID"
  },
  "channels": [
    {
      "name": "AI news",
      "teamId": "YOUR_TEAM_ID",
      "channelId": "YOUR_CHANNEL_ID"
    }
  ],
  "schedule": "0 * * * *",
  "archiveDir": "./archive"
}
```

查詢 teamId / channelId：
```bash
node index.js list-teams
node index.js list-channels <teamId>
```

### 3. 首次登入（Device Code Flow）

第一次執行時會提示至瀏覽器完成 Microsoft 帳號登入：

```
請至瀏覽器完成登入：
  網址：https://microsoft.com/devicelogin
  代碼：XXXXXXXX
```

登入後 token 會快取至 `.token_cache.json`，之後自動靜默更新。

---

## Step 1：抓取 Teams 訊息

### 指令

```bash
# 抓取今天的訊息（今天 00:00:00 至目前時間）
node index.js fetch

# 抓取指定天數前整天（N-1 天前的 00:00:00 ~ 23:59:59）
node index.js fetch <N>
```

**範例：**
```bash
node index.js fetch 2   # 抓取昨天整天（昨天 00:00:00 ~ 23:59:59）
node index.js fetch 3   # 抓取前天整天（前天 00:00:00 ~ 23:59:59）
node index.js fetch 7   # 抓取 6 天前整天
```

### 時間邏輯

| 情況 | since 起始時間 | until 結束時間 |
|------|--------------|--------------|
| 正常模式（無參數） | 今天 00:00:00 | 目前時間 |
| 歷史模式（`fetch N`） | N-1 天前 00:00:00 | N-1 天前 23:59:59 |

> 歷史模式不會更新 `.fetch_state.json`，不影響正常排程。

### 輸出

```
archive/AI news/messages_2026-03-19T03-03-48-034Z.json
```

---

## Step 2：生成每日日報

使用 Claude Code Skill `teams-ai-daily`。

### 觸發方式

在 Claude Code 中輸入：
```
/teams-ai-daily
```
或說：「產生日報」、「今天有什麼 AI 新聞」

### 處理邏輯

1. 讀取 `archive/AI news/` 下最新的 JSON 檔案
2. 過濾無效訊息（空白內容、系統通知、特定發送者）
3. 為每則訊息生成 50-100 字中文摘要與 3-5 個標籤
4. 評選最多 20 篇「程式設計師必讀」文章
5. 輸出含標籤篩選功能的互動式 HTML

### 輸出

```
docs/daily_report_2026-03-19.html
```

**內容包含：**
- 程式設計師必讀區塊（⭐ 最多 20 篇，依重要性排序）
- 所有訊息卡片（含標籤）
- 標籤篩選列（點擊即時過濾）
- 閱讀原文連結

---

## Step 3：生成雙語導讀

使用 Claude Code Skill `teams-ai-translate`。

### 觸發方式

```
/teams-ai-translate
```
或說：「翻譯文章」、「生成雙語導讀」

### 處理邏輯

1. 讀取 `docs/` 下最新的日報 HTML
2. 解析必讀文章清單（`featured-list` 區塊）
3. 對每篇文章：
   - WebFetch 抓取原文
   - 判斷語言（英文才翻譯）
   - 生成核心摘要式雙語 HTML（非逐字翻譯）
4. 更新日報 HTML，加入「中文導讀 →」連結

### 失敗處理

| 情況 | 處理方式 |
|------|---------|
| Reddit 文章 | 抓取失敗，跳過 |
| 付費牆（Paywall） | 記錄跳過 |
| 中文文章 | 語言判定後跳過 |
| 404/500 | 記錄頁面錯誤 |

### 輸出

```
docs/2026-03-19/article_1.html
docs/2026-03-19/article_2.html
...
```

每篇含：
- 英中雙語技術術語標注（紫色）
- 核心摘要 / 關鍵要點 / 對程式設計師的意義
- 返回日報連結

---

## Step 4：生成日報總覽索引

使用 Claude Code Skill `teams-ai-total`。

### 觸發方式

```
/teams-ai-total
```
或說：「產生索引」、「列出日報」

### 處理邏輯

1. 掃描 `docs/` 下所有 `daily_report_*.html`
2. 從每份日報提取統計數字（訊息數、必讀數、已翻譯數）
3. 依日期降序排列，最新在最上方
4. 完整重寫 `index.html`

### 輸出

```
docs/index.html
```

---

## 完整日常操作流程

```bash
# 1. 抓取今天的 Teams 訊息
node index.js fetch

# 2. 在 Claude Code 中生成日報
/teams-ai-daily

# 3. 翻譯必讀英文文章
/teams-ai-translate

# 4. 更新總覽索引
/teams-ai-total

# 5. 在瀏覽器開啟查看
open docs/index.html
```

### 補抓歷史資料

```bash
# 補抓昨天整天
node index.js fetch 2

# 補抓更早的歷史
node index.js fetch 3   # 前天整天
node index.js fetch 7   # 6 天前整天
```

---

## 核心模組說明

### `src/auth.js`
Microsoft 身份驗證。優先讀取 `.access_token` 靜態 token；否則使用 MSAL 靜默更新或 Device Code Flow 互動登入。

所需權限：
- `ChannelMessage.Read.All`
- `Team.ReadBasic.All`

### `src/graph.js`
封裝 Microsoft Graph API（beta）。支援分頁自動翻頁（`@odata.nextLink`），以 `lastModifiedDateTime` 過濾新訊息。

### `src/fetcher.js`
核心抓取邏輯。正常模式抓取今天 00:00:00 至目前時間；歷史模式（`fetch N`）抓取 N-1 天前整天。結束時間以 client-side 過濾實作。

### `src/archive.js`
訊息儲存與狀態管理。`saveMessages()` 支援自訂 `fileDate` 讓歷史模式使用正確的檔名時間戳記。狀態檔 `.fetch_state.json` 記錄各頻道最後抓取時間。

---

## 注意事項

- **Token 快取**：`.token_cache.json` 與 `.access_token` 含敏感資訊，已加入 `.gitignore`
- **訊息過濾**：自動排除 `Claudia Zhou 周家芸` 的訊息（bot/系統帳號）
- **大型 JSON**：原始訊息 JSON 可能超過 256KB，處理時需使用 Node.js 直接讀取而非文字編輯器
- **Reddit 限制**：WebFetch 無法抓取 Reddit，相關文章自動跳過翻譯
