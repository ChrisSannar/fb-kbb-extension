/**
 * Service worker: enable the toolbar action only on Facebook Marketplace.
 *
 * The action starts disabled (greyed out, popup won't open). A declarativeContent
 * rule re-enables it whenever the active tab is on facebook.com/marketplace/*.
 * This needs no host permission — declarativeContent matches the URL itself.
 */
function configureActionGating(): void {
  chrome.action.disable();
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: "www.facebook.com", pathPrefix: "/marketplace" },
          }),
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
      },
    ]);
  });
}

chrome.runtime.onInstalled.addListener(configureActionGating);
chrome.runtime.onStartup.addListener(configureActionGating);
