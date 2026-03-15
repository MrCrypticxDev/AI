async function load() {
  const v = await browser.storage.local.get(['openclawBaseUrl', 'openclawToken', 'openclawModel']);
  document.getElementById('baseUrl').value = v.openclawBaseUrl || 'ws://127.0.0.1:18789';
  document.getElementById('token').value = v.openclawToken || '';
  document.getElementById('model').value = v.openclawModel || 'MiniMax-M2.5';
  await renderDisabledHosts();
}

async function renderDisabledHosts() {
  const v = await browser.storage.local.get(['disabledHosts']);
  const hosts = v.disabledHosts || [];
  const list = document.getElementById('hostList');
  const noHosts = document.getElementById('noHosts');
  // Remove existing host items (keep the noHosts sentinel)
  list.querySelectorAll('.host-item').forEach(el => el.remove());
  if (hosts.length === 0) {
    noHosts.style.display = '';
    return;
  }
  noHosts.style.display = 'none';
  for (const host of hosts) {
    const li = document.createElement('li');
    li.className = 'host-item';
    li.innerHTML = `<span>${host.replace(/</g, '&lt;')}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.textContent = '✕ Re-enable';
    btn.addEventListener('click', async () => {
      const v2 = await browser.storage.local.get(['disabledHosts']);
      const next = (v2.disabledHosts || []).filter(h => h !== host);
      await browser.storage.local.set({ disabledHosts: next });
      await renderDisabledHosts();
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
}

document.getElementById('save').addEventListener('click', async () => {
  await browser.storage.local.set({
    openclawBaseUrl: document.getElementById('baseUrl').value,
    openclawToken: document.getElementById('token').value,
    openclawModel: document.getElementById('model').value,
  });
  const status = document.getElementById('status');
  status.textContent = 'Saved!';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

load();
