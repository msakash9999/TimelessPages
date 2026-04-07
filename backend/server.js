require("dotenv").config({ quiet: true });

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const User = require("./models/User");
const Admin = require("./models/Admin");
const Book = require("./models/Book");
const Seller = require("./models/Seller");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("./utils/mailer");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_jwt_key_for_dev_only";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY
});

// Configure Multer (memory storage so we can pipe to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const frontendDir = path.join(__dirname, "..", "frontend");
const activeAdminSessions = new Map();
const activeSellerSessions = new Map();
const featuredSeedBooks = require("./seedData");
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@timelesspages.com").toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || "TimelessPages Admin";
const USER_SESSION_COOKIE = "tp_user_session";
const ADMIN_SESSION_COOKIE = "tp_admin_session";
const SELLER_SESSION_COOKIE = "tp_seller_session";

app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Force seed route for debugging/initialization
app.get("/force-seed", async (req, res) => {
  try {
    await seedBooks();
    res.json({ message: "Seeding manual trigger successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/books/science", async (req, res) => {
  try {
    const books = await Book.find({ category: "science" }).sort({ createdAt: -1 }).limit(30);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use(express.static(frontendDir));

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");

  if (derivedKey.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, hashBuffer);
}

async function verifyUserPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash) {
    return false;
  }

  if (storedHash.includes(":")) {
    return verifyPassword(password, storedHash);
  }

  return bcrypt.compare(password, storedHash);
}

function createAdminToken(admin) {
  const token = crypto.randomBytes(32).toString("hex");
  activeAdminSessions.set(token, {
    adminId: admin._id.toString(),
    email: admin.email,
    name: admin.name
  });
  return token;
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  if (!header) {
    return {};
  }

  return header.split(";").reduce((cookies, entry) => {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join("=") || "");
    return cookies;
  }, {});
}

function getSessionCookieOptions(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  return {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs
  };
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge / 1000))}`);
  }
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.secure) {
    segments.push("Secure");
  }
  if (options.sameSite) {
    segments.push(`SameSite=${options.sameSite}`);
  }

  segments.push(`Path=${options.path || "/"}`);
  return segments.join("; ");
}

function setSessionCookie(res, name, value, options) {
  res.append("Set-Cookie", serializeCookie(name, value, options));
}

function clearSessionCookie(res, name) {
  setSessionCookie(res, name, "", { ...getSessionCookieOptions(0), maxAge: 0 });
}

function buildLoginRedirect(loginPath, nextPath) {
  const params = new URLSearchParams({
    next: nextPath,
    reason: "protected"
  });
  return `${loginPath}?${params.toString()}`;
}

function requireAdminPageSession(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE];
  const session = activeAdminSessions.get(token);

  if (!session) {
    return res.redirect(buildLoginRedirect("/admin-login.html", req.path));
  }

  req.adminSession = session;
  next();
}

function requireSellerPageSession(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[SELLER_SESSION_COOKIE];
  const session = activeSellerSessions.get(token);

  if (!session || session.blocked) {
    return res.redirect(buildLoginRedirect("/seller-login.html", req.path));
  }

  req.sellerSession = session;
  next();
}

function requireUserPageSession(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[USER_SESSION_COOKIE];

  if (!token) {
    return res.redirect(buildLoginRedirect("/login.html", req.path));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userSession = payload;
    next();
  } catch (error) {
    return res.redirect(buildLoginRedirect("/login.html", req.path));
  }
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const session = activeAdminSessions.get(token);

  if (!session) {
    return res.status(401).json({ message: "Admin login required" });
  }

  req.adminSession = session;
  next();
}

function createSellerToken(seller) {
  const token = crypto.randomBytes(32).toString("hex");
  activeSellerSessions.set(token, {
    sellerId: seller._id.toString(),
    email: seller.email,
    name: seller.name,
    storeName: seller.storeName,
    blocked: seller.blocked
  });
  return token;
}

function requireSeller(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const session = activeSellerSessions.get(token);

  if (!session) {
    return res.status(401).json({ message: "Seller login required" });
  }
  if (session.blocked) {
    return res.status(403).json({ message: "Your seller account has been blocked." });
  }

  req.sellerSession = session;
  next();
}

function requireAdminOrSeller(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const adminSession = activeAdminSessions.get(token);
  if (adminSession) {
    req.adminSession = adminSession;
    return next();
  }

  const sellerSession = activeSellerSessions.get(token);
  if (sellerSession) {
    if (sellerSession.blocked) {
      return res.status(403).json({ message: "Your seller account has been blocked." });
    }
    req.sellerSession = sellerSession;
    return next();
  }

  return res.status(401).json({ message: "Login required (Admin or Seller)" });
}

function requireUser(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userSession = payload; // { userId, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session token" });
  }
}

async function seedAdmin() {
  const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (existingAdmin) return existingAdmin;

  const admin = new Admin({
    email: DEFAULT_ADMIN_EMAIL,
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    name: DEFAULT_ADMIN_NAME
  });

  await admin.save();
  return admin;
}



function normalizeBookPayload(body) {
  if (!body || typeof body !== 'object') throw new Error("Invalid request body");
  return {
    title: String(body.title || "").trim(),
    author: String(body.author || "").trim(),
    price: Number(body.price),
    imageUrl: String(body.imageUrl || "").trim(),
    category: String(body.category || "").trim().toLowerCase(),
    description: String(body.description || "").trim(),
    featured: body.featured === true || body.featured === 'true'
  };
}



app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/admin.html", requireAdminPageSession, (req, res) => {
  res.sendFile(path.join(frontendDir, "admin.html"));
});

app.get("/seller-dashboard.html", requireSellerPageSession, (req, res) => {
  res.sendFile(path.join(frontendDir, "seller-dashboard.html"));
});



app.get("/books/science", async (req, res) => {
  try {
    const books = await Book.find({ category: "science" }).sort({ createdAt: -1 }).limit(30);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use(express.static(frontendDir));

function createVerificationToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, purpose: "email_verification" },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
}

async function sendVerificationEmail(user, token) {
  const verificationLink = `http://localhost:5000/api/auth/verify/${token}`;
  const subject = "Verify your TimelessPages account";
  const html = `
    <p>Hello ${user.name || "there"},</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verificationLink}">${verificationLink}</a></p>
    <p>This link expires in 10 minutes.</p>
  `;

  await sendEmail(user.email, subject, html);
}

async function sendLoginAlertEmail(user, req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ipAddress = forwardedFor || req.socket?.remoteAddress || req.ip || "Unknown";
  const userAgent = String(req.headers["user-agent"] || "Unknown device");
  const loginTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const subject = "New login to your TimelessPages account";
  const html = `
    <p>Hello ${user.name || "there"},</p>
    <p>Your TimelessPages account was just logged in successfully.</p>
    <p><strong>Time:</strong> ${loginTime}</p>
    <p><strong>IP Address:</strong> ${ipAddress}</p>
    <p><strong>Device/Browser:</strong> ${userAgent}</p>
    <p>If this was not you, please change your password immediately.</p>
  `;

  await sendEmail(user.email, subject, html);
}

async function sendOtpEmail(user, otp) {
  const subject = "Your TimelessPages verification code";
  const html = `
    <p>Hello ${user.name || "there"},</p>
    <p>Your verification code is:</p>
    <h2 style="letter-spacing: 4px;">${otp}</h2>
    <p>This code expires in 10 minutes.</p>
  `;

  await sendEmail(user.email, subject, html);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await seedAdmin();
    await seedBooks();
  })
  .catch((err) => console.log("MongoDB error:", err));

async function seedBooks() {
  for (const book of featuredSeedBooks) {
    try {
      await Book.findOneAndUpdate(
        { title: book.title, author: book.author },
        { ...book },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn(`Failed to seed book: ${book.title}`, err.message);
    }
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});



const paymentRoutes = require("./routes/payment");
const orderRoutes = require("./routes/order");

app.use("/api/payment", paymentRoutes(app, requireUser));
app.use("/api/order", orderRoutes(app, requireUser));
app.use("/api/orders", orderRoutes(app, requireUser)); // Fallback alias for robustness

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const password = String(req.body.password || "");
    const age = Number(req.body.age);

    if (!name || !email || !phone || !password || !age) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, phone, password: hashedPassword, age });
    const verificationToken = createVerificationToken(user);
    user.isVerified = false;
    user.verificationToken = verificationToken;
    await user.save();

    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: emailError.message || "Could not send verification email" });
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email first.",
      user: { name: user.name, email: user.email, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/auth/verify/:token", async (req, res) => {
  const loginUrl = "/login.html";

  try {
    const token = String(req.params.token || "").trim();

    if (!token) {
      return res.redirect(`${loginUrl}?verified=error&message=${encodeURIComponent("Invalid verification link")}`);
    }

    const payload = jwt.verify(token, JWT_SECRET);

    if (payload.purpose !== "email_verification") {
      return res.redirect(`${loginUrl}?verified=error&message=${encodeURIComponent("Invalid verification token")}`);
    }

    const user = await User.findOne({ _id: payload.userId, verificationToken: token });

    if (!user) {
      return res.redirect(`${loginUrl}?verified=error&message=${encodeURIComponent("Invalid or already used verification link")}`);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.redirect(`${loginUrl}?verified=success&message=${encodeURIComponent("Email verified successfully. You can now log in.")}`);
  } catch (err) {
    return res.redirect(`${loginUrl}?verified=error&message=${encodeURIComponent("Invalid or expired verification link")}`);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email does not exist" });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "Password reset required. Verify your email to set a new password.",
        requiresOtp: true,
        requiresPasswordReset: true
      });
    }

    const isMatch = await verifyUserPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password. Please try again." });
    }

    if (user.blocked) {
      return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
    }

    const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    sendLoginAlertEmail(user, req).catch((error) => {
      console.error("Login alert email failed:", error.message);
    });

    setSessionCookie(res, USER_SESSION_COOKIE, token, getSessionCookieOptions());

    res.json({
      message: "Login successful",
      token,
      user: { name: user.name, email: user.email, cart: user.cart, wishlist: user.wishlist }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000);
    await user.save();

    await sendOtpEmail(user, otp);

    res.json({ message: "OTP sent successfully to registered email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      return res.status(400).json({ message: "Please enter a new password with at least 6 characters" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.password = await bcrypt.hash(newPassword.trim(), 10);
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    setSessionCookie(res, USER_SESSION_COOKIE, token, getSessionCookieOptions());

    res.json({
      message: "OTP verified and password reset successful.",
      token,
      user: { name: user.name, email: user.email, cart: user.cart, wishlist: user.wishlist }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/user/profile", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.userSession.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/user/cart", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.userSession.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.cart || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/user/cart", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.userSession.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.cart = req.body.cart || [];
    await user.save();

    res.json({ message: "Cart synced successfully", cart: user.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/user/wishlist", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.userSession.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/user/wishlist", requireUser, async (req, res) => {
  try {
    const user = await User.findById(req.userSession.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.wishlist = req.body.wishlist || [];
    await user.save();

    res.json({ message: "Wishlist synced successfully", wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// SELLER API
app.post("/seller-register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const storeName = String(req.body.storeName || "").trim();
    const password = String(req.body.password || "");

    if (!name || !email || !storeName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingSeller = await Seller.findOne({ email });
    if (existingSeller) {
      return res.status(400).json({ message: "Seller email already in use." });
    }

    const seller = new Seller({
      name,
      email,
      storeName,
      password: hashPassword(password)
    });

    await seller.save();

    res.status(200).json({
      message: "Seller account created successfully! You can now log in."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/seller-login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const seller = await Seller.findOne({ email });

    if (!seller || !verifyPassword(password, seller.password)) {
      return res.status(401).json({ message: "Invalid seller credentials" });
    }

    if (seller.blocked) {
      return res.status(403).json({ message: "Your seller account has been blocked." });
    }

    const token = createSellerToken(seller);

    setSessionCookie(res, SELLER_SESSION_COOKIE, token, getSessionCookieOptions());

    res.json({
      message: "Login successful",
      token,
      seller: { id: seller._id, name: seller.name, email: seller.email, storeName: seller.storeName }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/sellers", requireAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch("/sellers/:id/block", requireAdmin, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    seller.blocked = !seller.blocked;
    await seller.save();
    res.json({ message: seller.blocked ? "Seller blocked" : "Seller unblocked", blocked: seller.blocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/sellers/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await Seller.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Seller not found" });
    // Also delete their books? I will just delete the seller for now
    res.json({ message: "Seller deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// USER MANAGEMENT (ADMIN ONLY)
app.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch("/users/:id/block", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.blocked = !user.blocked;
    await user.save();
    res.json({ message: user.blocked ? "User blocked successfully" : "User unblocked successfully", blocked: user.blocked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });

    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = createAdminToken(admin);

    setSessionCookie(res, ADMIN_SESSION_COOKIE, token, getSessionCookieOptions());

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        email: admin.email,
        name: admin.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res, USER_SESSION_COOKIE);
  res.json({ message: "Logged out successfully" });
});

app.post("/seller/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[SELLER_SESSION_COOKIE];

  if (token) {
    activeSellerSessions.delete(token);
  }

  clearSessionCookie(res, SELLER_SESSION_COOKIE);
  res.json({ message: "Seller logged out successfully" });
});

app.post("/admin/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE];

  if (token) {
    activeAdminSessions.delete(token);
  }

  clearSessionCookie(res, ADMIN_SESSION_COOKIE);
  res.json({ message: "Admin logged out successfully" });
});

app.get("/books", async (req, res) => {
  try {
    const query = {};
    const category = String(req.query.category || "").trim().toLowerCase();
    const featured = String(req.query.featured || "").trim().toLowerCase();
    const limit = Number(req.query.limit);
    const sellerId = String(req.query.sellerId || "").trim();

    if (category === "science") {
      endpoint = "/books/science";
    }

    if (featured === "true") {
      query.featured = true;
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    let booksQuery = Book.find(query).sort({ createdAt: -1 });

    if (limit > 0) {
      booksQuery = booksQuery.limit(limit);
    }

    const books = await booksQuery;
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload image to Cloudinary
app.post("/upload", requireAdminOrSeller, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "timelesspages" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/books", requireAdminOrSeller, async (req, res) => {
  try {
    const payload = normalizeBookPayload(req.body);

    if (!payload.title || !payload.author || !payload.category || !payload.imageUrl || !payload.price) {
      return res.status(400).json({ message: "Title, author, category, image URL and price are required" });
    }

    if (req.sellerSession) {
      payload.sellerId = req.sellerSession.sellerId;
      payload.featured = false; // Sellers cannot feature their own books
    }

    const book = new Book(payload);
    await book.save();

    res.status(201).json({
      message: "Book added successfully",
      book
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/books/:id", requireAdminOrSeller, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (req.sellerSession && book.sellerId?.toString() !== req.sellerSession.sellerId) {
      return res.status(403).json({ message: "Unauthorized to delete this book" });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
