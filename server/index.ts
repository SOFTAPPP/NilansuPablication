import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import sharp from 'sharp';
import crypto from 'crypto';
import helmet from 'helmet';
import { logger, requestContext } from './utils/logger';
import { authenticateToken, isAdmin, optionalAuthenticateToken, JWT_SECRET } from './middleware';
import { generateReviewsForBook } from './utils/reviewGenerator';
import Razorpay from 'razorpay';
import { calculateOrderTotal } from './utils/pricing';
import { createShiprocketOrder, trackShipment } from './services/shiprocket';
import { sendAdminAlert, sendCustomerReceiptEmail, sendAdminNewOrderEmail, sendSupportEmail } from './utils/email';


const isProduction = process.env.NODE_ENV === 'production';

export const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new (RedisMock as any)();

const CACHE_PREFIX = 'cache:';

export const cacheMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method !== 'GET') return next();

  const key = CACHE_PREFIX + req.originalUrl;
  
  try {
    const cachedResponse = await redis.get(key);
    if (cachedResponse) {
      const data = JSON.parse(cachedResponse);
      return res.json(data);
    }
  } catch (err) {
    logger.error(err, 'Redis error');
  }

  const originalJson = res.json;
  res.json = function(body) {
    try {
      redis.set(key, JSON.stringify(body), 'EX', 300);
    } catch (err) {}
    
    res.json = originalJson;
    return res.json(body);
  };
  
  next();
};

export const clearCache = async (prefix?: string) => {
  try {
    if (!prefix) {
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return;
    }
    const keys = await redis.keys(`${CACHE_PREFIX}*${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch(e) {}
};



const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
  process.env.FRONTEND_URL || '',
].filter(Boolean);

export const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true }
});

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ]
});

// Query logging disabled for performance under loads
prisma.$on('error', (e: any) => logger.error(e.message, 'Database Error'));
prisma.$on('warn', (e: any) => logger.warn(e.message));
prisma.$on('info', (e: any) => logger.info(e.message));
const PORT = process.env.PORT || 5000;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.warn("Razorpay credentials are missing or empty. Check backend .env file.");
} else {
  logger.info(`Razorpay Key Loaded: ${RAZORPAY_KEY_ID.slice(0, 10)}...`);
  logger.info(`Razorpay Secret Loaded: YES`);
}

export const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID || '',
  key_secret: RAZORPAY_KEY_SECRET || '',
});

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many reviews submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Performance: Security headers and better browser caching behavior
// Custom Logger Middleware
const loggerMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const reqId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  const ip = req.ip || req.socket.remoteAddress;
  
  const ctx = {
    reqId,
    ip,
    startTime
  };
  
  requestContext.run(ctx, () => {
    // Intercept finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      let payload;
      if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.body && Object.keys(req.body).length > 0) {
        payload = { ...req.body };
      }
      
      logger.apiRequest(req.method, req.originalUrl, res.statusCode, duration, Number(res.getHeader('content-length')) || 0, payload);
    });
    
    next();
  });
};

app.use(loggerMiddleware); // Custom centralized logging
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Razorpay Webhook route needs raw body parser
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers["x-razorpay-signature"] as string;
    const rawBody = req.body.toString();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    const eventId = req.headers["x-razorpay-event-id"] as string;

    // Idempotency check
    const alreadyProcessed = await prisma.webhookLog.findUnique({ where: { eventId } });
    if (alreadyProcessed) return res.status(200).json({ status: "already processed" });

    await prisma.webhookLog.create({ data: { eventId } });

    if (event.event === "payment.captured") {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;
      
      const orders = await prisma.order.findMany({ where: { razorpayOrderId: orderId, status: "Pending" }, include: { items: true } });
      
      if (orders.length > 0) {
        await prisma.order.updateMany({
          where: { razorpayOrderId: orderId },
          data: { status: "Paid", razorpayPaymentId: paymentId, paidAt: new Date() }
        });

        // Decrement stock atomically upon successful payment to prevent race conditions
        for (const order of orders) {
          for (const item of order.items) {
            const result = await prisma.book.updateMany({
              where: { id: item.bookId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } }
            });

            if (result.count > 0) {
              const updatedBook = await prisma.book.findUnique({ select: { stock: true }, where: { id: item.bookId } });
              if (updatedBook) {
                let newStatus = 'in_stock';
                if (updatedBook.stock === 0) newStatus = 'out_of_stock';
                else if (updatedBook.stock <= 5) newStatus = 'low_stock';
                
                await prisma.book.update({
                  where: { id: item.bookId },
                  data: { stockStatus: newStatus }
                });
              }
            } else {
              logger.warn(`Failed to deduct stock for book ${item.bookId} in webhook (insufficient stock)`);
            }
          }
        }
        // Removed flushall cache clearing to prevent cache stampedes under high concurrency
      } else {
        logger.info(`Webhook payment.captured received for Razorpay Order ${orderId}, but no pending local order found. This is expected if /api/payment/verify handles the creation.`);
      }
    } else if (event.event === "payment.failed") {
      const orderId = event.payload.payment.entity.order_id;
      await prisma.order.updateMany({
        where: { razorpayOrderId: orderId },
        data: { status: "Failed" }
      });
    }

    res.status(200).json({ status: "ok" });
  } catch (error) {
    logger.error(error, 'Webhook Error');
    res.status(500).json({ error: "Webhook Error" });
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(compression({ level: 6 })); // Performance: Brotli/Gzip compression for responses > 1kb
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Global Cache-Control for all dynamic API routes
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased to 50 to prevent blocking multiple legitimate users on same IP during spikes
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Setup static folders for uploads
const booksUploadDir = path.join(__dirname, '../uploaded_books');
const categoriesUploadDir = path.join(__dirname, '../uploaded_categories');

if (!fs.existsSync(booksUploadDir)) fs.mkdirSync(booksUploadDir);
if (!fs.existsSync(categoriesUploadDir)) fs.mkdirSync(categoriesUploadDir);

// Custom dynamic resizing route for images
const handleImageRequest = async (folder: string, req: express.Request, res: express.Response) => {
  const filename = req.params.filename as string;
  const widthStr = req.query.w as string;
  const baseDir = folder === 'uploaded_categories' ? categoriesUploadDir : booksUploadDir;
  const originalPath = path.join(baseDir, filename);
  
  try {
    await fs.promises.access(originalPath);
  } catch {
    return res.status(404).send('Not found');
  }

  if (!widthStr) {
    return res.sendFile(originalPath, { maxAge: '1y', immutable: true });
  }

  const width = parseInt(widthStr, 10);
  const ALLOWED_WIDTHS = [50, 100, 150, 200, 300, 400, 600, 800, 1200];
  if (isNaN(width) || width <= 0 || !ALLOWED_WIDTHS.includes(width)) {
    return res.sendFile(originalPath, { maxAge: '1y', immutable: true });
  }

  const resizedFilename = `${path.basename(filename, path.extname(filename))}_w${width}${path.extname(filename)}`;
  const resizedPath = path.join(baseDir, resizedFilename);

  try {
    await fs.promises.access(resizedPath);
    return res.sendFile(resizedPath, { maxAge: '1y', immutable: true });
  } catch {}

  try {
    await sharp(originalPath)
      .resize({ width, withoutEnlargement: true })
      .toFile(resizedPath);
    return res.sendFile(resizedPath, { maxAge: '1y', immutable: true });
  } catch (error) {
    return res.sendFile(originalPath, { maxAge: '1y', immutable: true });
  }
};

app.get('/uploaded_books/:filename', (req, res) => handleImageRequest('uploaded_books', req, res));
app.get('/uploaded_categories/:filename', (req, res) => handleImageRequest('uploaded_categories', req, res));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (req.originalUrl.includes('/categories')) {
      cb(null, categoriesUploadDir);
    } else {
      cb(null, booksUploadDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, AVIF, and GIF images are allowed'));
    }
    cb(null, true);
  }
});

const processImageUpload = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.file) return next();
  try {
    const filePath = req.file.path;
    const destDir = req.originalUrl.includes('/categories') ? categoriesUploadDir : booksUploadDir;
    const webpFilename = req.file.filename.replace(path.extname(req.file.filename), '.webp');
    const webpPath = path.join(destDir, webpFilename);
    
    await sharp(filePath)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(webpPath);
      
    if (filePath !== webpPath) {
      fs.unlinkSync(filePath);
    }
    
    req.file.path = webpPath;
    req.file.filename = webpFilename;
    next();
  } catch (error) {
    next(error);
  }
};

// Routes

// DevOps: Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'ready', db: 'connected', redis: 'connected' });
  } catch (error) {
    logger.error(error, 'Readiness check failed');
    res.status(503).json({ status: 'not_ready', error: 'Database or Cache unreachable' });
  }
});

// Removed overriding Cache-Control middleware to respect the global no-store header

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'USER' }
    });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Auth: Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Incorrect username or password. Please try again.' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect username or password. Please try again.' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    let adminUrl = undefined;
    if (user.role === 'ADMIN') {
      const adminToken = crypto.randomBytes(24).toString('base64url');
      await redis.set(`admin_session:${user.id}`, adminToken, 'EX', 12 * 60 * 60);
      adminUrl = `/panel/${adminToken}`;
    }
    
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, adminUrl } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Auth: Logout
app.post('/api/auth/logout', authenticateToken, async (req: any, res) => {
  if (req.user) {
    await redis.del(`admin_session:${req.user.id}`);
  }
  res.clearCookie('token');
  res.json({ success: true });
});

// Auth: Get Current User
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: {
          where: { status: 'Paid' },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { book: true }
            }
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let adminUrl = undefined;
    if (user.role === 'ADMIN') {
      let token = await redis.get(`admin_session:${user.id}`);
      if (!token) {
        token = crypto.randomBytes(24).toString('base64url');
        await redis.set(`admin_session:${user.id}`, token, 'EX', 12 * 60 * 60);
      }
      adminUrl = `/panel/${token}`;
    }
    
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, adminUrl, orders: user.orders } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Admin: Validate Token
app.get('/api/admin/validate-token/:token', authenticateToken, isAdmin, async (req: any, res) => {
  const token = req.params.token;
  const storedToken = await redis.get(`admin_session:${req.user.id}`);
  if (storedToken && storedToken === token) {
    res.json({ valid: true });
  } else {
    res.status(404).json({ error: 'Not Found' });
  }
});

// --- Admin Support Email ---
app.post('/api/admin/send-support-email', authenticateToken, isAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { toEmail, subject, message } = req.body;
    if (!toEmail || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sendSupportEmail(toEmail, subject, message);
    res.json({ success: true, message: 'Support email sent successfully' });
  } catch (error: any) {
    logger.error(`Error sending support email: ${error.message}`);
    res.status(500).json({ error: 'Failed to send support email' });
  }
});

// User: Get My Orders
app.get('/api/users/orders', authenticateToken, async (req: any, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { 
            book: {
              select: { id: true, title: true, coverImage: true, price: true, slug: true } // Performance: Avoid N+1 and select only needed columns
            } 
          }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get all categories
app.get('/api/categories', cacheMiddleware, async (req, res) => {
  try {
    const cursorStr = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Number(req.query.limit) || 16;
    
    let cursorObj: any = undefined;
    let skipCount = 0;
    
    if (cursorStr && cursorStr !== '0' && cursorStr !== 'undefined') {
      if (cursorStr.includes('-')) {
        cursorObj = { id: cursorStr };
        skipCount = 1;
      } else {
        skipCount = Number(cursorStr);
      }
    }
    
    const categories = await prisma.category.findMany({
      take: limit + 1,
      skip: skipCount,
      ...(cursorObj ? { cursor: cursorObj } : {}),
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        _count: {
          select: { books: true }
        }
      }
    });
    
    const hasMore = categories.length > limit;
    if (hasMore) {
      categories.pop(); // Remove the extra item
    }

    // Format to match old mockApi structure [{ name, count }]
    const formatted = categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c._count.books,
      image_path: c.image_path,
      description: c.description
    }));
    
    res.json({
      data: formatted,
      hasMore,
      nextCursor: hasMore ? categories[categories.length - 1].id : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all publications
app.get('/api/publications', cacheMiddleware, async (req, res) => {
  try {
    const publications = await prisma.publication.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(publications);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch publications' });
  }
});

// Get all books
app.get('/api/books', cacheMiddleware, async (req, res) => {
  try {
    const { category, search, sort, inStockOnly, formats } = req.query;
    const cursorStr = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Number(req.query.limit) || 30;
    const page = Number(req.query.page) || 1;
    
    const where: any = {};
    
    if (category) {
      where.category = { slug: String(category) };
    }

    if (req.query.publication) {
      where.publications = { some: { slug: String(req.query.publication) } };
    }
    
    if (search) {
      const searchTerms = String(search).trim().split(/\s+/).join(' | ');
      where.OR = [
        { title: { search: searchTerms } },
        { author: { search: searchTerms } },
        // Fallback for partial matches if FTS doesn't catch them
        { title: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (inStockOnly === 'true') {
      where.stock = { gt: 0 };
    }

    if (formats) {
      where.format = { in: String(formats).split(',') };
    }

    let orderBy: any = [];
    switch (sort) {
      case 'newest':
        orderBy = [{ publishedDate: 'desc' }, { id: 'desc' }];
        break;
      case 'price-low':
        orderBy = [{ price: 'asc' }, { id: 'asc' }];
        break;
      case 'price-high':
        orderBy = [{ price: 'desc' }, { id: 'desc' }];
        break;
      case 'rating':
        orderBy = [{ rating: 'desc' }, { id: 'desc' }];
        break;
      case 'trending':
      default:
        orderBy = [{ isTrending: 'desc' }, { id: 'desc' }];
        break;
    }
    
    let cursorObj: any = undefined;
    let skipCount = 0;
    
    if (cursorStr && cursorStr !== '0' && cursorStr !== 'undefined') {
      if (cursorStr.includes('-')) {
        cursorObj = { id: cursorStr };
        skipCount = 1;
      } else {
        skipCount = Number(cursorStr);
      }
    } else if (page > 1) {
      skipCount = (page - 1) * limit;
    }
    
    // Performance: Only run count on first page
    const shouldCount = !cursorObj && page === 1;
    
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        take: limit + 1,
        skip: skipCount,
        ...(cursorObj ? { cursor: cursorObj } : {}),
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          author: true,
          coverImage: true,
          price: true,
          oldPrice: true,
          isOnSale: true,
          stock: true,
          format: true,
          rating: true,
          reviewCount: true,
          isTrending: true,
          category: { select: { name: true } },
          publications: { select: { name: true, id: true } }
        }
      }),
      shouldCount ? prisma.book.count({ where }) : Promise.resolve(0)
    ]);
    
    const hasMore = books.length > limit;
    if (hasMore) {
      books.pop();
    }
    
    const formattedBooks = books.map(b => ({
      ...b,
      category: b.category.name,
      publicationName: (b as any).publications?.map((p: any) => p.name).join(', ') || null
    }));

    res.json({
      data: formattedBooks,
      hasMore,
      nextCursor: hasMore ? books[books.length - 1].id : null,
      total: shouldCount ? total : undefined,
      page,
      totalPages: shouldCount ? Math.ceil(total / limit) : undefined
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Get trending books
app.get('/api/books/trending', cacheMiddleware, async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      where: { isTrending: true },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        coverImage: true,
        price: true,
        oldPrice: true,
        isOnSale: true,
        rating: true,
        reviewCount: true,
        isTrending: true,
        category: {
          select: { name: true }
        },
        publications: {
          select: { name: true }
        }
      }
    });
    const formattedBooks = books.map(b => ({
      ...b,
      category: b.category.name,
      publicationName: (b as any).publications?.map((p: any) => p.name).join(', ') || null
    }));
    res.json(formattedBooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending books' });
  }
});

// Get book by slug
app.get('/api/books/:slug', cacheMiddleware, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const book = await prisma.book.findUnique({
      where: { slug },
      include: { 
        category: { select: { name: true } }, 
        publications: { select: { name: true } } 
      }
    });
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ ...book, category: (book as any).category?.name || 'Uncategorized', publicationName: (book as any).publications?.map((p: any) => p.name).join(', ') || null });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// Get Reviews for a Book
app.get('/api/books/:id/reviews', cacheMiddleware, async (req, res) => {
  try {
    const bookId = String(req.params.id);
    const reviews = await prisma.review.findMany({
      where: { bookId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Submit a Review
app.post('/api/books/:id/reviews', reviewLimiter, async (req, res) => {
  try {
    const bookId = String(req.params.id);
    const { reviewerName, rating, title, comment } = req.body;

    if (!reviewerName || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Prevent duplicate reviews from the same person
    const existingReview = await prisma.review.findFirst({
      where: {
        bookId,
        reviewerName: {
          equals: reviewerName,
          mode: 'insensitive' // case-insensitive match (e.g. 'Anjali P.' vs 'anjali p.')
        }
      }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already submitted a review for this book.' });
    }

    const review = await prisma.review.create({
      data: {
        bookId,
        reviewerName,
        rating: Number(rating),
        title: title || null,
        comment,
        isVerified: true, // Manual submissions can be marked verified
      }
    });

    // Update the book's aggregate rating and review count
    const allReviews = await prisma.review.findMany({ where: { bookId } });
    const newCount = allReviews.length;
    const newAvg = allReviews.reduce((sum, r) => sum + r.rating, 0) / newCount;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        rating: Number(newAvg.toFixed(1)),
        reviewCount: newCount
      }
    });

    await clearCache(); // Invalidate cache so new rating shows
    res.json(review);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Create Order via Razorpay
app.post('/api/payment/create-order', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const t0 = Date.now();
    const { items, fullName, email, phone, street, city, state, pinCode, discount = 0 } = req.body;
    
    // DB Validation Phase: Calculate total securely on backend
    const bookIds = items.map((item: any) => item.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, price: true, stock: true }
    });

    for (const item of items) {
      const book = books.find(b => b.id === item.bookId);
      if (!book) throw new Error(`Book not found: ${item.bookId}`);
      if (book.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${book.title}". Only ${book.stock} available.`);
      }
    }
    
    const validItems = items.map((item: any) => ({
      ...item,
      unitPrice: books.find(b => b.id === item.bookId)?.price || item.unitPrice
    }));
    
    const pricing = calculateOrderTotal(validItems, 'PREPAID', Number(discount));
    const amountInPaise = Math.round(pricing.finalAmount * 100);
    const t1 = Date.now();
    
    // Fast O(1) order number generation (6-digit)
    const orderNumber = `NP-${Math.floor(100000 + Math.random() * 900000)}`;

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderNumber,
      notes: { userId: req.user ? req.user.id : "guest" }
    });
    const t2 = Date.now();

    // We NO LONGER create the local order here. It will be created in /api/payment/verify.
    const t3 = Date.now();
    
    logger.info(`Checkout Prep: DB Valid [${t1 - t0}ms], Razorpay [${t2 - t1}ms], Total [${t3 - t0}ms]`);
    
    res.json({
      success: true,
      orderId: rzpOrder.id,
      orderNumber,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    const razorpayDescription = error?.error?.description;
    const razorpayCode = error?.error?.code;

    logger.error({
      message: error.message,
      statusCode: error.statusCode,
      razorpayDescription,
      razorpayCode
    }, "Create Razorpay Order Error");

    return res.status(500).json({
      error: razorpayDescription || "Failed to create Razorpay order"
    });
  }
});

// Background Shiprocket Sync Helper
async function syncShiprocketBackground(
  orderId: string,
  tempOrderId: string,
  shiprocketPayload: any,
  isPrepaid: boolean,
  fullName: string,
  email: string,
  razorpay_payment_id?: string
) {
  try {
    const shiprocketRes = await createShiprocketOrder(shiprocketPayload);
    logger.info(`Background Shiprocket API Create Order Response: ` + JSON.stringify(shiprocketRes, null, 2));

    if (shiprocketRes.status_code !== 1) {
      throw new Error(JSON.stringify(shiprocketRes));
    }

    // Success: Update Order in DB
    await prisma.order.update({
      where: { id: tempOrderId },
      data: {
        shiprocketOrderId: shiprocketRes.order_id,
        shiprocketShipmentId: shiprocketRes.shipment_id,
        shippingSyncStatus: 'CREATED',
        shiprocketCreatedAt: new Date(),
        orderStatus: 'PLACED',
        status: isPrepaid ? 'Paid' : 'Confirmed'
      }
    });

  } catch (error: any) {
    const errorMessage = error.message || String(error);
    logger.error(errorMessage, 'Background Shiprocket sync failed');

    // Failure: Update Order in DB to FAILED sync
    await prisma.order.update({
      where: { id: tempOrderId },
      data: {
        shippingSyncStatus: 'FAILED',
        shiprocketErrorMessage: errorMessage,
        orderStatus: 'TECHNICAL_ERROR',
        status: isPrepaid ? 'Paid' : 'Failed' // Keep Prepaid as Paid because money was captured
      }
    });

    // Send Alert Email
    const alertTitle = isPrepaid ? 'CRITICAL: PREPAID Order Failed Shiprocket Sync (Action Required)' : 'CRITICAL: COD Order Failed Shiprocket Sync (Action Required)';
    let alertBody = `<p>An order was successfully placed by the customer, but Shiprocket rejected the automatic sync. <b>Stock WAS deducted normally</b>.</p>
         <p><b>Customer:</b> ${fullName} (${email})</p>
         <p><b>Order Number:</b> ${orderId}</p>
         <p><b>Error Details:</b> ${errorMessage}</p>
         <p><b>Action:</b> You must manually fulfill this order in the Shiprocket dashboard.</p>`;
    
    if (isPrepaid && razorpay_payment_id) {
       alertBody += `<p><b>Razorpay Payment ID:</b> ${razorpay_payment_id}</p>`;
    }

    await sendAdminAlert(alertTitle, alertBody).catch(err => logger.error(err, 'Email send failed'));
  }
}

// Verify Payment
app.post("/api/payment/verify", optionalAuthenticateToken, async (req: any, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderNumber, orderData } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid signature sent!" });
    }

    // 1. Idempotency Check
    const existingOrder = await prisma.order.findFirst({ where: { razorpayOrderId: razorpay_order_id } });
    if (existingOrder && existingOrder.paymentStatus === 'SUCCESS') {
       return res.status(200).json({ message: "Payment already verified successfully" });
    }

    // 2. Validate Pricing and Stock
    const { items, fullName, email, phone, street, city, state, pinCode, discount = 0 } = orderData;
    const bookIds = items.map((item: any) => item.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, price: true, stock: true }
    });

    for (const item of items) {
      const book = books.find(b => b.id === item.bookId);
      if (!book) throw new Error(`Book not found: ${item.bookId}`);
      if (book.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${book.title}".`);
      }
    }
    
    const validItems = items.map((item: any) => ({
      ...item,
      unitPrice: books.find(b => b.id === item.bookId)?.price || item.unitPrice
    }));
    
    const pricing = calculateOrderTotal(validItems, 'PREPAID', Number(discount));

    // 3. Create DB Order IMMEDIATELY
    const tempOrderId = crypto.randomUUID();
    
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id: tempOrderId,
          orderNumber, fullName, email, phone, street, city, state, pinCode,
          productSubtotal: pricing.productSubtotal,
          shippingCharge: pricing.shippingCharge,
          codCharge: pricing.codCharge,
          discount: pricing.discount,
          finalAmount: pricing.finalAmount,
          paymentMethod: 'PREPAID',
          paymentStatus: 'SUCCESS',
          orderStatus: 'PLACED',
          status: "Paid",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          paidAt: new Date(),
          userId: req.user ? req.user.id : null,
          shippingSyncStatus: 'PENDING',
          items: {
            create: validItems.map((item: any) => ({
              bookId: item.bookId, quantity: item.quantity, unitPrice: item.unitPrice
            }))
          }
        }
      });
      
      // Decrease stock atomically
      for (const item of validItems) {
        const result = await tx.book.updateMany({
          where: { id: item.bookId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (result.count > 0) {
          const updatedBook = await tx.book.findUnique({ select: { stock: true }, where: { id: item.bookId } });
          if (updatedBook) {
            let newStatus = 'in_stock';
            if (updatedBook.stock === 0) newStatus = 'out_of_stock';
            else if (updatedBook.stock <= 5) newStatus = 'low_stock';
            await tx.book.update({
              where: { id: item.bookId },
              data: { stockStatus: newStatus }
            });
          }
        }
      }
      return newOrder;
    });

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { book: true } } }
    });

    if (finalOrder) {
        sendCustomerReceiptEmail(
          email, fullName, orderNumber,
          finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice, coverImage: i.book.coverImage || undefined })),
          pricing.finalAmount,
          `${street}, ${city}, ${state} - ${pinCode}`
        ).catch(err => logger.error(err, 'Email send failed'));
        sendAdminNewOrderEmail('nilansupublication@gmail.com', {
          orderNumber, customerName: fullName, email, phone, address: `${street}, ${city}, ${state} - ${pinCode}`, paymentMethod: 'PREPAID',
          subtotal: pricing.productSubtotal, shippingCharge: pricing.shippingCharge, codCharge: pricing.codCharge, discount: pricing.discount, finalAmount: pricing.finalAmount,
          items: finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice }))
        }).catch(err => logger.error(err, 'Email send failed'));
    }

    // 4. Trigger Shiprocket Sync Asynchronously in Background
    const shiprocketPayload = {
         order_id: orderNumber,
         order_date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).substring(0, 16).replace('T', ' '),
         pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
         billing_customer_name: fullName,
         billing_last_name: '',
         billing_address: street,
         billing_city: city,
         billing_pincode: pinCode,
         billing_state: state,
         billing_country: 'India',
         billing_email: email,
         billing_phone: phone,
         shipping_is_billing: true,
         shipping_customer_name: fullName,
         shipping_last_name: '',
         shipping_address: street,
         shipping_city: city,
         shipping_pincode: pinCode,
         shipping_state: state,
         shipping_country: 'India',
         shipping_email: email,
         shipping_phone: phone,
         order_items: validItems.map((i: any) => ({
            name: "Book",
            sku: i.bookId,
            units: i.quantity,
            selling_price: i.unitPrice
         })),
         payment_method: 'Prepaid',
         shipping_charges: pricing.shippingCharge,
         giftwrap_charges: 0,
         transaction_charges: 0,
         total_discount: pricing.discount,
         sub_total: pricing.productSubtotal,
         length: 10, breadth: 10, height: 10, weight: 0.5
    };
    
    // Fire and forget
    syncShiprocketBackground(orderNumber, tempOrderId, shiprocketPayload, true, fullName, email, razorpay_payment_id).catch(err => logger.error(err, 'Background sync wrapper failed'));

    return res.status(200).json({ message: "Payment verified successfully" });
  } catch (error: any) {
    logger.error(error.message || error, 'Verify error');
    res.status(500).json({ error: error.message || "Failed to verify payment" });
  }
});

// Create COD Order
app.post('/api/orders/create-cod', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const { items, fullName, email, phone, street, city, state, pinCode, discount = 0 } = req.body;
    
    // DB Validation Phase
    const bookIds = items.map((item: any) => item.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, price: true, stock: true }
    });

    for (const item of items) {
      const book = books.find(b => b.id === item.bookId);
      if (!book) throw new Error(`Book not found: ${item.bookId}`);
      if (book.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${book.title}". Only ${book.stock} available.`);
      }
    }
    
    const validItems = items.map((item: any) => ({
      ...item,
      unitPrice: books.find(b => b.id === item.bookId)?.price || item.unitPrice
    }));
    
    const pricing = calculateOrderTotal(validItems, 'COD', Number(discount));
    
    const orderNumber = `NP-${Math.floor(100000 + Math.random() * 900000)}`;

    const tempOrderId = crypto.randomUUID();

    // 1. Create DB Order IMMEDIATELY
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id: tempOrderId,
          orderNumber,
          fullName,
          email,
          phone,
          street,
          city,
          state,
          pinCode,
          productSubtotal: pricing.productSubtotal,
          shippingCharge: pricing.shippingCharge,
          codCharge: pricing.codCharge,
          discount: pricing.discount,
          finalAmount: pricing.finalAmount,
          paymentMethod: 'COD',
          paymentStatus: 'PENDING',
          orderStatus: 'PLACED',
          status: 'Confirmed',
          userId: req.user ? req.user.id : null,
          shippingSyncStatus: 'PENDING',
          items: {
            create: validItems.map((item: any) => ({
              bookId: item.bookId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        }
      });

      // Decrease stock atomically
      for (const item of validItems) {
        const result = await tx.book.updateMany({
          where: { id: item.bookId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (result.count > 0) {
          const updatedBook = await tx.book.findUnique({ select: { stock: true }, where: { id: item.bookId } });
          if (updatedBook) {
            let newStatus = 'in_stock';
            if (updatedBook.stock === 0) newStatus = 'out_of_stock';
            else if (updatedBook.stock <= 5) newStatus = 'low_stock';
            await tx.book.update({
              where: { id: item.bookId },
              data: { stockStatus: newStatus }
            });
          }
        }
      }
      return newOrder;
    });

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { book: true } } }
    });

    if (finalOrder) {
      sendCustomerReceiptEmail(
        email, fullName, orderNumber,
        finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice, coverImage: i.book.coverImage || undefined })),
        pricing.finalAmount,
        `${street}, ${city}, ${state} - ${pinCode}`
      ).catch(err => logger.error(err, 'Email send failed'));
      sendAdminNewOrderEmail('nilansupublication@gmail.com', {
        orderNumber, customerName: fullName, email, phone, address: `${street}, ${city}, ${state} - ${pinCode}`, paymentMethod: 'COD',
        subtotal: pricing.productSubtotal, shippingCharge: pricing.shippingCharge, codCharge: pricing.codCharge, discount: pricing.discount, finalAmount: pricing.finalAmount,
        items: finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice }))
      }).catch(err => logger.error(err, 'Email send failed'));
    }

    // 2. Trigger Shiprocket Sync Asynchronously in Background
    const shiprocketPayload = {
       order_id: orderNumber,
       order_date: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).substring(0, 16).replace('T', ' '),
       pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
       billing_customer_name: fullName,
       billing_last_name: '',
       billing_address: street,
       billing_city: city,
       billing_pincode: pinCode,
       billing_state: state,
       billing_country: 'India',
       billing_email: email,
       billing_phone: phone,
       shipping_is_billing: true,
       shipping_customer_name: fullName,
       shipping_last_name: '',
       shipping_address: street,
       shipping_city: city,
       shipping_pincode: pinCode,
       shipping_state: state,
       shipping_country: 'India',
       shipping_email: email,
       shipping_phone: phone,
       order_items: validItems.map((i: any) => ({
          name: "Book",
          sku: i.bookId,
          units: i.quantity,
          selling_price: i.unitPrice
       })),
       payment_method: 'COD',
       shipping_charges: pricing.shippingCharge + pricing.codCharge, // COD orders must pass total additional charges
       giftwrap_charges: 0,
       transaction_charges: 0,
       total_discount: pricing.discount,
       sub_total: pricing.productSubtotal,
       length: 10, breadth: 10, height: 10, weight: 0.5
    };
    
    // Fire and forget
    syncShiprocketBackground(orderNumber, tempOrderId, shiprocketPayload, false, fullName, email).catch(err => logger.error(err, 'Background sync wrapper failed'));

    // 3. Send Instant Response to Client
    return res.json({ success: true, orderId: order.orderNumber, orderNumber: order.orderNumber });

  } catch (error: any) {
    logger.error(error.message || error, 'Create COD Error');
    if (error.message && error.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Currently technical error is happening please try again after 30 minutes' });
  }
});

// Backward compatible Create Order (Optional: might want to deprecate this or keep it for offline testing)
app.post('/api/orders', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const { items, fullName, email, phone, street, city, state, pinCode, subtotal, deliveryFee, discount, total } = req.body;
    
    const orderNumber = `NP-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const order = await prisma.$transaction(async (tx) => {
      // Validate stock before creating the order
      for (const item of items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book) {
          throw new Error(`Book not found for ID: ${item.bookId}`);
        }
        if (book.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${book.title}". Only ${book.stock} available.`);
        }
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          fullName,
          email,
          phone,
          street,
          city,
          state,
          pinCode,
          productSubtotal: subtotal,
          shippingCharge: deliveryFee,
          codCharge: 0,
          discount,
          finalAmount: total,
          userId: req.user ? req.user.id : null,
          items: {
            create: items.map((item: any) => ({
              bookId: item.bookId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        }
      });

      // Decrease stock atomically
      for (const item of items) {
        const result = await tx.book.updateMany({
          where: { id: item.bookId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (result.count > 0) {
          const updatedBook = await tx.book.findUnique({ select: { stock: true }, where: { id: item.bookId } });
          if (updatedBook) {
            let newStatus = 'in_stock';
            if (updatedBook.stock === 0) newStatus = 'out_of_stock';
            else if (updatedBook.stock <= 5) newStatus = 'low_stock';
            await tx.book.update({
              where: { id: item.bookId },
              data: { stockStatus: newStatus }
            });
          }
        }
      }

      return newOrder;
    });
    
    // Invalidate cache since book stock has changed
    await clearCache();
        const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { book: true } } }
      });

      if (finalOrder) {
        sendCustomerReceiptEmail(
          email, fullName, orderNumber,
          finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice, coverImage: i.book.coverImage || undefined })),
          total,
          `${street}, ${city}, ${state} - ${pinCode}`
        ).catch(err => logger.error(err, 'Email send failed'));
        sendAdminNewOrderEmail('nilansupublication@gmail.com', {
          orderNumber, customerName: fullName, email, phone, address: `${street}, ${city}, ${state} - ${pinCode}`, paymentMethod: 'UNKNOWN',
          subtotal: subtotal, shippingCharge: deliveryFee, codCharge: 0, discount: discount, finalAmount: total,
          items: finalOrder.items.map(i => ({ name: i.book.title, quantity: i.quantity, unitPrice: i.unitPrice }))
        }).catch(err => logger.error(err, 'Email send failed'));
      }

    res.json({ success: true, orderId: order.orderNumber });
  } catch (error: any) {
    logger.error(error);
    if (error.message && error.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Admin: Add Book
app.post('/api/admin/books', authenticateToken, isAdmin, upload.single('image'), processImageUpload, async (req, res) => {
  try {
    const data = req.body;
    
    if (!data.categoryId) {
      return res.status(400).json({ error: 'Valid category must be provided.' });
    }
    
    // Find category
    let categoryRecord = await prisma.category.findUnique({ where: { id: data.categoryId }});
    if (!categoryRecord) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }

    if (!data.publicationIds) {
      return res.status(400).json({ error: 'Valid publications must be provided.' });
    }

    let pubIds: string[] = [];
    try {
      pubIds = JSON.parse(data.publicationIds);
    } catch {
      return res.status(400).json({ error: 'Invalid publication format.' });
    }

    if (pubIds.length === 0) {
      return res.status(400).json({ error: 'At least one publication must be selected.' });
    }

    const coverImage = req.file ? `/uploaded_books/${req.file.filename}` : data.coverImage;

    // Ensure slug is unique
    let finalSlug = data.slug;
    let existingBook = await prisma.book.findUnique({ where: { slug: finalSlug } });
    let counter = 1;
    while (existingBook) {
      finalSlug = `${data.slug}-${counter}`;
      existingBook = await prisma.book.findUnique({ where: { slug: finalSlug } });
      counter++;
    }

    const book = await prisma.book.create({
      data: {
        title: data.title,
        slug: finalSlug,
        author: data.author || null,
        isbn: data.isbn || null,
        description: data.description || '',
        price: Number(data.price),
        isOnSale: data.isOnSale === 'true',
        oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
        stock: Number(data.stock || 0),
        stockStatus: Number(data.stock || 0) === 0 ? 'out_of_stock' : Number(data.stock || 0) <= 5 ? 'low_stock' : 'in_stock',
        format: data.format || 'Paperback',
        coverImage,
        categoryId: categoryRecord.id,
        publications: { connect: pubIds.map(id => ({ id })) },
        isTrending: data.isTrending === 'true'
      }
    });

    // Automatically generate realistic reviews asynchronously
    generateReviewsForBook(book.id).catch((e: any) => logger.error(e, "Background review generation failed"));

    await clearCache(); // Invalidate cache
    io.emit('books_updated'); // Emit real-time event
    res.json(book);
  } catch (error: any) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A book with this exact title already exists. You can edit the existing book to add it to multiple publications instead of creating a duplicate.' });
    }
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Admin: Update Book
app.put('/api/admin/books/:id', authenticateToken, isAdmin, upload.single('image'), processImageUpload, async (req, res) => {
  try {
    const bookId = String(req.params.id);
    const data = req.body;

    if (!data.categoryId) {
      return res.status(400).json({ error: 'Valid category must be provided.' });
    }

    // Find category
    let categoryRecord = await prisma.category.findUnique({ where: { id: data.categoryId }});
    if (!categoryRecord) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }

    if (!data.publicationIds) {
      return res.status(400).json({ error: 'Valid publications must be provided.' });
    }

    let pubIds: string[] = [];
    try {
      pubIds = JSON.parse(data.publicationIds);
    } catch {
      return res.status(400).json({ error: 'Invalid publication format.' });
    }

    if (pubIds.length === 0) {
      return res.status(400).json({ error: 'At least one publication must be selected.' });
    }

    const updateData: any = {
      title: data.title,
      slug: data.slug,
      author: data.author || null,
      isbn: data.isbn || null,
      price: Number(data.price),
      isOnSale: data.isOnSale === 'true',
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      stock: Number(data.stock),
      stockStatus: Number(data.stock) === 0 ? 'out_of_stock' : Number(data.stock) <= 5 ? 'low_stock' : 'in_stock',
      format: data.format,
      categoryId: categoryRecord.id,
      publications: { set: pubIds.map(id => ({ id })) },
      isTrending: data.isTrending === 'true'
    };

    if (req.file) {
      updateData.coverImage = `/uploaded_books/${req.file.filename}`;
    } else if (data.coverImage) {
      updateData.coverImage = data.coverImage;
    }

    const book = await prisma.book.update({
      where: { id: bookId },
      data: updateData
    });

    await clearCache(); // Invalidate cache
    io.emit('books_updated'); // Emit real-time event
    res.json(book);
  } catch (error: any) {
    logger.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A book with this exact title already exists.' });
    }
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Admin: Delete Book
app.delete('/api/admin/books/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const bookId = String(req.params.id);
    
    await prisma.$transaction(async (tx) => {
      const orderItemCount = await tx.orderItem.count({ where: { bookId } });
      if (orderItemCount > 0) {
        throw new Error('EXISTING_ORDERS');
      }
      await tx.review.deleteMany({ where: { bookId } });
      await tx.book.delete({ where: { id: bookId } });
    });
    
    await clearCache();
    io.emit('books_updated');
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'EXISTING_ORDERS') {
      return res.status(400).json({ error: 'Cannot delete book: It has existing orders.' });
    }
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [totalBooks, stockAggr, totalCategories, totalUsers, totalOrders, lowStockBooks] = await Promise.all([
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { stock: true } }),
      prisma.category.count(),
      prisma.user.count(),
      prisma.order.count({ where: { status: 'Paid' } }),
      prisma.book.count({ where: { stock: { lte: 5 } } })
    ]);
    res.json({
      totalBooks,
      totalStock: stockAggr._sum.stock || 0,
      totalCategories,
      totalUsers,
      totalOrders,
      lowStockBooks
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});


// Global Search API
app.get('/api/search', async (req, res) => {
  try {
    const query = String(req.query.q || '');
    if (!query.trim()) {
      return res.json([]);
    }

    const noSpacesQuery = query.replace(/\s+/g, '');
    const noHyphensQuery = query.replace(/-/g, '');

    // Execute raw SQL to fetch matches using ILIKE and pg_trgm for performance, 
    // and correctly rank matches as requested.
    const sql = `
      SELECT b.*, c.name as "categoryName", pub.names as "publicationName",
        CASE
          WHEN b.title ILIKE $1 THEN 1
          WHEN b.title ILIKE $2 THEN 2
          WHEN REPLACE(COALESCE(b.author, ''), ' ', '') ILIKE $3 THEN 3
          WHEN REPLACE(COALESCE(b.isbn, ''), '-', '') ILIKE $4 THEN 4
          WHEN c.name ILIKE $2 THEN 5
          ELSE 6
        END as "rankScore",
        CASE
          WHEN b.title ILIKE $1 THEN 'name'
          WHEN b.title ILIKE $2 THEN 'name'
          WHEN REPLACE(COALESCE(b.author, ''), ' ', '') ILIKE $3 THEN 'author'
          WHEN REPLACE(COALESCE(b.isbn, ''), '-', '') ILIKE $4 THEN 'isbn'
          WHEN c.name ILIKE $2 THEN 'category'
        END as "matchedOn"
      FROM "Book" b
      LEFT JOIN "Category" c ON b."categoryId" = c.id
      LEFT JOIN (
        SELECT bp."A" as book_id, STRING_AGG(p.name, ', ') as names
        FROM "_BookToPublication" bp
        JOIN "Publication" p ON bp."B" = p.id
        GROUP BY bp."A"
      ) pub ON b.id = pub.book_id
      WHERE 
        b.title ILIKE $2 OR
        REPLACE(COALESCE(b.author, ''), ' ', '') ILIKE $3 OR
        REPLACE(COALESCE(b.isbn, ''), '-', '') ILIKE $4 OR
        c.name ILIKE $2
      ORDER BY "rankScore" ASC, b.title ASC
      LIMIT 100
    `;

    // We pass parameters separately.
    // $1 = exact match query for title (or close)
    // $2 = partial match query for title/category
    // $3 = partial match query for author (no spaces)
    // $4 = partial match query for isbn (no hyphens)

    const rawResults: any[] = await prisma.$queryRawUnsafe(
      sql,
      query,
      `%${query}%`,
      `%${noSpacesQuery}%`,
      `%${noHyphensQuery}%`
    );

    // Apply limits: Category matches have NO limit, others max 20 globally.
    // But since they are all sorted together, we can process them in memory easily since max result count is manageable.
    const finalResults = [];
    let otherCount = 0;
    
    for (const row of rawResults) {
      if (row.matchedOn === 'category') {
        finalResults.push(row);
      } else {
        if (otherCount < 20) {
          finalResults.push(row);
          otherCount++;
        }
      }
    }

    res.json(finalResults);
  } catch (error) {
    logger.error(error, 'Search error:');
    res.status(500).json({ error: 'Search failed' });
  }
});

// Global error handler (Performance/Security: never leak stack traces)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Too many files uploaded. Only one image is allowed.' });
  }
  if (err.message?.includes('Only JPEG')) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, AVIF, and GIF images are allowed.' });
  }
  logger.error(err);
  res.status(err.status || 500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
  logger.startup(Number(PORT), process.env.NODE_ENV || 'development');
});

// Configure server timeouts (Performance: connection resilience)
server.setTimeout(30000); // 30 seconds
server.keepAliveTimeout = 65000; // slightly higher than typical load balancer timeouts
server.headersTimeout = 66000;

const shutdown = async () => {
  logger.shutdown('Graceful shutdown initiated...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error(new Error('Force Timeout'), 'Forcefully shutting down after 10s');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Category Management APIs
app.put('/api/admin/categories/reorder', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array is required' });

    const updates = orderedIds.map((id, index) => 
      prisma.category.update({
        where: { id },
        data: { orderIndex: index }
      })
    );

    await prisma.$transaction(updates);
    
    // Clear cache
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    io.emit('categories_updated');
    res.json({ success: true });
  } catch (error) {
    logger.error(error, 'Reorder error:');
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

app.post('/api/admin/categories', authenticateToken, isAdmin, upload.single('image'), processImageUpload, async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const image_path = req.file ? `/uploaded_categories/${req.file.filename}` : null;
    
    const category = await prisma.category.create({
      data: { name, slug, description, image_path } as any
    });
    await clearCache();
    io.emit('categories_updated');
    res.json(category);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, isAdmin, upload.single('image'), processImageUpload, async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const updateData: any = { name, slug, description };
    
    if (req.file) {
      updateData.image_path = `/uploaded_categories/${req.file.filename}`;
    }
    
    const category = await prisma.category.update({
      where: { id: String(req.params.id) },
      data: updateData
    });
    await clearCache();
    io.emit('categories_updated');
    res.json(category);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categoryId = String(req.params.id);
    
    // Check if any books in this category have existing orders
    const booksWithOrders = await prisma.book.findMany({
      where: { categoryId },
      include: { orderItems: { take: 1 } }
    });
    const hasOrders = booksWithOrders.some(b => b.orderItems.length > 0);
    if (hasOrders) {
      return res.status(400).json({ error: 'Cannot delete this category. Some books have existing orders. Please manage those orders first.' });
    }
    
    // Safe deletion within a transaction
    await prisma.$transaction(async (tx) => {
      const books = await tx.book.findMany({ 
        where: { categoryId },
        select: { id: true }
      });
      
      for (const book of books) {
        await tx.review.deleteMany({ where: { bookId: book.id } });
      }
      await tx.book.deleteMany({ where: { categoryId } });
      await tx.category.delete({ where: { id: categoryId } });
    });
    
    await clearCache();
    io.emit('categories_updated');
    io.emit('books_updated');
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// User Management APIs
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count()
    ]);

    res.json({ data: users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin Orders Management
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          },
          items: {
            include: { book: { select: { title: true, coverImage: true, slug: true } } }
          }
        }
      }),
      prisma.order.count()
    ]);

    res.json({ data: orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.delete('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // The items will be deleted automatically if we set up cascading deletes,
    // but to be safe we can delete OrderItems first
    await prisma.orderItem.deleteMany({
      where: { orderId: id }
    });
    
    await prisma.order.delete({
      where: { id }
    });
    
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Admin Shiprocket Sync Actions
app.post('/api/admin/orders/:id/sync-shiprocket', authenticateToken, isAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const shiprocketRes = await createShiprocketOrder({
       order_id: order.id,
       order_date: new Date(order.createdAt).toISOString(),
       pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
       billing_customer_name: order.fullName,
       billing_last_name: '',
       billing_address: order.street,
       billing_city: order.city,
       billing_pincode: order.pinCode,
       billing_state: order.state,
       billing_country: 'India',
       billing_email: order.email,
       billing_phone: order.phone,
       shipping_is_billing: true,
       order_items: order.items.map((i: any) => ({
          name: "Book",
          sku: i.bookId,
          units: i.quantity,
          selling_price: i.unitPrice
       })),
       payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
       shipping_charges: order.paymentMethod === 'COD' ? order.shippingCharge + order.codCharge : order.shippingCharge,
       giftwrap_charges: 0,
       transaction_charges: 0,
       total_discount: order.discount,
       sub_total: order.productSubtotal,
       length: 10, breadth: 10, height: 10, weight: 0.5
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        shiprocketOrderId: shiprocketRes.order_id,
        shiprocketShipmentId: shiprocketRes.shipment_id,
        shippingSyncStatus: 'CREATED',
        shiprocketErrorMessage: null,
        shiprocketCreatedAt: new Date()
      }
    });

    res.json({ success: true, order: updated });
  } catch (error: any) {
    logger.error(error, 'Manual Shiprocket Sync Failed');
    res.status(500).json({ error: error.message || 'Failed to sync' });
  }
});

// Shiprocket Webhook
app.post('/api/webhooks/shipping/provider-update', async (req, res) => {
  try {
    const authHeader = req.headers['x-api-key']; // or whatever header Shiprocket sends
    if (authHeader !== process.env.SHIPROCKET_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { current_status, current_status_id, order_id, awb, courier_name } = req.body;
    
    // Find local order either by shiprocketOrderId or awbCode
    const order = await prisma.order.findFirst({
      where: { OR: [{ shiprocketOrderId: Number(order_id) }, { shiprocketAwbCode: awb }] }
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          shiprocketStatus: current_status,
          shiprocketStatusId: Number(current_status_id),
          orderStatus: current_status === 'DELIVERED' ? 'DELIVERED' : 
                       current_status === 'SHIPPED' ? 'SHIPPED' : 
                       current_status === 'CANCELED' ? 'CANCELLED' : order.orderStatus,
          shiprocketUpdatedAt: new Date(),
          shiprocketRawResponse: req.body as any
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(error, 'Shiprocket Webhook Error');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, role, password: hashedPassword }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const updateData: any = { name, email, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: updateData
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const ordersCount = await prisma.order.count({ where: { userId: String(req.params.id) } });
    if (ordersCount > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing orders.' });
    }
    await prisma.user.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
