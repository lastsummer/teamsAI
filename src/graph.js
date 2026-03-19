const axios = require('axios');

const GRAPH_BASE = 'https://graph.microsoft.com/beta';

function createClient(accessToken) {
  return axios.create({
    baseURL: GRAPH_BASE,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchAllPages(client, url, sinceTime) {
  const items = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await client.get(nextUrl.replace(GRAPH_BASE, ''));
    const page = res.data.value || [];

    if (sinceTime) {
      const newItems = page.filter((msg) => new Date(msg.lastModifiedDateTime).getTime() > sinceTime);
      items.push(...newItems);
      // 當整頁都有舊訊息時停止翻頁
      if (newItems.length < page.length) break;
    } else {
      items.push(...page);
    }

    nextUrl = res.data['@odata.nextLink'] || null;
    console.log(`  已抓取 ${items.length} 則，繼續：${!!nextUrl}`);
  }

  return items;
}

async function getChannelMessages(accessToken, teamId, channelId, since) {
  const client = createClient(accessToken);
  const sinceTime = since ? new Date(since).getTime() : null;

  const url = `/teams/${teamId}/channels/${channelId}/messages`;
  const messages = await fetchAllPages(client, url, sinceTime);
  console.log(`  總訊息數：${messages.length}`);

  return messages;
}

async function listJoinedTeams(accessToken) {
  const client = createClient(accessToken);
  const res = await client.get('/me/joinedTeams');
  return res.data.value;
}

async function listChannels(accessToken, teamId) {
  const client = createClient(accessToken);
  const res = await client.get(`/teams/${teamId}/channels`);
  return res.data.value;
}

module.exports = { getChannelMessages, listJoinedTeams, listChannels };
