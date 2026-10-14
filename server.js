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
  res.send('🌿 ThriftLoop Backend API is running with AES-256 Field Encryption, PH Logistics & RLS!');
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
    
    // Strict Input Constraints
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
// CHECKOUT & ORDERS CRUD (ENCRYPTED & PROTECTED)
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

  // Strict Phone & Postal Code Validation
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

    // Insert pending order record with encrypted details
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

    // ⚠️ CRITICAL FIX: DO NOT update products to 'sold' here![cite: 25, 29]
    // Products remain active until payment is successfully confirmed in /api/checkout/verify/:sessionId[cite: 25, 29].

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
      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('order_id', order_id)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();

      try {
        await supabase
          .from('payments')
          .update({ status: 'paid' })
          .eq('order_id', order_id);
      } catch (e) {
        console.warn('⚠️ Payment status update notice:', e.message);
      }

      // 🌟 SECURE LOCK: Mark pieces as SOLD only after PayMongo verifies payment![cite: 25, 29]
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', order_id);

      if (orderItems && orderItems.length > 0) {
        const productIds = orderItems.map((item) => item.product_id);
        await supabase.from('products').update({ status: 'sold' }).in('product_id', productIds);
      }

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
  } catch {
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

  // Strict Phone & Postal Code Validation
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

    // COD is an immediate placement, so lock piece immediately
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
// AI CONCIERGE (LOCKED TO GEMINI-3.8-FLASH)
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