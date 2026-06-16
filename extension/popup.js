// src/popup.ts
var $ = (id) => document.getElementById(id);
function show(el, text) {
  if (text != null)
    el.textContent = text;
  el.classList.remove("hidden");
}
function showError(message) {
  show($("error"), message);
}
function render(res) {
  if (!res.ok) {
    showError(res.error);
    return;
  }
  const { vehicle, kbbUrl } = res;
  const trim = vehicle.trim ? ` ${vehicle.trim}` : "";
  show($("vehicle"), `${vehicle.year} ${vehicle.make} ${vehicle.model}${trim}`);
  const link = $("kbb");
  link.href = kbbUrl;
  show(link);
}
async function main() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError("No active tab.");
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_KBB"
    });
    render(res);
  } catch {
    showError("Open a Facebook Marketplace vehicle listing, then click the icon.");
  }
}
main();
