import type { KbbRequest, KbbResult } from "./content";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function show(el: HTMLElement, text?: string): void {
  if (text != null) el.textContent = text;
  el.classList.remove("hidden");
}

function showError(message: string): void {
  show($("error"), message);
}

function render(res: KbbResult): void {
  if (!res.ok) {
    showError(res.error);
    return;
  }
  const { vehicle, kbbUrl } = res;
  const trim = vehicle.trim ? ` ${vehicle.trim}` : "";
  show($("vehicle"), `${vehicle.year} ${vehicle.make} ${vehicle.model}${trim}`);
  const link = $<HTMLAnchorElement>("kbb");
  link.href = kbbUrl;
  show(link);
}

async function main(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError("No active tab.");
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage<KbbRequest, KbbResult>(tab.id, {
      type: "GET_KBB",
    });
    render(res);
  } catch {
    // No content script on this page (not a facebook.com/marketplace tab).
    showError("Open a Facebook Marketplace vehicle listing, then click the icon.");
  }
}

void main();
