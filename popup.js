const api = (typeof browser !== "undefined") ? browser : chrome;


api.storage.local.get(['targetIds', 'notificationsEnabled'], (res) => {
  if (res.targetIds) {
    document.getElementById('userId').value = res.targetIds.join(', ');
  }
  
  document.getElementById('notifyToggle').checked = res.notificationsEnabled !== false;
});

document.getElementById('save').onclick = () => {
  const input = document.getElementById('userId').value;
  const ids = input.split(',').map(id => id.trim()).filter(id => id.length > 0);
  const isEnabled = document.getElementById('notifyToggle').checked;
  
  api.storage.local.set({ targetIds: ids, notificationsEnabled: isEnabled }, () => {
    window.close();
  });
};