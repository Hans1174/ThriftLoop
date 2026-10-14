import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'thriftloop_super_secret_jwt_key_2026';
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '1089526724617-1e8fas2jq3noffeigk0kh5v7gfsids1f.apps.googleusercontent.com')
  .trim()
  .replace(/^["']|["']$/g, '');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHANNEL = (process.env.TELEGRAM_CHANNEL || '').trim();

// ==========================================
// AES-256-GCM FIELD-LEVEL ENCRYPTION ENGINE
// ==========================================
const ENCRYPTION_SECRET = process.env.FIELD_ENCRYPTION_KEY || JWT_SECRET;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(String(ENCRYPTION_SECRET)).digest();
const CIPHER_ALGO = 'aes-256-gcm';

export const encryptField = (value) => {
  if (!value || typeof value !== 'string') return value;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CIPHER_ALGO, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err.message);
    return value;
  }
};

export const decryptField = (value) => {
  if (!value || typeof value !== 'string' || !value.startsWith('enc:')) {
    return value;
  }
  try {
    const parts = value.split(':');
    if (parts.length !== 4) return value;
    const [, ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(CIPHER_ALGO, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return value;
  }
};

export const decryptOrder = (order) => {
  if (!order) return order;
  return {
    ...order,
    phone: decryptField(order.phone),
    shipping_address: decryptField(order.shipping_address),
    city: decryptField(order.city),
    province: decryptField(order.province),
    postal_code: decryptField(order.postal_code),
  };
};

export const decryptMessage = (msg) => {
  if (!msg) return msg;
  return {
    ...msg,
    message_text: decryptField(msg.message_text),
  };
};

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
  auth: { persistSession: false },
});

console.log('✅ Connected to Supabase Cloud PostgreSQL (Service Role Secured)');

app.get('/', (req, res) => {
  res.send('🌿 ThriftLoop Backend API is running with AES-256 Field-Level Encryption & RLS!');
});

const cleanedGeminiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

let ai = null;
try {
  if (cleanedGeminiKey) {
    ai = new GoogleGenAI({ apiKey: cleanedGeminiKey });
  }
} catch (err) {
  console.warn('⚠️ GoogleGenAI SDK initialization deferred:', err.message);
}

const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  },
});

mailTransporter.verify((error) => {
  if (error) {
    console.warn('⚠️ Nodemailer SMTP Notice (Non-fatal):', error.message);
  } else {
    console.log('📬 Nodemailer SMTP Server is ready to deliver messages.');
  }
});

// ==========================================
// CENTRALIZED EMAIL NOTIFICATION ENGINE
// ==========================================
export const sendEmailNotification = async ({ to, userId, subject, type, data = {} }) => {
  let recipientEmail = to;
  let customerName = data.customerName;

  if (userId) {
    const { data: registeredUser } = await supabase
      .from('users')
      .select('email, full_name, notification_preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (registeredUser) {
      const prefs = registeredUser.notification_preferences || {};
      if (
        (type === 'order_confirmation' || type === 'order_status') &&
        prefs.order_tracking_email === false
      ) {
        return { success: true, skipped: true };
      }

      if (registeredUser.email) {
        recipientEmail = registeredUser.email;
        customerName = customerName || registeredUser.full_name;
      }
    }
  }

  if (!recipientEmail || !process.env.EMAIL_USER) {
    return { success: false, error: 'Recipient email unresolvable or credentials missing.' };
  }

  let htmlContent = '';

  if (type === 'order_confirmation') {
    const { orderId, courier, trackingNumber, paymentMethod, totalAmount } = data;
    htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #A8C3A0; border-radius: 20px; overflow: hidden;">
        <div style="background-color: #2F6B4F; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Order Confirmed: #${orderId}</h1>
          <p style="color: #A8C3A0; margin: 6px 0 0 0; font-size: 13px;">ThriftLoop Curated Vintage Archive</p>
        </div>
        <div style="padding: 28px 24px; color: #23313A;">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${customerName || 'Customer'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5;">Your 1-of-1 archive garments are secured and are being prepared for dispatch via <strong>${courier || 'J&T Express'}</strong>.</p>
          
          <div style="background-color: #F6F1E8; border-radius: 14px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Tracking Code:</strong> <span style="font-family: monospace; font-weight: 700;">${trackingNumber}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Payment Method:</strong> ${paymentMethod || 'COD'}</p>
            <p style="margin: 0; font-size: 16px; font-weight: 700; color: #2F6B4F;">Total Amount: ₱${Number(totalAmount).toFixed(2)}</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/track/${orderId}" style="display: inline-block; background-color: #2F6B4F; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">Track Your Parcel</a>
          </div>
          <p style="font-size: 11px; color: #7A8B7B; text-align: center;">This update was sent to your registered ThriftLoop account: ${recipientEmail}</p>
        </div>
      </div>
    `;
  } else if (type === 'order_status') {
    const { orderId, status, courier, trackingNumber } = data;
    const statusFormatted = (status || '').toUpperCase();
    htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #A8C3A0; border-radius: 20px; overflow: hidden;">
        <div style="background-color: #2F6B4F; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Shipment Update: #${orderId}</h1>
          <p style="color: #A8C3A0; margin: 6px 0 0 0; font-size: 13px;">ThriftLoop Logistics Dispatch</p>
        </div>
        <div style="padding: 28px 24px; color: #23313A;">
          <p style="font-size: 15px; margin-top: 0;">Hi <strong>${customerName || 'Customer'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5;">Your ThriftLoop order <strong>#${orderId}</strong> is now <strong style="color: #2F6B4F;">${statusFormatted}</strong>.</p>
          
          <div style="background-color: #F6F1E8; border-radius: 14px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Courier:</strong> ${courier || 'J&T Express'}</p>
            <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Tracking Code:</strong> <span style="font-family: monospace; font-weight: 700;">${trackingNumber || 'Pending'}</span></p>
            <p style="margin: 0; font-size: 13px;"><strong>Current Status:</strong> <span style="color: #2F6B4F; font-weight: 700;">${statusFormatted}</span></p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${FRONTEND_URL}/track/${orderId}" style="display: inline-block; background-color: #2F6B4F; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">View Live Tracking</a>
          </div>
          <p style="font-size: 11px; color: #7A8B7B; text-align: center;">Sent to your registered email: ${recipientEmail}</p>
        </div>
      </div>
    `;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"ThriftLoop" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: subject || 'ThriftLoop Notification',
      html: htmlContent,
    });
    return { success: true, messageId: info.messageId, deliveredTo: recipientEmail };
  } catch (err) {
    console.warn(`⚠️ Delivery failed to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

app.post('/api/notifications/email', async (req, res) => {
  const { to, user_id, subject, type, data } = req.body;
  if ((!to && !user_id) || !type) {
    return res.status(400).json({ error: 'Recipient registered email or user_id and notification type are required.' });
  }

  const result = await sendEmailNotification({ to, userId: user_id, subject, type, data });
  if (result.success) {
    res.json({ message: `Notification email dispatched successfully to ${result.deliveredTo}.` });
  } else {
    res.status(500).json({ error: result.error || 'Failed to dispatch email notification.' });
  }
});

// ==========================================
// STORE ANNOUNCEMENT BROADCAST ENGINE
// ==========================================
app.get('/api/announcement', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'announcement')
      .maybeSingle();

    if (error || !data) {
      return res.json({ 
        text: 'AUTOMATIC AGING MARKDOWNS ACTIVE ON UNSOLD VINTAGE', 
        is_active: true 
      });
    }
    res.json(data.value);
  } catch {
    res.json({ 
      text: 'AUTOMATIC AGING MARKDOWNS ACTIVE ON UNSOLD VINTAGE', 
      is_active: true 
    });
  }
});

app.post('/api/admin/announcement', async (req, res) => {
  const { text, is_active } = req.body;
  try {
    const payload = {
      text: (text || '').trim().slice(0, 150),
      is_active: Boolean(is_active),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('store_settings')
      .upsert({ key: 'announcement', value: payload });

    if (error) throw error;
    res.json({ message: 'Broadcast updated successfully.', announcement: payload });
  } catch (err) {
    console.error('Announcement update error:', err.message);
    res.status(500).json({ error: 'Failed to update store announcement.' });
  }
});

// ==========================================
// DYNAMIC VOUCHER MANAGEMENT ENGINE
// ==========================================
const DEFAULT_VOUCHERS = {
  VINTAGE20: { code: 'VINTAGE20', type: 'percent', value: 20, min_spend: 0, description: '20% off all archive pieces' },
  LOOP100: { code: 'LOOP100', type: 'fixed', value: 100, min_spend: 600, description: '₱100 off on orders ₱600 and above' },
  FIRSTDROP: { code: 'FIRSTDROP', type: 'percent', value: 15, min_spend: 400, description: '15% welcome discount on first order' },
};

app.get('/api/vouchers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return res.json(Object.values(DEFAULT_VOUCHERS));
    }
    res.json(data);
  } catch {
    res.json(Object.values(DEFAULT_VOUCHERS));
  }
});

app.post('/api/admin/vouchers', async (req, res) => {
  const { code, type, value, min_spend, description } = req.body;
  if (!code || !value) {
    return res.status(400).json({ error: 'Voucher code and value are required.' });
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const cleanType = type === 'fixed' ? 'fixed' : 'percent';
  const cleanValue = parseFloat(value) || 0;
  const cleanMinSpend = parseFloat(min_spend) || 0;

  try {
    const { data, error } = await supabase
      .from('vouchers')
      .upsert({
        code: cleanCode,
        type: cleanType,
        value: cleanValue,
        min_spend: cleanMinSpend,
        description: description?.trim().slice(0, 100) || `${cleanValue}${cleanType === 'percent' ? '%' : '₱'} off discount`,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Save voucher error:', err.message);
    res.status(500).json({ error: 'Failed to save voucher.' });
  }
});

app.delete('/api/admin/vouchers/:code', async (req, res) => {
  const { code } = req.params;
  if (!code) return res.status(400).json({ error: 'Code is required.' });

  try {
    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('code', code.trim().toUpperCase());

    if (error) throw error;
    res.json({ message: `Voucher ${code} removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete voucher.' });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Please provide a voucher code.' });

  const cleanCode = code.trim().toUpperCase();
  const numericSubtotal = parseFloat(subtotal) || 0;

  try {
    const { data: dbVoucher } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    const voucher = dbVoucher || DEFAULT_VOUCHERS[cleanCode];

    if (!voucher) {
      return res.status(404).json({ error: 'Invalid or expired voucher code.' });
    }

    const minSpend = parseFloat(voucher.min_spend || voucher.minSpend || 0);
    if (numericSubtotal < minSpend) {
      return res.status(400).json({ 
        error: `Minimum spend of ₱${minSpend.toFixed(2)} required for ${voucher.code}.` 
      });
    }

    const val = parseFloat(voucher.value);
    const discountAmount = voucher.type === 'percent' 
      ? (numericSubtotal * val) / 100 
      : val;

    res.json({
      valid: true,
      code: voucher.code,
      type: voucher.type,
      value: val,
      discountAmount: Math.min(discountAmount, numericSubtotal),
      description: voucher.description,
    });
  } catch {
    res.status(500).json({ error: 'Could not validate voucher code.' });
  }
});

// ==========================================
// AUTOMATED TELEGRAM DROP POSTING ENGINE
// ==========================================
const postToTelegram = async (product) => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN).trim();
  const channel = (process.env.TELEGRAM_CHANNEL || TELEGRAM_CHANNEL).trim();

  if (!token || !channel) return;

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const safeName = escapeHtml(product.name);
  const safeBrand = escapeHtml(product.brand || 'Vintage Archive');
  const safeSize = escapeHtml(product.size || 'OS');
  const safeGrade = escapeHtml(product.condition_grade || 'Grade A');
  const safeDesc = product.description ? `<i>${escapeHtml(product.description)}</i>\n\n` : '';

  const caption = 
`🔥 <b>NEW ARCHIVE DROP</b>
<b>${safeName}</b>

🏷️ <b>Brand:</b> ${safeBrand}
📏 <b>Size:</b> ${safeSize} (${safeGrade})
💰 <b>Price:</b> ₱${Number(product.price).toFixed(2)}

${safeDesc}🛍️ <a href="${FRONTEND_URL}/product/${product.product_id}">View Piece on ThriftLoop</a>`;

  try {
    const imageUrl = (product.image_url || '').trim();
    const isBase64 = imageUrl.startsWith('data:image');
    const isHttp = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

    if (isBase64 || isHttp) {
      const formData = new FormData();
      formData.append('chat_id', channel);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      if (isBase64) {
        const commaIdx = imageUrl.indexOf(',');
        const meta = imageUrl.slice(0, commaIdx);
        const base64Data = imageUrl.slice(commaIdx + 1);
        const mimeMatch = meta.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpg';
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        formData.append('photo', blob, `drop_${product.product_id || Date.now()}.${ext}`);
      } else {
        formData.append('photo', imageUrl);
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.ok) return;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channel,
        text: caption,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.warn('⚠️ [Telegram Integration] Failed to post to Telegram:', err.message);
  }
};

// ==========================================
// AUTOMATED AGING PRICING CRON
// ==========================================
export const runAgingMarkdownUpdate = async () => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('product_id, name, price, original_price, created_at, status')
      .eq('status', 'active');

    if (error || !products) return;

    const now = new Date();
    let updatedCount = 0;

    for (const p of products) {
      const createdAt = new Date(p.created_at || now);
      const daysUnsold = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      const baselinePrice = parseFloat(p.original_price || p.price);
      let discountRate = 0;

      if (daysUnsold >= 30) discountRate = 0.25;
      else if (daysUnsold >= 14) discountRate = 0.15;
      else if (daysUnsold >= 7) discountRate = 0.10;

      const targetPrice = discountRate > 0
        ? Math.round((baselinePrice * (1 - discountRate)) * 100) / 100
        : baselinePrice;

      if (Math.abs(parseFloat(p.price) - targetPrice) > 0.01 || !p.original_price) {
        await supabase
          .from('products')
          .update({
            original_price: baselinePrice,
            price: targetPrice,
            discount_percent: Math.round(discountRate * 100),
          })
          .eq('product_id', p.product_id);

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`🏷️ [Automated Aging Pricing] Updated markdown for ${updatedCount} backlog pieces.`);
    }
  } catch (err) {
    console.warn('⚠️ Aging markdown update notice:', err.message);
  }
};

setInterval(runAgingMarkdownUpdate, 6 * 60 * 60 * 1000);
setTimeout(runAgingMarkdownUpdate, 10000);

app.post('/api/admin/inventory/apply-markdowns', async (req, res) => {
  await runAgingMarkdownUpdate();
  res.json({ message: 'Automated aging markdown cycle completed successfully.' });
});

// ==========================================
// AUTHENTICATION & REGISTRATION
// ==========================================
app.post('/api/auth/google', async (req, res) => {
  const { credential, access_token, token: genericToken } = req.body;
  const tokenPayload = (credential || genericToken || '').trim();

  if (!tokenPayload && !access_token) {
    return res.status(400).json({ error: 'Google credential or access token is required.' });
  }

  try {
    let email = null;
    let name = null;

    const allowedAudiences = [
      GOOGLE_CLIENT_ID,
      '1089526724617-1e8fas2jq3noffeigk0kh5v7gfsids1f.apps.googleusercontent.com',
    ].filter(Boolean);

    if (tokenPayload) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: tokenPayload,
          audience: allowedAudiences,
        });
        const payload = ticket.getPayload();
        email = payload?.email;
        name = payload?.name;
      } catch (verifyErr) {
        try {
          const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenPayload)}`);
          if (infoRes.ok) {
            const info = await infoRes.json();
            email = info.email;
            name = info.name;
          } else {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenPayload}` },
            });
            if (userRes.ok) {
              const uinfo = await userRes.json();
              email = uinfo.email;
              name = uinfo.name;
            } else {
              throw verifyErr;
            }
          }
        } catch {
          const decoded = jwt.decode(tokenPayload);
          if (decoded && decoded.email && (decoded.iss === 'https://accounts.google.com' || decoded.iss === 'accounts.google.com')) {
            email = decoded.email;
            name = decoded.name;
          } else {
            throw verifyErr;
          }
        }
      }
    } else if (access_token) {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) throw new Error('Could not fetch user profile from Google.');
      const profile = await userRes.json();
      email = profile.email;
      name = profile.name;
    }

    if (!email) {
      return res.status(400).json({ error: 'Unable to extract email from Google identity response.' });
    }

    const { data: existingUser, error: findErr } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (findErr) throw findErr;

    let user = existingUser;

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          full_name: name || 'Google User',
          email: email.trim(),
          password_hash: 'GOOGLE_OAUTH_ACCOUNT',
          role: 'customer',
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    const userId = user.user_id || user.id;
    const token = jwt.sign(
      { user_id: userId, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    safeUser.user_id = userId;
    safeUser.id = userId;
    safeUser.phone = decryptField(safeUser.phone);
    safeUser.street_address = decryptField(safeUser.street_address);
    safeUser.city = decryptField(safeUser.city);
    safeUser.province = decryptField(safeUser.province);
    safeUser.postal_code = decryptField(safeUser.postal_code);

    res.json({ message: 'Google login successful', user: safeUser, token });
  } catch (err) {
    res.status(401).json({ error: `Failed to verify Google identity: ${err.message || 'Unknown error'}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error || !user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = user.user_id || user.id;
    const token = jwt.sign({ user_id: userId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    safeUser.user_id = userId;
    safeUser.id = userId;
    safeUser.phone = decryptField(safeUser.phone);
    safeUser.street_address = decryptField(safeUser.street_address);
    safeUser.city = decryptField(safeUser.city);
    safeUser.province = decryptField(safeUser.province);
    safeUser.postal_code = decryptField(safeUser.postal_code);

    res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: 'Login process failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, phone, street_address, city, province, postal_code } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
    const cleanPostal = String(postal_code || '').replace(/\D/g, '').slice(0, 4);

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        full_name: full_name.trim().slice(0, 60),
        email: email.trim(),
        password_hash: hashedPassword,
        phone: encryptField(cleanPhone),
        street_address: encryptField((street_address || '').trim().slice(0, 150)),
        city: encryptField((city || '').trim().slice(0, 50)),
        province: encryptField((province || '').trim().slice(0, 50)),
        postal_code: encryptField(cleanPostal),
        role: 'customer',
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase Registration Insert Error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    const userId = newUser.user_id || newUser.id;
    const token = jwt.sign({ user_id: userId, email: newUser.email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    
    const safeUser = {
      ...newUser,
      phone: cleanPhone,
      street_address: street_address || '',
      city: city || '',
      province: province || '',
      postal_code: cleanPostal,
    };
    delete safeUser.password_hash;
    safeUser.user_id = userId;
    safeUser.id = userId;

    res.status(201).json({
      message: 'Account registered successfully',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('❌ Registration Exception:', err.message || err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// --- FORGOT & RESET PASSWORD FLOW ---
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Please provide your registered email address.' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, email, full_name')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ error: 'No registered account found with this email address.' });
    }

    const resetToken = jwt.sign(
      { user_id: user.user_id, email: user.email, purpose: 'pwd_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #A8C3A0; border-radius: 20px; overflow: hidden;">
        <div style="background-color: #2F6B4F; padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Password Recovery</h1>
          <p style="color: #A8C3A0; margin: 6px 0 0 0; font-size: 13px;">ThriftLoop Account Security</p>
        </div>
        <div style="padding: 28px 24px; color: #23313A;">
          <p style="font-size: 14px; margin-top: 0;">Hi <strong>${user.full_name || 'Customer'}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.6;">Click the link below to set a new password:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2F6B4F; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #7A8B7B;">This link expires in 1 hour.</p>
        </div>
      </div>
    `;

    await mailTransporter.sendMail({
      from: `"ThriftLoop Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset Your ThriftLoop Password',
      html: emailHtml,
    });

    res.json({ message: `A secure recovery link has been dispatched to ${user.email}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Reset token and new password are required.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'pwd_reset') return res.status(400).json({ error: 'Invalid password reset token.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('user_id', decoded.user_id);

    if (updateErr) throw updateErr;
    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired recovery link.' });
  }
});

// ==========================================
// USER PROFILE & PREFERENCES (ENCRYPTED)
// ==========================================
app.get('/api/users/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, full_name, email, phone, street_address, city, province, postal_code, role, notification_preferences')
      .eq('user_id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({
      ...user,
      phone: decryptField(user.phone),
      street_address: decryptField(user.street_address),
      city: decryptField(user.city),
      province: decryptField(user.province),
      postal_code: decryptField(user.postal_code),
      notification_preferences: user.notification_preferences || { order_tracking_email: true, telegram_drops: true },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { full_name, phone, street_address, city, province, postal_code, notification_preferences } = req.body;
  try {
    const updatePayload = {};
    if (full_name !== undefined) updatePayload.full_name = full_name.trim().slice(0, 60);
    
    if (phone !== undefined) {
      const cleanPhone = String(phone).replace(/\D/g, '').slice(0, 11);
      updatePayload.phone = encryptField(cleanPhone);
    }
    if (street_address !== undefined) updatePayload.street_address = encryptField(street_address.trim().slice(0, 150));
    if (city !== undefined) updatePayload.city = encryptField(city.trim().slice(0, 50));
    if (province !== undefined) updatePayload.province = encryptField(province.trim().slice(0, 50));
    if (postal_code !== undefined) {
      const cleanPostal = String(postal_code).replace(/\D/g, '').slice(0, 4);
      updatePayload.postal_code = encryptField(cleanPostal);
    }
    if (notification_preferences !== undefined) updatePayload.notification_preferences = notification_preferences;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('user_id', req.params.id)
      .select('user_id, full_name, email, phone, street_address, city, province, postal_code, role, notification_preferences')
      .single();

    if (error) throw error;

    const safeUser = {
      ...updated,
      phone: decryptField(updated.phone),
      street_address: decryptField(updated.street_address),
      city: decryptField(updated.city),
      province: decryptField(updated.province),
      postal_code: decryptField(updated.postal_code),
    };

    res.json({
      message: 'Account details saved successfully.',
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update user profile.' });
  }
});

// ==========================================
// CATALOG & PRODUCTS CRUD
// ==========================================
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch {
    res.json([]);
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('product_id', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((p) => ({
      ...p,
      category_name: p.categories?.name || 'Archive Piece',
    }));
    res.json(formatted);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('product_id', req.params.id)
      .single();

    if (error || !product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...product, category_name: product.categories?.name || 'Archive Piece' });
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', async (req, res) => {
  const { 
    category_id, category_name, name, brand, price, size, 
    chest_width, length, condition_grade, description, image_url 
  } = req.body;

  try {
    let finalCatId = category_id || 1;
    if (category_name) {
      const cleanName = category_name.trim();
      let { data: cat } = await supabase
        .from('categories')
        .select('category_id')
        .ilike('name', cleanName)
        .maybeSingle();

      if (!cat) {
        const { data: newCat } = await supabase
          .from('categories')
          .insert([{ name: cleanName }])
          .select('category_id')
          .maybeSingle();
        if (newCat) cat = newCat;
      }
      if (cat) finalCatId = cat.category_id;
    }

    const numericPrice = parseFloat(price);

    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        category_id: finalCatId,
        name,
        brand: brand || '',
        price: numericPrice,
        original_price: numericPrice,
        size: size || 'M',
        chest_width: chest_width || 'N/A',
        length: length || 'N/A',
        condition_grade: condition_grade || 'Grade A',
        description: description || '',
        image_url: image_url || '',
        status: 'active',
      }])
      .select()
      .single();

    if (error) throw error;

    postToTelegram(product).catch(() => null);

    res.status(201).json({ message: 'Product listed successfully', productId: product.product_id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to insert product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { 
    category_id, category_name, name, brand, price, size, 
    chest_width, length, condition_grade, description, image_url 
  } = req.body;

  try {
    let finalCatId = category_id || 1;
    if (category_name) {
      const cleanName = category_name.trim();
      let { data: cat } = await supabase
        .from('categories')
        .select('category_id')
        .ilike('name', cleanName)
        .maybeSingle();

      if (!cat) {
        const { data: newCat } = await supabase
          .from('categories')
          .insert([{ name: cleanName }])
          .select('category_id')
          .maybeSingle();
        if (newCat) cat = newCat;
      }
      if (cat) finalCatId = cat.category_id;
    }

    const updatePayload = {
      category_id: finalCatId,
      name,
      brand: brand || '',
      price: parseFloat(price),
      size: size || 'M',
      chest_width: chest_width || 'N/A',
      length: length || 'N/A',
      condition_grade: condition_grade || 'Grade A',
      description: description || '',
    };
    if (image_url) updatePayload.image_url = image_url;

    const { error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('product_id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('name, status')
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!product) {
      return res.status(404).json({ error: 'Product listing not found.' });
    }

    if (product.status === 'sold') {
      return res.status(409).json({ 
        error: `Cannot delete "${product.name}": this piece has been sold and is archived in order history.` 
      });
    }

    const { count: orderItemsCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (orderItemsCount && orderItemsCount > 0) {
      return res.status(409).json({ 
        error: `Cannot delete "${product.name}": this item is linked to customer orders.` 
      });
    }

    const { error: deleteErr } = await supabase
      .from('products')
      .delete()
      .eq('product_id', productId);

    if (deleteErr) throw deleteErr;
    res.json({ message: `Listing for "${product.name}" removed successfully.` });
  } catch (err) {
    console.error('❌ Deletion restriction error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to remove listing.' });
  }
});

app.patch('/api/products/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const { error } = await supabase.from('products').update({ status }).eq('product_id', req.params.id);
    if (error) throw error;
    res.json({ message: `Status updated to ${status}` });
  } catch {
    res.status(500).json({ error: 'Failed to update garment status' });
  }
});

// ==========================================
// UNIFIED MESSAGING, READ RECEIPTS & ENCRYPTED CHATS
// ==========================================
app.post('/api/messages/conversations', async (req, res) => {
  const { buyer_id, seller_id, product_id } = req.body;
  if (!buyer_id) return res.status(400).json({ error: 'Buyer ID is required.' });

  try {
    let targetSellerId = seller_id;
    if (!targetSellerId) {
      const { data: adminUser } = await supabase
        .from('users')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminUser?.user_id) {
        targetSellerId = adminUser.user_id;
      } else {
        const { data: storeUser } = await supabase
          .from('users')
          .select('user_id')
          .neq('user_id', buyer_id)
          .limit(1)
          .maybeSingle();
        targetSellerId = storeUser?.user_id || buyer_id;
      }
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select(`
        *,
        buyer:users!buyer_id(user_id, full_name, email, role),
        seller:users!seller_id(user_id, full_name, email, role),
        products(product_id, name, price, image_url)
      `)
      .eq('buyer_id', buyer_id)
      .eq('seller_id', targetSellerId)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (product_id && String(existing.product_id) !== String(product_id)) {
        await supabase
          .from('conversations')
          .update({
            product_id,
            last_message_at: new Date().toISOString(),
          })
          .eq('conversation_id', existing.conversation_id);

        const { data: updatedConvo } = await supabase
          .from('conversations')
          .select(`
            *,
            buyer:users!buyer_id(user_id, full_name, email, role),
            seller:users!seller_id(user_id, full_name, email, role),
            products(product_id, name, price, image_url)
          `)
          .eq('conversation_id', existing.conversation_id)
          .single();

        return res.json(updatedConvo || existing);
      }
      return res.json(existing);
    }

    const { data: newConvo, error: createErr } = await supabase
      .from('conversations')
      .insert([{
        buyer_id,
        seller_id: targetSellerId,
        product_id: product_id || null,
        last_message: 'Inquiry started',
        last_message_at: new Date().toISOString(),
      }])
      .select(`
        *,
        buyer:users!buyer_id(user_id, full_name, email, role),
        seller:users!seller_id(user_id, full_name, email, role),
        products(product_id, name, price, image_url)
      `)
      .single();

    if (createErr) throw createErr;
    res.status(201).json(newConvo);
  } catch (err) {
    console.error('❌ Conversation init error:', err.message);
    res.status(500).json({ error: 'Could not initialize messaging thread.' });
  }
});

app.get('/api/messages/conversations/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: convos, error } = await supabase
      .from('conversations')
      .select(`
        conversation_id,
        buyer_id,
        seller_id,
        product_id,
        last_message,
        last_message_at,
        buyer:users!buyer_id(user_id, full_name, email, role),
        seller:users!seller_id(user_id, full_name, email, role),
        products(product_id, name, price, image_url)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    const uniqueMap = new Map();
    (convos || []).forEach((c) => {
      const partnerId = String(c.buyer_id) === String(userId) ? c.seller_id : c.buyer_id;
      if (!uniqueMap.has(partnerId)) {
        uniqueMap.set(partnerId, {
          ...c,
          last_message: decryptField(c.last_message),
        });
      }
    });

    res.json(Array.from(uniqueMap.values()));
  } catch {
    res.status(500).json({ error: 'Could not load conversation list.' });
  }
});

app.get('/api/messages/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const { data: currentConvo } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('conversation_id', conversationId)
      .maybeSingle();

    let query = supabase
      .from('messages')
      .select('*, sender:users!sender_id(user_id, full_name, role, email)')
      .order('created_at', { ascending: true });

    if (currentConvo) {
      const { data: relatedConvos } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('buyer_id', currentConvo.buyer_id)
        .eq('seller_id', currentConvo.seller_id);

      const allIds = (relatedConvos || []).map((rc) => rc.conversation_id);
      if (allIds.length > 0) {
        query = query.in('conversation_id', allIds);
      } else {
        query = query.eq('conversation_id', conversationId);
      }
    } else {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    const decrypted = (messages || []).map(decryptMessage);
    res.json(decrypted);
  } catch {
    const { data: rawMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    res.json((rawMessages || []).map(decryptMessage));
  }
});

app.post('/api/messages', async (req, res) => {
  const { conversation_id, sender_id, receiver_id, message_text, image_url } = req.body;
  if (!conversation_id || !sender_id || (!message_text?.trim() && !image_url)) {
    return res.status(400).json({ error: 'Missing required message parameters or image attachment.' });
  }

  try {
    let resolvedReceiverId = receiver_id;
    if (!resolvedReceiverId) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('conversation_id', conversation_id)
        .maybeSingle();
      if (convo) {
        resolvedReceiverId = String(convo.buyer_id) === String(sender_id) ? convo.seller_id : convo.buyer_id;
      }
    }

    const cleanText = (message_text || '').trim();
    const encryptedText = encryptField(cleanText);

    const payload = {
      conversation_id,
      sender_id,
      receiver_id: resolvedReceiverId || null,
      message_text: encryptedText,
      is_read: false,
    };
    if (image_url) payload.image_url = image_url;

    let { data: newMsg, error: msgErr } = await supabase
      .from('messages')
      .insert([payload])
      .select('*, sender:users!sender_id(user_id, full_name, role, email)')
      .single();

    if (msgErr && image_url) {
      const fallbackPayload = {
        conversation_id,
        sender_id,
        receiver_id: resolvedReceiverId || null,
        message_text: encryptField(`[IMAGE]${image_url}[/IMAGE] ${cleanText}`.trim()),
      };
      const resFallback = await supabase
        .from('messages')
        .insert([fallbackPayload])
        .select('*, sender:users!sender_id(user_id, full_name, role, email)')
        .single();
      newMsg = resFallback.data;
      msgErr = resFallback.error;
    }

    if (msgErr) throw msgErr;

    await supabase
      .from('conversations')
      .update({
        last_message: encryptField(cleanText || (image_url ? '📷 Sent an image' : 'Inquiry update')),
        last_message_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversation_id);

    res.status(201).json(decryptMessage(newMsg));
  } catch (err) {
    console.error('❌ Message delivery error:', err.message || err);
    res.status(500).json({ error: err.message || 'Message failed to send.' });
  }
});

app.patch('/api/messages/conversations/:convoId/read', async (req, res) => {
  const { convoId } = req.params;
  const { userId } = req.body;
  if (!convoId || !userId) return res.json({ success: false });

  try {
    const { data: currentConvo } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('conversation_id', convoId)
      .maybeSingle();

    let allIds = [convoId];
    if (currentConvo) {
      const { data: related } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('buyer_id', currentConvo.buyer_id)
        .eq('seller_id', currentConvo.seller_id);
      if (related && related.length > 0) {
        allIds = related.map((r) => r.conversation_id);
      }
    }

    await supabase
      .from('messages')
      .update({ is_read: true })
      .in('conversation_id', allIds)
      .neq('sender_id', userId);

    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

app.get('/api/messages/unread-status/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data: convos } = await supabase
      .from('conversations')
      .select('conversation_id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (!convos || convos.length === 0) {
      return res.json({ latestIncomingAt: null });
    }

    const convoIds = convos.map((c) => c.conversation_id);

    const { data: latestMsg } = await supabase
      .from('messages')
      .select('created_at')
      .in('conversation_id', convoIds)
      .neq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ latestIncomingAt: latestMsg?.created_at || null });
  } catch {
    res.json({ latestIncomingAt: null });
  }
});

// ==========================================
// CHECKOUT & ORDERS (ENCRYPTED & PROTECTED)
// ==========================================
app.post('/api/checkout/paymongo', async (req, res) => {
  const { 
    items, cart_items, customer, deliveryAddress, 
    referenceNumber, voucherCode, discountAmount = 0, courier = 'J&T Express' 
  } = req.body;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  const productList = items || cart_items || [];

  if (customer?.email === 'admin@thriftloop.com') {
    return res.status(403).json({ error: 'Administrator accounts cannot place customer orders.' });
  }
  if (!productList || productList.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const rawPhone = customer?.phone || '';
  const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(0, 11);
  if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
    return res.status(400).json({ error: 'Please enter a valid 11-digit Philippine mobile number starting with 09.' });
  }

  const rawPostal = deliveryAddress?.postalCode || '';
  const cleanPostal = String(rawPostal).replace(/\D/g, '').slice(0, 4);
  if (cleanPostal.length !== 4) {
    return res.status(400).json({ error: 'Postal code must be exactly 4 digits.' });
  }

  try {
    const productIds = productList.map((i) => i.product_id || i.id);
    const { data: dbItems, error: fetchErr } = await supabase
      .from('products')
      .select('product_id, name, status')
      .in('product_id', productIds);

    if (fetchErr) throw fetchErr;

    const alreadySold = (dbItems || []).filter((item) => item.status === 'sold');
    if (alreadySold.length > 0) {
      return res.status(409).json({
        error: `Piece already taken: ${alreadySold.map((i) => i.name).join(', ')}. 1-of-1 archive garments cannot be double-ordered.`,
      });
    }

    const subtotal = productList.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const baseShipping = courier === 'Lalamove' ? 200 : 80;
    const shippingFee = (courier === 'J&T Express' && subtotal >= 1500) ? 0 : baseShipping;
    const totalAmount = Math.max(0, subtotal - Number(discountAmount)) + shippingFee;
    const discountRatio = subtotal > 0 && discountAmount > 0 ? (subtotal - discountAmount) / subtotal : 1;
    const tracking_number = `${courier === 'Lalamove' ? 'LLM-' : 'JNT-'}${Math.floor(10000000 + Math.random() * 90000000)}`;

    let validUserId = null;
    let registeredEmail = customer?.email?.trim() || '';

    if (registeredEmail) {
      const { data: user } = await supabase
        .from('users')
        .select('user_id, email, full_name, role')
        .ilike('email', registeredEmail)
        .maybeSingle();

      if (user) {
        if (user.role === 'admin' || user.email === 'admin@thriftloop.com') {
          return res.status(403).json({
            error: 'Administrator accounts cannot place customer orders.',
          });
        }
        validUserId = user.user_id;
        registeredEmail = user.email;
      }
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: validUserId,
        customer_name: (customer?.fullName || 'Customer').trim().slice(0, 60),
        email: registeredEmail,
        phone: encryptField(cleanPhone),
        shipping_address: encryptField((deliveryAddress?.streetAddress || '').trim().slice(0, 150)),
        city: encryptField((deliveryAddress?.city || '').trim().slice(0, 50)),
        province: encryptField((deliveryAddress?.province || '').trim().slice(0, 50)),
        postal_code: encryptField(cleanPostal),
        courier: courier || 'J&T Express',
        payment_method: 'PayMongo',
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        voucher_code: voucherCode || null,
        total_amount: totalAmount,
        status: 'pending',
        tracking_number,
      }])
      .select()
      .single();

    if (orderErr) throw orderErr;

    const orderId = newOrder?.order_id || newOrder?.id;

    const orderItemsPayload = productList.map((item) => ({
      order_id: orderId,
      product_id: item.product_id || item.id,
      price_at_purchase: item.price,
      quantity: 1,
    }));
    await supabase.from('order_items').insert(orderItemsPayload);

    try {
      await supabase.from('payments').insert([{
        order_id: orderId,
        user_id: validUserId,
        payment_method: 'PayMongo',
        amount: totalAmount,
        status: 'pending',
        transaction_reference: encryptField(referenceNumber || `PM-${orderId}`),
      }]);
    } catch (paymentErr) {
      console.warn('⚠️ Non-fatal payment record insert notice:', paymentErr.message);
    }

    // Pieces remain active until payment is successfully confirmed in verify route

    const lineItems = productList.map((item) => {
      const itemObj = {
        name: item.name || '1-of-1 Vintage Piece',
        quantity: 1,
        amount: Math.max(100, Math.round(parseFloat(item.price) * discountRatio * 100)),
        currency: 'PHP',
        description: `Size: ${item.size || 'OS'} | ${item.condition_grade || 'Grade A'}`,
      };
      if (item.image_url && item.image_url.startsWith('http')) {
        itemObj.images = [item.image_url];
      }
      return itemObj;
    });

    if (!secretKey || secretKey.includes('your_secret_key')) {
      return res.json({ 
        checkout_url: `${FRONTEND_URL}/confirmation?session_id=mock_cs_${Date.now()}&ref=${referenceNumber}&order_id=${orderId}` 
      });
    }

    const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
    const billing = {
      name: customer.fullName || 'Customer',
      email: registeredEmail,
      phone: cleanPhone,
      address: {
        line1: deliveryAddress.streetAddress || 'Cavite',
        city: deliveryAddress.city || 'Dasmariñas',
        state: deliveryAddress.province || 'Cavite',
        postal_code: cleanPostal,
        country: 'PH',
      },
    };

    const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify({
        data: {
          attributes: {
            billing,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            line_items: lineItems,
            payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
            reference_number: referenceNumber,
            description: `ThriftLoop Order #${orderId} | Ref: ${referenceNumber}`,
            success_url: `${FRONTEND_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}&ref=${referenceNumber}&order_id=${orderId}`,
            cancel_url: `${FRONTEND_URL}/checkout?cancelled=true&order_id=${orderId}`,
          },
        },
      }),
    });

    const data = await paymongoRes.json();
    if (!paymongoRes.ok) throw new Error(data.errors?.[0]?.detail || 'Failed to initialize PayMongo checkout.');

    res.json({ checkout_url: data.data.attributes.checkout_url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Payment provider error.' });
  }
});

app.get('/api/checkout/verify/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { order_id } = req.query;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  let isPaid = true;

  try {
    if (!sessionId.startsWith('mock_cs_') && secretKey && !secretKey.includes('your_secret_key')) {
      const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
      const paymongoRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
        headers: { Authorization: `Basic ${basicAuth}` },
      });
      const data = await paymongoRes.json();
      const payments = data.data?.attributes?.payments || [];
      isPaid = payments.some((p) => p.attributes?.status === 'paid');
    }

    if (isPaid && order_id) {
      // 1. Update order status to processing
      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('order_id', order_id)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();

      // 2. Mark payment record as paid
      try {
        await supabase
          .from('payments')
          .update({ status: 'paid' })
          .eq('order_id', order_id);
      } catch (e) {
        console.warn('⚠️ Payment status update notice:', e.message);
      }

      // 3. 🔒 CRITICAL FIX: Lock purchased pieces to 'sold' in database
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', order_id);

      if (orderItems && orderItems.length > 0) {
        const productIds = orderItems.map((item) => item.product_id);
        await supabase
          .from('products')
          .update({ status: 'sold' })
          .in('product_id', productIds);
      }

      // 4. Dispatch email confirmation
      if (updatedOrder && updatedOrder.email) {
        sendEmailNotification({
          to: updatedOrder.email,
          userId: updatedOrder.user_id,
          subject: `Order Confirmed: #${updatedOrder.order_id} - ThriftLoop Curated Archive`,
          type: 'order_confirmation',
          data: {
            orderId: updatedOrder.order_id,
            customerName: updatedOrder.customer_name,
            courier: updatedOrder.courier,
            trackingNumber: updatedOrder.tracking_number,
            paymentMethod: 'PayMongo Online Payment',
            totalAmount: updatedOrder.total_amount,
          },
        }).catch((mailErr) => console.warn('⚠️ PayMongo confirmation email notice:', mailErr.message));
      }
    }

    res.json({ paid: isPaid, status: isPaid ? 'paid' : 'unpaid' });
  } catch (err) {
    console.error('Payment verification error:', err.message);
    res.status(500).json({ error: 'Could not verify payment session.' });
  }
});

// COD Immediate Placement (Immediate sold lock)
app.post('/api/orders', async (req, res) => {
  const { 
    user_id, customer_name, email, phone, shipping_address, city, province, 
    postal_code, courier, payment_method, cart_items, items, voucher_code, discount_amount = 0 
  } = req.body;

  const productList = cart_items || items || [];

  if (email === 'admin@thriftloop.com') {
    return res.status(403).json({ error: 'Administrator accounts cannot place customer orders.' });
  }
  if (!customer_name || !email || !shipping_address || productList.length === 0) {
    return res.status(400).json({ error: 'Missing required order or shipping details.' });
  }

  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
  if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
    return res.status(400).json({ error: 'Please enter a valid 11-digit Philippine mobile number starting with 09.' });
  }

  const cleanPostal = String(postal_code || '').replace(/\D/g, '').slice(0, 4);
  if (cleanPostal.length !== 4) {
    return res.status(400).json({ error: 'Postal code must be exactly 4 digits.' });
  }

  try {
    const productIds = productList.map((item) => item.product_id || item.id);
    const { data: dbItems, error: fetchErr } = await supabase
      .from('products')
      .select('product_id, name, status')
      .in('product_id', productIds);

    if (fetchErr) throw fetchErr;

    const alreadySold = (dbItems || []).filter((item) => item.status === 'sold');
    if (alreadySold.length > 0) {
      return res.status(409).json({
        error: `Piece already taken: ${alreadySold.map((i) => i.name).join(', ')}. 1-of-1 archive garments cannot be double-ordered.`,
      });
    }

    const subtotal = productList.reduce((sum, item) => sum + Number(item.price), 0);
    const baseShipping = courier === 'Lalamove' ? 200 : 80;
    const shippingFee = (courier === 'J&T Express' && subtotal >= 1500) ? 0 : baseShipping;
    const total_amount = Math.max(0, subtotal - Number(discount_amount)) + shippingFee;
    const tracking_number = `${courier === 'Lalamove' ? 'LLM-' : 'JNT-'}${Math.floor(10000000 + Math.random() * 90000000)}`;

    let validUserId = user_id || null;
    let registeredEmail = email.trim();

    if (validUserId) {
      const { data: registeredUser } = await supabase
        .from('users')
        .select('user_id, email, full_name, role')
        .eq('user_id', validUserId)
        .maybeSingle();

      if (registeredUser) {
        if (registeredUser.role === 'admin' || registeredUser.email === 'admin@thriftloop.com') {
          return res.status(403).json({
            error: 'Administrator accounts cannot place customer orders.',
          });
        }
        registeredEmail = registeredUser.email;
      }
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: validUserId,
        customer_name: customer_name.trim().slice(0, 60),
        email: registeredEmail,
        phone: encryptField(cleanPhone),
        shipping_address: encryptField(shipping_address.trim().slice(0, 150)),
        city: encryptField((city || '').trim().slice(0, 50)),
        province: encryptField((province || '').trim().slice(0, 50)),
        postal_code: encryptField(cleanPostal),
        courier: courier || 'J&T Express',
        payment_method: payment_method || 'Cash on Delivery (COD)',
        subtotal,
        shipping_fee: shippingFee,
        discount_amount,
        voucher_code: voucher_code || null,
        total_amount,
        status: 'pending',
        tracking_number,
      }])
      .select()
      .single();

    if (orderErr) throw orderErr;

    const orderId = newOrder?.order_id || newOrder?.id;

    const orderItemsPayload = productList.map((item) => ({
      order_id: orderId,
      product_id: item.product_id || item.id,
      price_at_purchase: item.price,
      quantity: 1,
    }));
    await supabase.from('order_items').insert(orderItemsPayload);

    try {
      await supabase.from('payments').insert([{
        order_id: orderId,
        user_id: validUserId,
        payment_method: 'Cash on Delivery (COD)',
        amount: total_amount,
        status: 'pending',
        transaction_reference: encryptField(`COD-${orderId}`),
      }]);
    } catch (paymentErr) {
      console.warn('⚠️ Non-fatal COD payment record notice:', paymentErr.message);
    }

    await supabase.from('products').update({ status: 'sold' }).in('product_id', productIds);

    sendEmailNotification({
      to: registeredEmail,
      userId: validUserId,
      subject: `Order Confirmed: #${orderId} - ThriftLoop Curated Archive`,
      type: 'order_confirmation',
      data: {
        orderId,
        customerName: customer_name,
        courier: courier || 'J&T Express',
        trackingNumber: tracking_number,
        paymentMethod: payment_method || 'Cash on Delivery (COD)',
        totalAmount: total_amount,
      },
    }).catch((mailErr) => console.warn('⚠️ COD confirmation email notice:', mailErr.message));

    res.status(201).json({ message: 'Order created successfully', orderId, tracking_number, total_amount });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to process checkout order.' });
  }
});

app.get('/api/orders/user/:identifier', async (req, res) => {
  const { identifier } = req.params;
  if (!identifier) return res.json([]);

  try {
    const cleanId = decodeURIComponent(identifier).trim();
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .order('order_id', { ascending: false });

    if (cleanId.includes('@')) {
      query = query.ilike('email', cleanId);
    } else {
      query = query.eq('user_id', cleanId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    const decryptedOrders = (orders || []).map(decryptOrder);
    res.json(decryptedOrders);
  } catch (err) {
    console.error('Fetch user orders error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user orders.' });
  }
});

app.get('/api/track/:id', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('order_id', req.params.id)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(decryptOrder(order));
  } catch {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  const orderId = req.params.id;
  try {
    const { data: order, error: findErr } = await supabase
      .from('orders')
      .select('*, order_items(product_id), users(email, full_name)')
      .eq('order_id', orderId)
      .single();

    if (findErr || !order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled.' });

    await supabase.from('orders').update({ status: 'cancelled' }).eq('order_id', orderId);

    const pIds = (order.order_items || []).map((oi) => oi.product_id);
    if (pIds.length > 0) {
      await supabase.from('products').update({ status: 'active' }).in('product_id', pIds);
    }

    res.json({ message: `Order #${orderId} cancelled and inventory restored.` });
  } catch {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// --- ADMIN MANAGEMENT & STATS ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const { count: activeCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: soldCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'sold');
    const { count: pendingOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']);

    const { data: completedOrders } = await supabase.from('orders').select('total_amount').neq('status', 'cancelled');
    const totalRevenue = (completedOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    res.json({
      activeCount: activeCount || 0,
      soldCount: soldCount || 0,
      totalRevenue: totalRevenue || 0,
      pendingOrders: pendingOrders || 0,
    });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, users(full_name, email), order_items(*, products(*))')
      .order('order_id', { ascending: false });

    if (error) throw error;

    const formatted = orders.map((o) => {
      const decrypted = decryptOrder(o);
      return {
        ...decrypted,
        customer_name: decrypted.customer_name || decrypted.users?.full_name || 'Guest Customer',
        customer_email: decrypted.users?.email || decrypted.email || '',
      };
    });
    res.json(formatted);
  } catch {
    res.json([]);
  }
});

app.patch('/api/admin/orders/:id', async (req, res) => {
  const { status, tracking_number } = req.body;
  try {
    const updateData = {};
    if (status) updateData.status = status;
    if (tracking_number) updateData.tracking_number = tracking_number;

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('order_id', req.params.id)
      .select('*, order_items(product_id), users(email, full_name)')
      .single();

    if (error) throw error;

    if (status === 'cancelled') {
      const pIds = (order.order_items || []).map((oi) => oi.product_id);
      if (pIds.length > 0) {
        await supabase.from('products').update({ status: 'active' }).in('product_id', pIds);
      }
    }

    if (order && status) {
      sendEmailNotification({
        to: order.email || order.users?.email,
        userId: order.user_id,
        subject: `Shipment Update: Order #${order.order_id} (${status.toUpperCase()}) - ThriftLoop Logistics`,
        type: 'order_status',
        data: {
          orderId: order.order_id,
          customerName: order.customer_name || order.users?.full_name,
          status,
          courier: order.courier,
          trackingNumber: order.tracking_number,
        },
      }).catch((err) => console.warn('⚠️ Order status notification notice:', err.message));
    }

    res.json({ message: 'Order status updated successfully.' });
  } catch {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('status, order_items(product_id)')
      .eq('order_id', orderId)
      .single();

    if (order && order.status !== 'delivered') {
      const pIds = (order.order_items || []).map((oi) => oi.product_id);
      if (pIds.length > 0) {
        await supabase.from('products').update({ status: 'active' }).in('product_id', pIds);
      }
    }

    await supabase.from('order_items').delete().eq('order_id', orderId);
    try {
      await supabase.from('payments').delete().eq('order_id', orderId);
    } catch (e) {
      console.warn('⚠️ Payment delete notice:', e.message);
    }
    const { error } = await supabase.from('orders').delete().eq('order_id', orderId);

    if (error) throw error;
    res.json({ message: `Order #${orderId} permanently deleted.` });
  } catch {
    res.status(500).json({ error: 'Failed to delete order record.' });
  }
});

// ==========================================
// AI CONCIERGE (GEMINI-3.8-FLASH)
// ==========================================
app.post('/api/chat', async (req, res) => {
  const { message, user_id, email, current_order_id, image } = req.body;
  if (!message && !image) return res.status(400).json({ error: 'Message or image is required' });

  if (!cleanedGeminiKey || cleanedGeminiKey.includes('YourGeminiKey')) {
    return res.json({ reply: '⚠️ AI Concierge Notice: GEMINI_API_KEY is not configured in backend environment variables.' });
  }

  try {
    const { data: products } = await supabase
      .from('products')
      .select('product_id, name, price, size, chest_width, length, condition_grade')
      .eq('status', 'active')
      .limit(25);

    const catalogSummary = (products && products.length > 0)
      ? products.map((p) => `- [#${p.product_id}] ${p.name} (Size: ${p.size || 'OS'}, PTP: ${p.chest_width || 'N/A'}, Length: ${p.length || 'N/A'}, Grade: ${p.condition_grade || 'Grade A'}, Price: ₱${p.price})`).join('\n')
      : 'No items currently in stock.';

    let orderContext = 'No order records associated with this guest session.';
    const orderMatch = (message || '').match(/#?(\b\d+\b)/);
    const targetOrderId = current_order_id || (orderMatch ? parseInt(orderMatch[1], 10) : null);

    if (targetOrderId || user_id || email) {
      let ordersQuery = supabase.from('orders').select('*');

      if (targetOrderId) {
        ordersQuery = ordersQuery.eq('order_id', targetOrderId);
      } else if (user_id) {
        ordersQuery = ordersQuery.eq('user_id', user_id).order('order_id', { ascending: false }).limit(3);
      } else if (email) {
        ordersQuery = ordersQuery.ilike('email', email.trim()).order('order_id', { ascending: false }).limit(3);
      }

      const { data: userOrders, error: orderErr } = await ordersQuery;

      if (!orderErr && userOrders && userOrders.length > 0) {
        orderContext = userOrders.map((o) => 
          `- Order #${o.order_id}: Status = ${(o.status || '').toUpperCase()}, Courier = ${o.courier || 'J&T'}, Tracking Number = ${o.tracking_number || 'Assigning'}, Total = ₱${o.total_amount}`
        ).join('\n');
      }
    }

    const systemInstruction = `You are 'Loopie', the AI stylist and order logistics concierge for 'ThriftLoop'—an online curated vintage boutique in the Philippines.

YOUR CORE RESPONSIBILITIES:
1. VINTAGE CATALOG & SIZING: Answer customer questions regarding specific archive pieces, sizing, chest width (pit-to-pit / PTP flat-lay in inches), lengths, condition grading (Excellent, Good, Used but not abused, Flawed), outfit pairings, and sustainable clothing care.
2. GARMENT IMAGE ANALYSIS: If the user provides an image, inspect it for vintage style aesthetics, garment condition, distressing, and authenticity advice.
3. SHIPMENT & LOGISTICS UPDATES: If the customer asks about order status, tracking, or delivery timing (e.g., "Where is my order #4?"), refer directly to BUYER ORDER RECORDS below. Explain whether the package is pending, processing, shipped, or delivered, report their tracking number, and specify courier turnaround (J&T Express 2-4 days standard, Lalamove same-day metro).

CURRENT ACTIVE INVENTORY:
${catalogSummary}

BUYER ORDER RECORDS:
${orderContext}

GUIDELINES:
- Always quote prices in Philippine Pesos (₱).
- Keep answers warm, concise, and helpful.`;

    const parts = [{ text: message || 'Please analyze this garment image.' }];

    if (image && typeof image === 'string' && image.startsWith('data:image')) {
      const commaIdx = image.indexOf(',');
      const meta = image.slice(0, commaIdx);
      const mimeMatch = meta.match(/data:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = image.slice(commaIdx + 1);

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    }

    const targetModel = 'gemini-3.8-flash';
    let lastError = null;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: parts,
          config: { systemInstruction },
        });
        if (response?.text) {
          return res.json({ reply: response.text });
        }
      } catch (sdkErr) {
        lastError = sdkErr.message;
      }
    }

    try {
      const restParts = parts.map((p) => {
        if (p.inlineData) {
          return {
            inlineData: {
              mimeType: p.inlineData.mimeType,
              data: p.inlineData.data,
            },
          };
        }
        return { text: p.text };
      });

      const restRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanedGeminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: restParts }],
          }),
        }
      );
      const restData = await restRes.json();
      if (restRes.ok && restData?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.json({ reply: restData.candidates[0].content.parts[0].text });
      }
      if (restData.error) {
        lastError = restData.error.message || JSON.stringify(restData.error);
      }
    } catch (restErr) {
      lastError = restErr.message;
    }

    res.json({
      reply: `[Loopie Notice: ${lastError || 'Unable to consult catalog records. Please check Render GEMINI_API_KEY settings.'}]`,
    });
  } catch (err) {
    res.json({ reply: `[System Error: ${err.message}]` });
  }
});

app.get('/api/blog/posts', (req, res) => {
  res.json([]);
});

app.use((err, req, res, next) => {
  console.error('❌ Server Middleware Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 ThriftLoop API Server running on http://localhost:${PORT}`);
});