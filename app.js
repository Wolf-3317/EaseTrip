const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const db = require('./config/database');

const app = express();

// Hardcoded config (no .env)
const SESSION_SECRET = 'easetrip_secret';
const IS_PRODUCTION = false;
const PORT = 3001;

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: IS_PRODUCTION,
      httpOnly: true,
      maxAge: 30 * 60 * 1000 // 30 minutes
    }
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

async function expirePendingBookings() {
  try {
    const [result] = await db.execute(`
      UPDATE bookings
      SET status = 'rejected'
      WHERE status = 'pending'
        AND check_in <= CURDATE()
    `);

    if (result.affectedRows > 0) {
      console.log(`[Expiry] Rejected ${result.affectedRows} pending booking(s)`);
    }
  } catch (err) {
    console.error('[Expiry] Failed to expire pending bookings:', err.message);
  }
}

// Run every hour
expirePendingBookings();
setInterval(expirePendingBookings, 60 * 60 * 1000);

// Routes
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const customerRoutes = require('./routes/customer');
const hostRoutes = require('./routes/host');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/listings', listingRoutes);
app.use('/customer', customerRoutes);
app.use('/host', hostRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', async (req, res) => {
  try {
    const Listing = require('./models/Listing');
    const featuredListings = await Listing.getFeatured(8);
    const popularCities = await Listing.getPopularCities();

    res.render('index', {
      title: 'EaseTrip - Discover Malaysia',
      featuredListings,
      popularCities
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.render('index', {
      title: 'EaseTrip - Discover Malaysia',
      featuredListings: [],
      popularCities: []
    });
  }
});

// Privacy Policy
app.get('/privacy-policy', (req, res) => {
  res.render('privacy-policy', {
    title: 'Privacy Policy - EaseTrip'
  });
});

// Terms of Service
app.get('/terms-of-service', (req, res) => {
  res.render('terms-of-service', {
    title: 'Terms of Service - EaseTrip'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: 'Something went wrong. Please try again later.'
  });
});

app.listen(PORT, () => {
  console.log(`EaseTrip server running on http://localhost:${PORT}`);
});

module.exports = app;
