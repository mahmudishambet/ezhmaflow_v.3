const axios = require('axios');
const { db } = require('../db/database');

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Get Telegram settings from database
 */
function getTelegramSettings() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('telegram_bot_token', 'telegram_chat_id', 'telegram_enabled')`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error getting Telegram settings:', err);
          return resolve({ enabled: false, botToken: '', chatId: '' });
        }

        const settings = {};
        (rows || []).forEach(row => {
          settings[row.setting_key] = row.setting_value;
        });

        resolve({
          enabled: settings['telegram_enabled'] === '1',
          botToken: settings['telegram_bot_token'] || '',
          chatId: settings['telegram_chat_id'] || ''
        });
      }
    );
  });
}

/**
 * Save Telegram settings to database
 */
function saveTelegramSettings({ botToken, chatId, enabled }) {
  return new Promise((resolve, reject) => {
    const settings = [
      { key: 'telegram_bot_token', value: botToken || '' },
      { key: 'telegram_chat_id', value: chatId || '' },
      { key: 'telegram_enabled', value: enabled ? '1' : '0' }
    ];

    db.serialize(() => {
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime('now'))`
      );

      for (const s of settings) {
        stmt.run(s.key, s.value);
      }

      stmt.finalize((err) => {
        if (err) {
          console.error('Error saving Telegram settings:', err);
          return reject(err);
        }
        resolve(true);
      });
    });
  });
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(text, parseMode = 'HTML') {
  try {
    const settings = await getTelegramSettings();

    if (!settings.enabled || !settings.botToken || !settings.chatId) {
      return { success: false, reason: 'Telegram not configured or disabled' };
    }

    const url = `${TELEGRAM_API_BASE}${settings.botToken}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: settings.chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    }, {
      timeout: 10000
    });

    if (response.data && response.data.ok) {
      return { success: true };
    }

    return { success: false, reason: response.data?.description || 'Unknown error' };
  } catch (error) {
    console.error('Telegram send error:', error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Format duration from seconds to human readable
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Get current timestamp formatted
 */
function getTimestamp() {
  return new Date().toLocaleString('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Send notification for stream events
 * @param {'start'|'stop'|'error'} type - Event type
 * @param {Object} data - Stream data
 */
async function sendNotification(type, data = {}) {
  try {
    const settings = await getTelegramSettings();
    if (!settings.enabled) return;

    let message = '';
    const timestamp = getTimestamp();
    const title = data.title || data.stream?.title || 'Untitled';
    const platform = data.platform || data.stream?.platform || 'Custom';

    switch (type) {
      case 'start':
        message = [
          `🟢 <b>Stream Started</b>`,
          ``,
          `📺 <b>Title:</b> ${escapeHtml(title)}`,
          `📡 <b>Platform:</b> ${escapeHtml(platform)}`,
          `🕐 <b>Time:</b> ${timestamp}`,
          ``,
          `<i>Ezhma Studio Manager</i>`
        ].join('\n');
        break;

      case 'stop':
        const duration = data.duration ? formatDuration(data.duration) : '--';
        message = [
          `🔴 <b>Stream Stopped</b>`,
          ``,
          `📺 <b>Title:</b> ${escapeHtml(title)}`,
          `📡 <b>Platform:</b> ${escapeHtml(platform)}`,
          `⏱ <b>Duration:</b> ${duration}`,
          `🕐 <b>Time:</b> ${timestamp}`,
          ``,
          `<i>Ezhma Studio Manager</i>`
        ].join('\n');
        break;

      case 'error':
        const errorMsg = data.error || data.message || 'Unknown error';
        message = [
          `⚠️ <b>Stream Error</b>`,
          ``,
          `📺 <b>Title:</b> ${escapeHtml(title)}`,
          `📡 <b>Platform:</b> ${escapeHtml(platform)}`,
          `❌ <b>Error:</b> ${escapeHtml(errorMsg)}`,
          `🕐 <b>Time:</b> ${timestamp}`,
          ``,
          `<i>Ezhma Studio Manager</i>`
        ].join('\n');
        break;

      default:
        return;
    }

    await sendTelegramMessage(message);
  } catch (error) {
    console.error('Telegram notification error:', error.message);
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Send a test notification
 */
async function sendTestNotification() {
  const message = [
    `✅ <b>Test Notification</b>`,
    ``,
    `Telegram notification berhasil dikonfigurasi!`,
    `Anda akan menerima notifikasi saat stream start, stop, dan error.`,
    ``,
    `🕐 <b>Time:</b> ${getTimestamp()}`,
    ``,
    `<i>Ezhma Studio Manager</i>`
  ].join('\n');

  return await sendTelegramMessage(message);
}

/**
 * Send test with specific bot token and chat ID (for testing before saving)
 */
async function sendTestWithCredentials(botToken, chatId) {
  try {
    if (!botToken || !chatId) {
      return { success: false, reason: 'Bot Token and Chat ID are required' };
    }

    const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;

    const message = [
      `✅ <b>Test Notification</b>`,
      ``,
      `Telegram notification berhasil dikonfigurasi!`,
      `Anda akan menerima notifikasi saat stream start, stop, dan error.`,
      ``,
      `🕐 <b>Time:</b> ${getTimestamp()}`,
      ``,
      `<i>Ezhma Studio Manager</i>`
    ].join('\n');

    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }, {
      timeout: 10000
    });

    if (response.data && response.data.ok) {
      return { success: true };
    }

    return { success: false, reason: response.data?.description || 'Unknown error' };
  } catch (error) {
    let reason = error.message;
    if (error.response && error.response.data) {
      reason = error.response.data.description || reason;
    }
    return { success: false, reason };
  }
}

module.exports = {
  getTelegramSettings,
  saveTelegramSettings,
  sendNotification,
  sendTestNotification,
  sendTestWithCredentials,
  sendTelegramMessage
};
