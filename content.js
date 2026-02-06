(() => {
  if (window.__discordWordWatchInitialized) return;
  window.__discordWordWatchInitialized = true;

  // Same target channel as your old extension. Change this if you want a different channel.
  const TARGET_PATH = "/channels/378344742565707780/1225922104633856033";

  console.log("[WordWatch] Content script loaded");

  function isOnTargetChannel() {
    return location.pathname.startsWith(TARGET_PATH);
  }

  // Avoid spamming on initial load / big rerenders
  const startedAt = Date.now();
  const IGNORE_FIRST_MS = 2500;

  function getChatLog() {
    // Discord usually uses role="log" for the chat area
    return document.querySelector('[role="log"]') || document.body;
  }

  function extractAuthor(article) {
    return (
      article.querySelector('span[id^="message-username-"]')?.textContent?.trim() ||
      article.querySelector('[class*="username"]')?.textContent?.trim() ||
      ""
    );
  }

  function extractContent(article) {
    return (
      article.querySelector('div[id^="message-content-"]')?.innerText?.trim() ||
      article.querySelector('[id^="message-content-"]')?.textContent?.trim() ||
      ""
    );
  }

  function findArticleWithin(node) {
    if (!(node instanceof Element)) return null;

    if (node.matches('div[role="article"][aria-roledescription="Message"]')) return node;

    return node.querySelector?.('div[role="article"][aria-roledescription="Message"]') || null;
  }

  function findMessageListItems(node) {
    if (!(node instanceof Element)) return [];
    if (node.matches('li[id^="chat-messages-"]')) return [node];
    return Array.from(node.querySelectorAll?.('li[id^="chat-messages-"]') || []);
  }

  function handleMessageNode(liOrAny) {
    const article = findArticleWithin(liOrAny);
    if (!article) return;

    const author = extractAuthor(article);
    const content = extractContent(article);

    if (!content) return;

    // Send to background for matching
    const apiRT = (typeof browser !== "undefined") ? browser.runtime : chrome.runtime;
    apiRT.sendMessage({
      type: "NEW_MESSAGE",
      author,
      content
    });
  }

  function startObserver() {
    const root = getChatLog();

    const observer = new MutationObserver((mutations) => {
      if (!isOnTargetChannel()) return;
      if (Date.now() - startedAt < IGNORE_FIRST_MS) return;

      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;

          // Prefer list items if present
          const lis = findMessageListItems(node);
          if (lis.length) {
            for (const li of lis) handleMessageNode(li);
            continue;
          }

          // Fallback: if Discord adds message blocks without li wrappers
          const article = findArticleWithin(node);
          if (article) handleMessageNode(article);
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });
    console.log("[WordWatch] Observer attached");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();
