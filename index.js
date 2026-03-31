const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { fetchAll } = require('./src/fetcher');
const { listJoinedTeams, listChannels } = require('./src/graph');
const { getAccessToken } = require('./src/auth');

const configPath = path.join(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const args = process.argv.slice(2);

async function main() {
  if (args[0] === 'list-teams') {
    // 列出所有加入的 Teams，方便查找 teamId
    const token = await getAccessToken(config.azure.clientId, config.azure.tenantId);
    const teams = await listJoinedTeams(token);
    console.log('\n你加入的 Teams：');
    teams.forEach((t) => console.log(`  ${t.displayName}\n    teamId: ${t.id}`));
    return;
  }

  if (args[0] === 'list-channels') {
    // 列出指定 team 的所有頻道
    const teamId = args[1];
    if (!teamId) {
      console.error('用法：node index.js list-channels <teamId>');
      process.exit(1);
    }
    const token = await getAccessToken(config.azure.clientId, config.azure.tenantId);
    const channels = await listChannels(token, teamId);
    console.log('\n頻道列表：');
    channels.forEach((c) => console.log(`  ${c.displayName}\n    channelId: ${c.id}`));
    return;
  }

  if (args[0] === 'fetch') {
    const daysAgo = parseInt(args[1]);
    if (!isNaN(daysAgo) && daysAgo >= 2) {
      // 抓取指定天數前整天（00:00:00 ~ 23:59:59），檔名使用當天日期
      // 例：daysAgo=2 → 昨天整天
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (daysAgo - 1));
      const since = new Date(targetDate);
      since.setHours(0, 0, 0, 0);
      const until = new Date(targetDate);
      until.setHours(23, 59, 59, 999);
      console.log(`抓取區間：${since.toISOString()} ~ ${until.toISOString()}`);
      await fetchAll(config, { since: since.toISOString(), until: until.toISOString(), fileDate: targetDate });
    } else {
      // 立即執行一次（今天 00:00:00 到目前時間）
      await fetchAll(config);
    }
    return;
  }

  // 預設：依排程定期執行
  const schedule = config.schedule || '0 * * * *';
  console.log(`排程已啟動，規則：${schedule}`);
  console.log('提示：');
  console.log('  node index.js fetch              立即抓取一次（今天 00:00:00 至目前時間）');
  console.log('  node index.js fetch <N>          抓取 N-1 天前整天（00:00~23:59），例：fetch 2 = 昨天整天');
  console.log('  node index.js list-teams         列出所有 Teams');
  console.log('  node index.js list-channels <teamId>  列出頻道\n');

  // 啟動時先執行一次
  await fetchAll(config);

  // cron.schedule(schedule, () => fetchAll(config));
}

main().catch((err) => {
  console.error('執行錯誤：', err.message);
  process.exit(1);
});
