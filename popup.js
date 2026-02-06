const api = (typeof browser !== "undefined") ? browser : chrome;

api.storage.local.get(['targetId'], (res) => {
  if (res.targetId) {
    document.getElementById('userId').value = res.targetId;
  }
});

document.getElementById('save').onclick = () => {
  const id = document.getElementById('userId').value.trim();
  if (!id) return;
  api.storage.local.set({ targetId: id }, () => {
    window.close();
  });
};