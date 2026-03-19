const { getAccessToken } = require('./auth');
const { getChannelMessages } = require('./graph');
const { getLastFetchTime, setLastFetchTime, saveMessages } = require('./archive');
const path = require('path');

async function fetchAll(config, options = {}) {
  console.log(`[${new Date().toISOString()}] 開始抓取 Teams 訊息...`);

  let accessToken;
  try {
    accessToken = await getAccessToken(config.azure.clientId, config.azure.tenantId);
  } catch (err) {
    console.error('取得 token 失敗：', err.message);
    return;
  }

  const archiveDir = path.resolve(config.archiveDir);

  for (const channel of config.channels) {
    console.log(`\n頻道：${channel.name}`);
    try {
      let since;
      if (options.since) {
        since = options.since;
      } else {
        const lastFetch = getLastFetchTime(channel.channelId);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const lastFetchDate = lastFetch ? new Date(lastFetch) : null;
        since = (!lastFetchDate || lastFetchDate < twoDaysAgo)
          ? oneDayAgo.toISOString()
          : lastFetch;
      }
      console.log(`  抓取自：${since}`);
      if (options.until) console.log(`  抓取至：${options.until}`);

      const fetchStart = new Date().toISOString();
      let messages = await getChannelMessages(
        accessToken,
        channel.teamId,
        channel.channelId,
        since
      );

      if (options.until) {
        const untilDate = new Date(options.until);
        messages = messages.filter(m => new Date(m.createdDateTime) < untilDate);
      }

      saveMessages(archiveDir, channel.name, messages, options.fileDate);
      if (!options.since) setLastFetchTime(channel.channelId, fetchStart);

      if (messages.length === 0) {
        console.log('  沒有新訊息');
      }
    } catch (err) {
      console.error(`  抓取失敗：${err.response?.data?.error?.message || err.message}`);
    }
  }

  console.log(`\n完成。`);
}

module.exports = { fetchAll };
