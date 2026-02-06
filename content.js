(() => {
  if (window.__discordTargetWatchInitialized) return;
  window.__discordTargetWatchInitialized = true;

  const apiRT = (typeof browser !== "undefined") ? browser.runtime : chrome.runtime;
  
  function getChatLog() {
    return document.querySelector('[role="log"]') || document.body;
  }

  function extractAuthor(article) {
    return (
      article.querySelector('span[id^="message-username-"]')?.textContent?.trim() ||
      article.querySelector('[class*="username"]')?.textContent?.trim() ||
      "Unknown"
    );
  }

  function extractContent(article) {
    return (
      article.querySelector('div[id^="message-content-"]')?.innerText?.trim() ||
      article.querySelector('[id^="message-content-"]')?.textContent?.trim() ||
      "[Image/Embed]"
    );
  }

  function extractUserId(article) {
    const avatarImg = article.querySelector('img[src*="/avatars/"]');
    if (!avatarImg) return null;
    const match = avatarImg.src.match(/\/avatars\/(\d+)\//);
    return match ? match[1] : null;
  }

  function findArticleWithin(node) {
    if (!(node instanceof Element)) return null;
    if (node.matches('div[role="article"]')) return node;
    return node.querySelector?.('div[role="article"]') || null;
  }

  function findMessageListItems(node) {
    if (!(node instanceof Element)) return [];
    if (node.matches('li[id^="chat-messages-"]')) return [node];
    return Array.from(node.querySelectorAll?.('li[id^="chat-messages-"]') || []);
  }

  function handleMessageNode(node) {
    const article = findArticleWithin(node);
    if (!article) return;

    const userId = extractUserId(article);
    if (!userId) return;

    const author = extractAuthor(article);
    const content = extractContent(article);

    apiRT.sendMessage({
      type: "NEW_MESSAGE",
      userId,
      author,
      content
    });
  }

  function startObserver() {
    const root = getChatLog();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          
          const lis = findMessageListItems(node);
          if (lis.length) {
            lis.forEach(handleMessageNode);
          } else {
            handleMessageNode(node);
          }
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();