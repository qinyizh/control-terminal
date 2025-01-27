const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV = Buffer.from(process.env.IV, 'utf8');
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes');
}
if (IV.length !== 16) {
  throw new Error('IV must be 16 bytes');
}

/**
 * 加密数据
 * @param {Object} data - 要加密的对象数据
 * @returns {string} - 加密后的字符串
 */
// 加密函数
function encrypt(data) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { iv: IV.toString('hex'), encryptedData: encrypted };
}

// 解密函数
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(encrypted.iv, 'hex'));
  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}
/**
 * 从文件加载数据
 * @param {string} filePath - 文件路径
 * @returns {Object|null} - 解密后的数据，文件不存在时返回 null
 */
function loadFromFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const encrypted = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      state = decrypt(encrypted);
      console.log('State loaded successfully');
      return state;
    } catch (err) {
      console.error('Failed to load state:', err);
    }
  }
}

/**
 * 将数据保存到文件
 * @param {string} filePath - 文件路径
 * @param {Object} data - 要保存的数据
 */
function saveToFile(filePath, data) {
  try {
    const encrypted = encrypt(data);
    fs.writeFileSync(filePath, JSON.stringify(encrypted), 'utf8');
    // console.log('State saved successfully');
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

module.exports = {
  encrypt,
  decrypt,
  loadFromFile,
  saveToFile,
};
