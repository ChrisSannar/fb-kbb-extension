// src/background.ts
function configureActionGating() {
  chrome.action.disable();
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: "www.facebook.com", pathPrefix: "/marketplace" }
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction]
      }
    ]);
  });
}
chrome.runtime.onInstalled.addListener(configureActionGating);
chrome.runtime.onStartup.addListener(configureActionGating);
