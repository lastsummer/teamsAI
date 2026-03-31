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
      let until;
      if (options.since) {
        since = options.since;
        until = options.until;
      } else {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        since = todayStart.toISOString();
        until = new Date().toISOString();
      }
      console.log(`  抓取自：${since}`);
      console.log(`  抓取至：${until || '不限'}`);

      const fetchStart = new Date().toISOString();
      let messages = await getChannelMessages(
        accessToken,
        channel.teamId,
        channel.channelId,
        since
      );

      if (until) {
        const untilDate = new Date(until);
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
