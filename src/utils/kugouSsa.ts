/**
 * 酷狗音乐 SSA 人机验证生成器
 * 生成 sid 和 edt 用于绕过人机验证
 */

import { aesEncryptSync, rsaEncryptSync, RSA_PADDING, AES_MODE } from '@/utils/nativeModules/crypto';
import { stringMd5 } from 'react-native-quick-md5';
import { Buffer } from '@craftzdog/react-native-buffer';

// RSA 公钥（从酷狗 WASM 中提取）
const KUGOU_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoW2+Ylo8ALePSQTP0xBF
lFmEOHvBD9tS+s7DBlfKEu3RzzvZTaX1JtYbX4+AVUqj6ARz8IM+CKByqGFvbHN/
W64XxNI+q7z36ajCL3VTJ2W5G9MCJitc6oGbire4NQfhaEq0nC+hxBWQvCbIFflA
2ItrLUbSU7z1bHA/a+jlQm4OWvY+IKnTryOJTPuT1yNOVjbJ8wBLKy2DgQr9pPqW
PmEQtGpR5IM9V8Kao6PaSdKYOWGbX3i2+RzIKhvZUxxtJwdVbqPlDPlW9h4/xIBc
56Lgvr4aIl8nFtwbj4UJVUTFuGrs0tY9H/tXvZ22dUCKuGxW/gW7ZF+gXz6vHtYa
rQIDAQAB
-----END PUBLIC KEY-----`;

// AES 初始化向量
const AES_IV = 'kugousecurity123';

// 哨兵值
let SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);

/**
 * 生成随机整数
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机字符串
 */
function randomString(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 格式化 type-3 事件（鼠标/触摸移动）
 */
function formatMouse(t: number, i: number, x: number, y: number): string {
  return `3,${t},${i},${x},${y}`;
}

/**
 * 格式化 type-5 事件（滚动/计时）
 */
function formatScroll(t: number, i: number): string {
  return `5,${t},${i}`;
}

/**
 * 格式化 type-6 事件（窗口事件）
 */
function formatWindow(t: number, i: number, w: number, h: number): string {
  return `6,${t},${i},${w},${h}`;
}

/**
 * 格式化哨兵记录
 */
function formatSentinel(type: number, ...args: number[]): string {
  return `${type},${SENTINEL},${args.join(',')}`;
}

/**
 * 生成贝塞尔曲线鼠标路径
 */
function bezierPath(
  sx: number, sy: number,
  ex: number, ey: number,
  n: number
): Array<{ x: number; y: number }> {
  const c1x = sx + (ex - sx) * 0.3 + randomInt(-80, 80);
  const c1y = sy + (ey - sy) * 0.2 + randomInt(-60, 60);
  const c2x = sx + (ex - sx) * 0.7 + randomInt(-60, 60);
  const c2y = sy + (ey - sy) * 0.8 + randomInt(-40, 40);

  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;

    const x = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
    const y = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;

    const jitter = Math.max(0.5, 3 - t * 2.5);
    pts.push({
      x: x + (Math.random() - 0.5) * jitter,
      y: y + (Math.random() - 0.5) * jitter,
    });
  }
  return pts;
}

/**
 * 生成 EDT 中的 data 字段（用户行为指纹数据）
 */
function generateEDTData(opts: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  mousePoints: number;
}): string {
  const { startX, startY, endX, endY, mousePoints } = opts;
  const entries: string[] = [];
  let ts = 0;
  let ei = 0;

  // 初始化事件
  entries.push(formatScroll(0, 0));
  entries.push(formatSentinel(5, 0));
  entries.push(formatScroll(0, 0));
  entries.push(formatSentinel(5, 0));

  // 窗口事件
  ts += randomInt(5, 20);
  entries.push(formatWindow(ts, ei, 750, 500));
  entries.push(formatSentinel(6, ei, 750, 500));
  ei++;

  // 滚动事件
  for (let i = 0; i < 3; i++) {
    ts += randomInt(80, 600);
    entries.push(formatScroll(ts, ei));
    entries.push(formatSentinel(5, ei));
    ei++;
  }

  // 鼠标轨迹
  const path = bezierPath(startX, startY, endX, endY, mousePoints);
  let si = 0;
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    ts += randomInt(8, 50);
    entries.push(formatMouse(ts, si, Math.round(x), Math.round(y)));
    entries.push(formatSentinel(3, si, Math.round(x), Math.round(y)));

    if (i > 0 && i % 12 === 0) {
      ts += randomInt(20, 60);
      entries.push(formatScroll(ts, ei));
      entries.push(formatSentinel(5, ei));
      ei++;
    }
    si = (si + 1) % 2;
  }

  // 结束事件
  ts += randomInt(5, 30);
  entries.push(formatMouse(ts, 1, Math.round(endX + randomInt(-5, 5)), Math.round(endY + randomInt(-5, 5))));
  entries.push(formatSentinel(3, 1, Math.round(endX), Math.round(endY)));

  return entries.join(':');
}

/**
 * 生成模拟的 sid 和 edt
 */
export function generateSimulate(
  mid: string,
  userid: string,
  dfid: string,
  webglHash?: string
): { edt: string; sid: string } | null {
  try {
    console.log('[KuGou SSA] === generateSimulate 开始 ===');
    console.log('[KuGou SSA] 输入参数:', JSON.stringify({ mid, userid, dfid, webglHash }));

    // 更新哨兵值
    SENTINEL = 0xffffffff - Math.floor(Math.random() * 20);
    console.log('[KuGou SSA] 哨兵值:', SENTINEL);

    // 生成随机 AES 密钥
    // 注意：原生 AES 模块会对 key 做 base64 解码，需要确保解码后是合法的 AES 密钥长度（16/24/32字节）
    // 32个hex字符 → base64解码后24字节 → 合法的 AES-192 密钥
    const rawKey = randomString(16);
    console.log('[KuGou SSA] 原始随机密钥:', rawKey);
    const md5Key = stringMd5(rawKey);
    console.log('[KuGou SSA] MD5结果:', md5Key);
    const aesKey = md5Key; // 使用完整32字符MD5，base64解码后24字节=AES-192
    console.log('[KuGou SSA] AES密钥(完整32字符):', aesKey, '长度:', aesKey.length);

    // 随机化鼠标轨迹参数
    // 注意：原生 AES 模块对大输入有缓冲区限制，需要控制数据量
    const points = randomInt(8, 15);
    const startX = randomInt(200, 600);
    const startY = randomInt(200, 500);
    const endX = randomInt(500, 700);
    const endY = randomInt(80, 150);
    console.log('[KuGou SSA] 鼠标参数:', JSON.stringify({ points, startX, startY, endX, endY }));

    // 生成行为数据
    console.log('[KuGou SSA] 开始生成行为数据...');
    const data = generateEDTData({ startX, startY, endX, endY, mousePoints: points });
    console.log('[KuGou SSA] 行为数据生成完成, 长度:', data.length);
    console.log('[KuGou SSA] 行为数据前200字符:', data.substring(0, 200));

    // 生成 WebGL 哈希（如果未提供）
    let webgl: string;
    try {
      webgl = webglHash || String(BigInt(randomInt(0, 0xffffffff)) * BigInt(0x100000000) + BigInt(randomInt(0, 0xffffffff)));
      console.log('[KuGou SSA] WebGL哈希:', webgl);
    } catch (e) {
      webgl = webglHash || String(randomInt(1000000000, 9999999999));
      console.log('[KuGou SSA] WebGL哈希(降级):', webgl);
    }

    // 拼接完整明文
    const ts = Date.now();
    const plaintext = `mid=${mid};userid=${userid};dfid=${dfid};webgl=${webgl};webdriver=0;ts=${ts};data=${data}`;
    console.log('[KuGou SSA] 明文长度:', plaintext.length);
    console.log('[KuGou SSA] 明文前200字符:', plaintext.substring(0, 200));

    // 将明文转换为 Base64 编码（原生模块需要）
    console.log('[KuGou SSA] 开始Buffer转换...');
    let plaintextBase64: string;
    try {
      plaintextBase64 = Buffer.from(plaintext, 'utf8').toString('base64');
      console.log('[KuGou SSA] Buffer转换成功, Base64长度:', plaintextBase64.length);
    } catch (e) {
      console.error('[KuGou SSA] Buffer转换失败:', e);
      // 降级方案：使用 btoa
      try {
        plaintextBase64 = btoa(unescape(encodeURIComponent(plaintext)));
        console.log('[KuGou SSA] btoa降级转换成功, Base64长度:', plaintextBase64.length);
      } catch (e2) {
        console.error('[KuGou SSA] btoa降级也失败:', e2);
        return null;
      }
    }

    // AES-128-CBC 加密
    console.log('[KuGou SSA] 开始AES加密...');
    console.log('[KuGou SSA] AES参数:', JSON.stringify({
      inputLength: plaintextBase64.length,
      keyLength: aesKey.length,
      ivLength: AES_IV.length,
      key: aesKey,
      iv: AES_IV,
      mode: AES_MODE.CBC_128_PKCS7Padding,
    }));
    let edt: string;
    try {
      edt = aesEncryptSync(plaintextBase64, aesKey, AES_IV, AES_MODE.CBC_128_PKCS7Padding);
      console.log('[KuGou SSA] AES加密结果, EDT长度:', edt.length);

      // 原生 AES 模块对大输入可能返回空字符串，降级为最小数据重试
      if (!edt || edt.length === 0) {
        console.log('[KuGou SSA] AES返回空，使用最小行为数据重试...');
        const minData = generateEDTData({ startX: 300, startY: 300, endX: 600, endY: 100, mousePoints: 3 });
        const minPlaintext = `mid=${mid};userid=${userid};dfid=${dfid};webgl=${webgl};webdriver=0;ts=${ts};data=${minData}`;
        console.log('[KuGou SSA] 最小明文长度:', minPlaintext.length);
        const minBase64 = Buffer.from(minPlaintext, 'utf8').toString('base64');
        console.log('[KuGou SSA] 最小Base64长度:', minBase64.length);
        edt = aesEncryptSync(minBase64, aesKey, AES_IV, AES_MODE.CBC_128_PKCS7Padding);
        console.log('[KuGou SSA] 重试AES结果, EDT长度:', edt.length);
      }

      if (edt && edt.length > 0) {
        console.log('[KuGou SSA] EDT前100字符:', edt.substring(0, 100));
      } else {
        console.log('[KuGou SSA] AES加密最终失败，EDT仍为空');
      }
    } catch (e) {
      console.error('[KuGou SSA] AES加密失败:', e);
      return null;
    }

    // RSA-OAEP 加密 AES 密钥
    console.log('[KuGou SSA] 开始RSA加密...');
    console.log('[KuGou SSA] RSA输入密钥:', aesKey);
    console.log('[KuGou SSA] RSA公钥前50字符:', KUGOU_RSA_PUBLIC_KEY.substring(0, 50));
    let sid: string;
    try {
      sid = rsaEncryptSync(aesKey, KUGOU_RSA_PUBLIC_KEY, RSA_PADDING.OAEPWithSHA1AndMGF1Padding);
      console.log('[KuGou SSA] RSA加密成功, SID长度:', sid.length);
      console.log('[KuGou SSA] SID前100字符:', sid.substring(0, 100));
    } catch (e) {
      console.error('[KuGou SSA] RSA加密失败:', e);
      return null;
    }

    console.log('[KuGou SSA] === generateSimulate 完成 ===');
    return { edt, sid };
  } catch (error: any) {
    console.error('[KuGou SSA] === generateSimulate 异常 ===');
    console.error('[KuGou SSA] 错误类型:', error?.constructor?.name);
    console.error('[KuGou SSA] 错误消息:', error?.message);
    console.error('[KuGou SSA] 错误堆栈:', error?.stack);
    return null;
  }
}
