'use strict';

// ---------------------------------------------------------------------------
// 凭证加密存储（脱敏整改 P0）
//
// 背景：整改前 .cookie / .kugou-cookie / kugou-lite-session.json / .spotify-token.json
// 等文件均以**明文**写入 userData，任意本地进程可直接读取账号会话令牌
// （实测网易云 MUSIC_U 898 字符明文落盘，可用于账号劫持）。
//
// 方案：优先使用 Electron safeStorage（Windows 下即 DPAPI，密钥绑定当前 Windows
// 用户账户，同一台机器上的其他用户无法解密）。密文以 'MRENC1' 魔数开头，
// 便于与历史明文区分。
//
// 设计要点：
//  1. **不静默降级**：safeStorage 不可用时打显式告警；若设置了
//     MINERADIO_REQUIRE_CREDENTIAL_ENCRYPTION=1 则直接抛错，拒绝明文落盘。
//  2. **向后兼容**：读取无魔数的历史明文照常返回，调用方在下次写入时自动升级。
//  3. **共享模块**：server.js / kugou-lite-session.js / qishui-api.js / spotify-api.js
//     统一走这里，避免各写一套导致行为不一致。
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const CREDENTIAL_ENC_MAGIC = 'MRENC1';
const warnedReasons = new Set();

function safeStorageRef() {
  try {
    // 延迟 require：本模块也可能被非 Electron 环境（单测）加载。
    const electron = require('electron');
    return electron && electron.safeStorage ? electron.safeStorage : null;
  } catch (_) {
    return null;
  }
}

function isEncryptionAvailable() {
  const ss = safeStorageRef();
  try {
    return !!(ss && typeof ss.isEncryptionAvailable === 'function' && ss.isEncryptionAvailable());
  } catch (_) {
    return false;
  }
}

function warnFallback(reason) {
  if (warnedReasons.has(reason)) return;
  warnedReasons.add(reason);
  console.warn(
    '[security] 凭证将以明文写入磁盘（' + reason + '）；'
    + '如需强制加密请设置 MINERADIO_REQUIRE_CREDENTIAL_ENCRYPTION=1'
  );
}

function requireEncryption() {
  return String(process.env.MINERADIO_REQUIRE_CREDENTIAL_ENCRYPTION || '') === '1';
}

/**
 * 加密凭证文本。返回值可能为密文（'MRENC1'+base64）或原文明文。
 * @param {string} plain
 * @param {string} [label] 仅用于日志定位
 * @returns {string}
 */
function encryptText(plain, label) {
  const text = String(plain == null ? '' : plain);
  if (!text) return '';
  const ss = safeStorageRef();
  if (ss && typeof ss.encryptString === 'function' && isEncryptionAvailable()) {
    try {
      return CREDENTIAL_ENC_MAGIC + Buffer.from(ss.encryptString(text)).toString('base64');
    } catch (err) {
      warnFallback((label || 'credential') + ':encrypt-failed:' + (err && err.message || err));
    }
  } else {
    warnFallback((label || 'credential') + ':' + (ss ? 'encryption-unavailable' : 'no-safe-storage'));
  }
  if (requireEncryption()) {
    const e = new Error('CREDENTIAL_ENCRYPTION_REQUIRED_BUT_UNAVAILABLE');
    e.code = 'CREDENTIAL_ENCRYPTION_REQUIRED_BUT_UNAVAILABLE';
    throw e;
  }
  return text;
}

/**
 * 解密凭证文本。无魔数视为历史明文，原样返回（供调用方升级回写）。
 * 解密失败会抛错，调用方应捕获并当作"未登录"处理。
 * @param {string} raw
 * @returns {string}
 */
function decryptText(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text.startsWith(CREDENTIAL_ENC_MAGIC)) return text;
  const ss = safeStorageRef();
  if (!ss || typeof ss.decryptString !== 'function') {
    const e = new Error('CREDENTIAL_ENCRYPTION_KEY_UNAVAILABLE');
    e.code = 'CREDENTIAL_ENCRYPTION_KEY_UNAVAILABLE';
    throw e;
  }
  return ss.decryptString(Buffer.from(text.slice(CREDENTIAL_ENC_MAGIC.length), 'base64'));
}

function isEncrypted(raw) {
  return String(raw == null ? '' : raw).trim().startsWith(CREDENTIAL_ENC_MAGIC);
}

/**
 * 读取凭证文件。文件不存在返回 ''；解密失败返回 ''（并告警），
 * 避免把密文当凭证发给上游造成异常请求。
 * @param {string} file
 * @param {string} [label]
 * @returns {string}
 */
function readCredentialFile(file, label) {
  try {
    if (!file || !fs.existsSync(file)) return '';
    const raw = fs.readFileSync(file, 'utf8');
    try {
      return decryptText(raw).trim();
    } catch (err) {
      console.warn(
        '[security] 凭证文件解密失败，按未登录处理:',
        path.basename(String(file)),
        err && err.message || err
      );
      return '';
    }
  } catch (_) {
    return '';
  }
}

/**
 * 写入凭证文件（加密）。写入空值会落成空文件。
 * @param {string} file
 * @param {string} value
 * @param {string} [label]
 * @returns {boolean} 是否写入成功
 */
function writeCredentialFile(file, value, label) {
  try {
    if (!file) return false;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = String(value || '');
    fs.writeFileSync(file, text ? encryptText(text, label) : '', 'utf8');
    return true;
  } catch (err) {
    console.warn('[security] 凭证写入失败:', path.basename(String(file)), err && err.message || err);
    return false;
  }
}

/**
 * 读取并解析 JSON 凭证文件（如 kugou-lite-session.json）。
 * @param {string} file
 * @param {string} [label]
 * @returns {object|null}
 */
function readCredentialJson(file, label) {
  const text = readCredentialFile(file, label);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * 加密并写入 JSON 凭证文件。
 * @param {string} file
 * @param {object} value
 * @param {string} [label]
 * @returns {boolean}
 */
function writeCredentialJson(file, value, label) {
  try {
    return writeCredentialFile(file, JSON.stringify(value, null, 2), label);
  } catch (err) {
    console.warn('[security] 凭证 JSON 序列化失败:', err && err.message || err);
    return false;
  }
}

/**
 * 判断一段文本是否"看起来像"已加密凭证（供迁移逻辑跳过已是密文的文件）。
 */
function isEncryptedCredentialText(raw) {
  return isEncrypted(raw);
}

module.exports = {
  CREDENTIAL_ENC_MAGIC,
  isEncryptionAvailable,
  encryptText,
  decryptText,
  isEncrypted,
  readCredentialFile,
  writeCredentialFile,
  readCredentialJson,
  writeCredentialJson,
  isEncryptedCredentialText,
};
