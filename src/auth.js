const { PublicClientApplication } = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');

const SCOPES = [
  'https://graph.microsoft.com/ChannelMessage.Read.All',
  'https://graph.microsoft.com/Team.ReadBasic.All',
  'offline_access',
];

const TOKEN_CACHE_PATH = path.join(process.cwd(), '.token_cache.json');
const ACCESS_TOKEN_PATH = path.join(process.cwd(), '.access_token');


function buildMsalApp(clientId, tenantId) {
  const cachePlugin = {
    beforeCacheAccess: async (cacheContext) => {
      if (fs.existsSync(TOKEN_CACHE_PATH)) {
        cacheContext.tokenCache.deserialize(
          fs.readFileSync(TOKEN_CACHE_PATH, 'utf-8')
        );
      }
    },
    afterCacheAccess: async (cacheContext) => {
      if (cacheContext.cacheHasChanged) {
        fs.writeFileSync(TOKEN_CACHE_PATH, cacheContext.tokenCache.serialize());
      }
    },
  };

  return new PublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
    cache: { cachePlugin },
  });
}

async function getAccessToken(clientId, tenantId) {
  // 優先讀取 .access_token 檔案
  if (fs.existsSync(ACCESS_TOKEN_PATH)) {
    const token = fs.readFileSync(ACCESS_TOKEN_PATH, 'utf-8').trim();
    if (token) return token;
  }

  const pca = buildMsalApp(clientId, tenantId);
  const tokenCache = pca.getTokenCache();

  // 嘗試用已快取的帳號靜默取得 token
  const accounts = await tokenCache.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({
        scopes: SCOPES,
        account: accounts[0],
      });
      return result.accessToken;
    } catch {
      // silent 失敗，改走 device code flow
    }
  }

  // Device Code Flow 互動登入
  const deviceCodeRequest = {
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      console.log('\n請至瀏覽器完成登入：');
      console.log(`  網址：${response.verificationUri}`);
      console.log(`  代碼：${response.userCode}`);
      console.log();
    },
  };

  const result = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
  return result.accessToken;
}

module.exports = { getAccessToken };
