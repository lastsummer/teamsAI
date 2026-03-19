const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.fetch_state.json');

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getLastFetchTime(channelId) {
  const state = loadState();
  return state[channelId] || null;
}

function setLastFetchTime(channelId, time) {
  const state = loadState();
  state[channelId] = time;
  saveState(state);
}

function saveMessages(archiveDir, channelName, messages) {
  if (messages.length === 0) return;

  const dir = path.join(archiveDir, sanitizeName(channelName));
  fs.mkdirSync(dir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `messages_${timestamp}.json`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, JSON.stringify(messages, null, 2));
  console.log(`  已儲存 ${messages.length} 則訊息 → ${filepath}`);
}

function sanitizeName(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '_');
}

module.exports = { getLastFetchTime, setLastFetchTime, saveMessages };
