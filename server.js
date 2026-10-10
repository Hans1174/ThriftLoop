import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());

// High-capacity body parser for base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'thriftloop_super_secret_jwt_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1089526724617-1e8fas2jq3noffeigk0kh5v7gfsids1f.apps.googleusercontent.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 1. Initialize Supabase Cloud Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

console.log('✅ Connected to Supabase Cloud PostgreSQL');

// Root status route
app.get('/', (req, res) => {
  res.send('🌿 ThriftLoop Backend API is running on Supabase!');
});

// 2. Services
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// Verify SMTP connection on startup
mailTransporter.verify((error) => {
  if (error) {
    console.error('❌ Nodemailer SMTP Connection Failed:', error.message);
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
      .select('email, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (registeredUser?.email) {
      recipientEmail = registeredUser.email;
      customerName = customerName || registeredUser.full_name;
    }
  }

  if (!recipientEmail || !process.env.EMAIL_USER) {
    console.warn(`⚠️ Notification skipped: No registered email address or EMAIL_USER unconfigured.`);
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
  } else if (type === 'direct_message') {
    const { senderName, messageText, productName, conversationId } = data;
    htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #A8C3A0; border-radius: 20px; overflow: hidden;">
        <div style="background-color: #2F6B4F; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">New Customer Message</h1>
          <p style="color: #A8C3A0; margin: 4px 0 0 0; font-size: 12px;">ThriftLoop Direct Inquiry</p>
        </div>
        <div style="padding: 24px; color: #23313A;">
          <p style="font-size: 14px; margin-top: 0;">Hi <strong>${customerName || 'Seller'}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.5;">You received a message from <strong>${senderName || 'A customer'}</strong>${productName ? ` regarding <em>${productName}</em>` : ''}:</p>
          
          <div style="background-color: #F6F1E8; border-radius: 14px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; font-style: italic;">"${messageText}"</p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${FRONTEND_URL}/admin" style="display: inline-block; background-color: #2F6B4F; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 12px 24px; border-radius: 10px;">Reply in Dashboard</a>
          </div>
          <p style="font-size: 11px; color: #7A8B7B; text-align: center;">Notification sent to ${recipientEmail}</p>
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
    console.error('❌ Notification Engine error:', err.message);
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

// 3. Voucher Rules
const ACTIVE_VOUCHERS = {
  VINTAGE20: { code: 'VINTAGE20', type: 'percent', value: 20, minSpend: 0, description: 'Flash Drop: 20% off all archive pieces' },
  LOOP100: { code: 'LOOP100', type: 'fixed', value: 100, minSpend: 600, description: '₱100 off on orders ₱600 and above' },
  FIRSTDROP: { code: 'FIRSTDROP', type: 'percent', value: 15, minSpend: 400, description: '15% welcome discount on your first order' },
};

// ==========================================
// AUTOMATED AGING PRICING
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
    console.error('⚠️ Aging markdown update error:', err.message);
  }
};

setInterval(runAgingMarkdownUpdate, 6 * 60 * 60 * 1000);
setTimeout(runAgingMarkdownUpdate, 10000);

app.post('/api/admin/inventory/apply-markdowns', async (req, res) => {
  await runAgingMarkdownUpdate();
  res.json({ message: 'Automated aging markdown cycle completed successfully.' });
});

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential token is required.' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const { email, name } = ticket.getPayload();

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let user = existingUser;

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          full_name: name,
          email,
          password_hash: 'GOOGLE_OAUTH_ACCOUNT',
          role: 'customer',
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Google login successful', user, token });
  } catch (err) {
    res.status(401).json({ error: 'Failed to verify Google identity.' });
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

    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: 'Login process failed.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password, phone, street_address, city, province, postal_code } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ error: 'Please provide all required fields.' });

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        full_name: full_name.trim(),
        email: email.trim(),
        password_hash: hashedPassword,
        phone: phone || '',
        street_address: street_address || '',
        city: city || '',
        province: province || '',
        postal_code: postal_code || '',
        role: 'customer',
      }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ user_id: newUser.user_id, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = newUser;
    res.status(201).json({
      message: 'Account registered successfully',
      user: safeUser,
      token,
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
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
          <p style="font-size: 13px; line-height: 1.6;">A password recovery request was initiated for your registered ThriftLoop account (<strong>${user.email}</strong>). Click the link below to set a new password:</p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2F6B4F; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 14px 28px; border-radius: 12px;">Reset Password</a>
          </div>

          <p style="font-size: 12px; color: #7A8B7B; line-height: 1.4;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
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
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'pwd_reset') {
      return res.status(400).json({ error: 'Invalid password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('user_id', decoded.user_id);

    if (updateErr) throw updateErr;

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('❌ Reset password verification error:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'This recovery link has expired. Please request a new one.' });
    }
    res.status(400).json({ error: 'Invalid or expired recovery link.' });
  }
});

// --- VOUCHER VALIDATION ---

app.post('/api/vouchers/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Please provide a voucher code.' });

  const voucher = ACTIVE_VOUCHERS[code.trim().toUpperCase()];
  if (!voucher) return res.status(404).json({ error: 'Invalid or expired voucher code.' });

  const numericSubtotal = parseFloat(subtotal) || 0;
  if (numericSubtotal < voucher.minSpend) {
    return res.status(400).json({ error: `Minimum spend of ₱${voucher.minSpend.toFixed(2)} required for ${voucher.code}.` });
  }

  const discountAmount = voucher.type === 'percent' ? (numericSubtotal * voucher.value) / 100 : voucher.value;
  res.json({
    valid: true,
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    discountAmount: Math.min(discountAmount, numericSubtotal),
    description: voucher.description,
  });
});

// --- CATALOG & INVENTORY ROUTES ---

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
  } catch (err) {
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
  } catch (err) {
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
      const { data: cat } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', category_name)
        .maybeSingle();
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
      const { data: cat } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', category_name)
        .maybeSingle();
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
  try {
    const { error } = await supabase.from('products').delete().eq('product_id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product listing removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove listing' });
  }
});

app.patch('/api/products/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const { error } = await supabase.from('products').update({ status }).eq('product_id', req.params.id);
    if (error) throw error;
    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update garment status' });
  }
});

// ==========================================
// BUYER-TO-SELLER DIRECT MESSAGING ROUTES
// ==========================================

// 1. Get or Create a Direct Thread between Buyer and Seller (Admin)
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
      targetSellerId = adminUser?.user_id || 1;
    }

    let query = supabase
      .from('conversations')
      .select('*, products(name, price, image_url)')
      .eq('buyer_id', buyer_id)
      .eq('seller_id', targetSellerId);

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) {
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
      .select('*, products(name, price, image_url)')
      .single();

    if (createErr) throw createErr;
    res.status(201).json(newConvo);
  } catch (err) {
    console.error('❌ Conversation creation failed:', err.message);
    res.status(500).json({ error: 'Could not initialize messaging thread.' });
  }
});

// 2. Fetch User's Conversations (Inbox for Buyer or Seller)
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
        buyer:users!buyer_id(user_id, full_name, email),
        seller:users!seller_id(user_id, full_name, email),
        products(product_id, name, price, image_url)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    res.json(convos || []);
  } catch (err) {
    console.error('❌ Failed to fetch user conversations:', err.message);
    res.status(500).json({ error: 'Could not load conversation list.' });
  }
});

// 3. Fetch Message History for a Specific Thread
app.get('/api/messages/:conversationId', async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:users(user_id, full_name, role)')
      .eq('conversation_id', req.params.conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(messages || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// 4. Send Message (Direct Communication with Email Notification)
app.post('/api/messages', async (req, res) => {
  const { conversation_id, sender_id, receiver_id, message_text } = req.body;
  if (!conversation_id || !sender_id || !message_text?.trim()) {
    return res.status(400).json({ error: 'Missing required message parameters.' });
  }

  try {
    const { data: newMsg, error: msgErr } = await supabase
      .from('messages')
      .insert([{
        conversation_id,
        sender_id,
        receiver_id: receiver_id || null,
        message_text: message_text.trim(),
      }])
      .select('*, sender:users(user_id, full_name, role)')
      .single();

    if (msgErr) throw msgErr;

    // Update conversation metadata
    await supabase
      .from('conversations')
      .update({
        last_message: message_text.trim(),
        last_message_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversation_id);

    // Alert the receiver via registered email if they are not active
    if (receiver_id) {
      const { data: convo } = await supabase
        .from('conversations')
        .select('products(name)')
        .eq('conversation_id', conversation_id)
        .maybeSingle();

      sendEmailNotification({
        userId: receiver_id,
        subject: `New Message from ${newMsg.sender?.full_name || 'Customer'} on ThriftLoop`,
        type: 'direct_message',
        data: {
          senderName: newMsg.sender?.full_name || 'Customer',
          messageText: message_text.trim(),
          productName: convo?.products?.name || '',
          conversationId,
        },
      });
    }

    res.status(201).json(newMsg);
  } catch (err) {
    console.error('❌ Failed to post message:', err.message);
    res.status(500).json({ error: 'Message failed to send.' });
  }
});

// ==========================================
// CHECKOUT & ORDERS CRUD
// ==========================================

// --- PAYMONGO CHECKOUT ---
app.post('/api/checkout/paymongo', async (req, res) => {
  const { 
    items, cart_items, customer, deliveryAddress, 
    referenceNumber, voucherCode, discountAmount = 0, courier = 'J&T Express' 
  } = req.body;
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  const productList = items || cart_items || [];

  if (customer?.email === 'admin@thriftloop.com') {
    return res.status(403).json({ error: 'Admin accounts cannot place customer orders.' });
  }
  if (!productList || productList.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
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
        .select('user_id, email, full_name')
        .ilike('email', registeredEmail)
        .maybeSingle();

      if (user) {
        validUserId = user.user_id;
        registeredEmail = user.email;
      }
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: validUserId,
        customer_name: customer?.fullName || 'Customer',
        email: registeredEmail,
        phone: customer?.phone || '',
        shipping_address: deliveryAddress?.streetAddress || '',
        city: deliveryAddress?.city || '',
        province: deliveryAddress?.province || '',
        postal_code: deliveryAddress?.postalCode || '',
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

    await supabase.from('payments').insert([{
      order_id: orderId,
      user_id: validUserId,
      payment_method: 'PayMongo',
      amount: totalAmount,
      status: 'pending',
      transaction_reference: referenceNumber || `PM-${orderId}`,
    }]).catch(() => null);

    await supabase.from('products').update({ status: 'sold' }).in('product_id', productIds);

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
      address: {
        line1: deliveryAddress.streetAddress || 'Metro Manila',
        city: deliveryAddress.city || 'City',
        state: deliveryAddress.province || 'Province',
        postal_code: deliveryAddress.postalCode || '1000',
        country: 'PH',
      },
    };
    if (customer.phone && customer.phone.trim().length >= 7) {
      billing.phone = customer.phone.trim();
    }

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
    console.error('❌ Supabase PayMongo Checkout Error:', err.message || err);
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
        .select('*, users(email, full_name)')
        .maybeSingle();

      await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('order_id', order_id)
        .catch(() => null);

      if (updatedOrder) {
        sendEmailNotification({
          userId: updatedOrder.user_id,
          to: updatedOrder.users?.email || updatedOrder.email,
          subject: `ThriftLoop Order Confirmed: #${updatedOrder.order_id}`,
          type: 'order_confirmation',
          data: {
            orderId: updatedOrder.order_id,
            customerName: updatedOrder.users?.full_name || updatedOrder.customer_name,
            courier: updatedOrder.courier,
            trackingNumber: updatedOrder.tracking_number,
            paymentMethod: 'PayMongo (Paid Online)',
            totalAmount: updatedOrder.total_amount,
          },
        });
      }
    }

    res.json({ paid: isPaid, status: isPaid ? 'paid' : 'unpaid' });
  } catch (err) {
    res.status(500).json({ error: 'Could not verify payment session.' });
  }
});

// --- CASH ON DELIVERY (COD) ROUTE ---
app.post('/api/orders', async (req, res) => {
  const { 
    user_id, customer_name, email, phone, shipping_address, city, province, 
    postal_code, courier, payment_method, cart_items, items, voucher_code, discount_amount = 0 
  } = req.body;

  const productList = cart_items || items || [];

  if (email === 'admin@thriftloop.com') {
    return res.status(403).json({ error: 'Admin accounts cannot place customer orders.' });
  }
  if (!customer_name || !email || !shipping_address || productList.length === 0) {
    return res.status(400).json({ error: 'Missing required order or shipping details.' });
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
        .select('user_id, email, full_name')
        .eq('user_id', validUserId)
        .maybeSingle();

      if (registeredUser?.email) {
        registeredEmail = registeredUser.email;
      }
    } else if (registeredEmail) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('user_id, email, full_name')
        .ilike('email', registeredEmail)
        .maybeSingle();

      if (userByEmail) {
        validUserId = userByEmail.user_id;
        registeredEmail = userByEmail.email;
      }
    }

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: validUserId,
        customer_name,
        email: registeredEmail,
        phone: phone || '',
        shipping_address,
        city: city || '',
        province: province || '',
        postal_code: postal_code || '',
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

    await supabase.from('payments').insert([{
      order_id: orderId,
      user_id: validUserId,
      payment_method: 'Cash on Delivery (COD)',
      amount: total_amount,
      status: 'pending',
      transaction_reference: `COD-${orderId}`,
    }]).catch(() => null);

    await supabase.from('products').update({ status: 'sold' }).in('product_id', productIds);

    sendEmailNotification({
      userId: validUserId,
      to: registeredEmail,
      subject: `ThriftLoop Order #${orderId} Confirmed`,
      type: 'order_confirmation',
      data: {
        orderId,
        customerName: customer_name,
        courier: courier || 'J&T Express',
        trackingNumber: tracking_number,
        paymentMethod: payment_method || 'Cash on Delivery (COD)',
        totalAmount: total_amount,
      },
    });

    res.status(201).json({ message: 'Order created successfully', orderId, tracking_number, total_amount });
  } catch (err) {
    console.error('❌ COD Checkout Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process checkout order.' });
  }
});

// --- TRACKING & USER ORDERS ---

app.get('/api/track/:id', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('order_id', req.params.id)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/orders/user/:email', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_id, status, courier, tracking_number, total_amount, created_at')
      .ilike('email', req.params.email.trim())
      .order('order_id', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(orders || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders.' });
  }
});

// Cancel Order & Restore Stock
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

    sendEmailNotification({
      userId: order.user_id,
      to: order.users?.email || order.email,
      subject: `ThriftLoop Order #${orderId} Cancelled`,
      type: 'order_status',
      data: {
        orderId,
        customerName: order.users?.full_name || order.customer_name,
        status: 'cancelled',
        courier: order.courier,
        trackingNumber: order.tracking_number,
      },
    });

    res.json({ message: `Order #${orderId} cancelled and inventory restored.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// --- ADMIN MANAGEMENT ---

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
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, users(full_name, email)')
      .order('order_id', { ascending: false });

    if (error) throw error;

    const formatted = orders.map((o) => ({
      ...o,
      customer_name: o.customer_name || o.users?.full_name || 'Guest Customer',
      customer_email: o.users?.email || o.email || '',
    }));
    res.json(formatted);
  } catch (err) {
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
        userId: order.user_id,
        to: order.users?.email || order.email,
        subject: `ThriftLoop Order Update: #${req.params.id} ${status.toUpperCase()}`,
        type: 'order_status',
        data: {
          orderId: req.params.id,
          customerName: order.users?.full_name || order.customer_name,
          status,
          courier: order.courier,
          trackingNumber: order.tracking_number,
        },
      });
    }

    res.json({ message: 'Order status updated and notification sent to registered account.' });
  } catch (err) {
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
    await supabase.from('payments').delete().eq('order_id', orderId).catch(() => null);
    const { error } = await supabase.from('orders').delete().eq('order_id', orderId);

    if (error) throw error;
    res.json({ message: `Order #${orderId} permanently deleted and inventory updated.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order record.' });
  }
});

// --- AI STYLIST & LOGISTICS CONCIERGE (gemini-3.6) ---

app.post('/api/chat', async (req, res) => {
  const { message, user_id, email, current_order_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('YourGeminiKey')) {
    return res.json({ reply: '⚠️ AI Concierge Notice: GEMINI_API_KEY is not configured in your .env file.' });
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

    let orderContext = 'No order records found for this session.';
    const orderMatch = message.match(/#?(\b\d+\b)/);
    const targetOrderId = current_order_id || (orderMatch ? parseInt(orderMatch[1], 10) : null);

    let ordersQuery = supabase.from('orders').select('*');

    if (targetOrderId) {
      ordersQuery = ordersQuery.eq('order_id', targetOrderId);
    } else if (user_id) {
      ordersQuery = ordersQuery.eq('user_id', user_id).order('order_id', { ascending: false }).limit(3);
    } else if (email) {
      ordersQuery = ordersQuery.ilike('email', email.trim()).order('order_id', { ascending: false }).limit(3);
    }

    const { data: userOrders } = await ordersQuery;

    if (userOrders && userOrders.length > 0) {
      orderContext = userOrders.map((o) => 
        `- Order #${o.order_id}: Status = ${o.status.toUpperCase()}, Courier = ${o.courier}, Tracking Number = ${o.tracking_number || 'Assigning'}, Total = ₱${o.total_amount}, Destination = ${o.city || 'Metro'}, Placed on = ${new Date(o.created_at).toLocaleDateString()}`
      ).join('\n');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: message,
      config: {
        systemInstruction: `You are 'Loopie', the AI stylist and order logistics concierge for 'ThriftLoop'—an online curated vintage boutique in the Philippines.

YOUR CORE RESPONSIBILITIES:
1. VINTAGE CATALOG & SIZING: Answer customer questions regarding specific archive pieces, sizing, chest width (pit-to-pit / PTP flat-lay in inches), lengths, condition grading (Deadstock, Grade A, Grade B), outfit pairings, and sustainable clothing care.
2. SHIPMENT & LOGISTICS UPDATES: If the customer asks about order status, tracking, or delivery timing (e.g., "Where is my order #4?"), refer directly to BUYER ORDER RECORDS below. Explain whether the package is pending, processing, shipped, or delivered, report their tracking number, and specify courier turnaround (J&T Express 2-4 days standard, Lalamove same-day metro).

CURRENT ACTIVE INVENTORY:
${catalogSummary}

BUYER ORDER RECORDS:
${orderContext}

GUIDELINES:
- Always quote prices in Philippine Pesos (₱).
- Keep answers warm, concise, and helpful.`,
      },
    });

    res.json({ reply: response.text || 'I could not retrieve styling or tracking details right now.' });
  } catch (err) {
    res.json({ reply: `Concierge notice: ${err.message || 'Unable to consult records.'}` });
  }
});

// --- GLOBAL ERROR HANDLER ---
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