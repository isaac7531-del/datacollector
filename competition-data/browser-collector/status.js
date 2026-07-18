const statusNode = document.getElementById("status");

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function getQueue() {
  const result = await chrome.storage.local.get({ queue: [] });
  return result.queue;
}

async function setQueue(queue) {
  await chrome.storage.local.set({ queue });
}

document.getElementById("collect").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const response = await chrome.tabs.sendMessage(tab.id, { type: "EQUIBETS_COLLECT_VISIBLE_FEI_PAGE" });
  const queue = await getQueue();
  queue.push(response.data);
  await setQueue(queue);
  statusNode.textContent = JSON.stringify({ queued: queue.length, last: response.data }, null, 2);
});

document.getElementById("clear").addEventListener("click", async () => {
  await setQueue([]);
  statusNode.textContent = "Queue cleared.";
});

getQueue().then((queue) => {
  statusNode.textContent = JSON.stringify({ queued: queue.length }, null, 2);
});
