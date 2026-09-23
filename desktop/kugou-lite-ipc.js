'use strict';

/**
 * Kugou-lite IPC registration (P2-T2).
 * New/changed lite IPC belongs here — not in desktop/main.js monolith.
 */
function registerKugouLiteIpc(deps) {
  const {
    ipcMain,
    isTrustedMainWindowIpc,
    ensureKugouLiteRuntimeStarted,
    healthCheckKugouLite,
    getKugouLiteStatus,
  } = deps;

  ipcMain.handle('kugou-lite-health', async (event) => {
    if (!isTrustedMainWindowIpc(event)) return { ok: false, error: 'UNTRUSTED_SENDER' };
    try {
      if (!getKugouLiteStatus().port) await ensureKugouLiteRuntimeStarted();
      return await healthCheckKugouLite();
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        status: getKugouLiteStatus(),
      };
    }
  });
}

module.exports = { registerKugouLiteIpc };
