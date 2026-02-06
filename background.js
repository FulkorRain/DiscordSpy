let targetIds = [];
let notificationsEnabled = true;
const api = (typeof browser !== "undefined") ? browser : chrome;
let lastNotificationTime = 0;
const MIN_INTERVAL_MS = 2000; 

function updateSettings() {
  api.storage.local.get(['targetIds', 'notificationsEnabled'], (res) => {
    targetIds = res.targetIds || [];
    notificationsEnabled = res.notificationsEnabled !== false;
  });
}

updateSettings();
api.storage.onChanged.addListener(updateSettings);

function notify(author, content) {

  if (!notificationsEnabled) return;

  const now = Date.now();
  if (now - lastNotificationTime < MIN_INTERVAL_MS) return;
  lastNotificationTime = now;

  api.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: `TARGET SPOTTED: ${author}`,
    message: content,
    priority: 2
  });
}

api.runtime.onMessage.addListener((message) => {
  if (message.type !== "NEW_MESSAGE") return;
  if (targetIds.length === 0) return;

  if (targetIds.includes(message.userId)) {
    notify(message.author, message.content);
  }
});