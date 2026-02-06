let targetUserId = "";
const api = (typeof browser !== "undefined") ? browser : chrome;
let lastNotificationTime = 0;
const MIN_INTERVAL_MS = 2000; 

function updateTarget() {
  api.storage.local.get(['targetId'], (res) => {
    targetUserId = res.targetId || "";
  });
}

updateTarget();
api.storage.onChanged.addListener(updateTarget);

function notify(author, content) {
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

api.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "NEW_MESSAGE") return;
  if (!targetUserId) return;

  if (message.userId === targetUserId) {
    notify(message.author, message.content);
  }
});