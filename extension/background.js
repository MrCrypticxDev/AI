// Background is currently minimal, but it can be expanded to store scan history or broadcast events.
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['openclawBaseUrl', 'disabledHosts']).then((v) => {
    const defaults = {};
    if (!v.openclawBaseUrl) {
      defaults.openclawBaseUrl = 'ws://127.0.0.1:18789';
      defaults.openclawToken   = '';
      defaults.openclawModel   = 'MiniMax-M2.5';
    }
    if (!v.disabledHosts) defaults.disabledHosts = [];
    if (Object.keys(defaults).length) browser.storage.local.set(defaults);
  });
})
