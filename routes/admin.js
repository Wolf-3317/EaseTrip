const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Report = require('../models/Report');
const Message = require('../models/Message');
const Weather = require('../models/Weather');
const db = require('../config/database');

// Admin dashboard
router.get('/dashboard', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Get stats
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role != "admin"');
        const [listingCount] = await db.execute('SELECT COUNT(*) as count FROM listings');
        const [bookingCount] = await db.execute('SELECT COUNT(*) as count FROM bookings');
        const [pendingListings] = await db.execute('SELECT COUNT(*) as count FROM listings WHERE status = "pending"');
        const pendingReports = await Report.getPendingCount();

        // Recent activity
        const [recentUsers] = await db.execute(
            'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5'
        );
        const [recentBookings] = await db.execute(`
            SELECT b.*, l.title as listing_title, u.name as customer_name
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users u ON b.customer_id = u.id
            ORDER BY b.created_at DESC LIMIT 5
        `);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard - EaseTrip',
            layout: 'layouts/main',
            stats: {
                users: userCount[0].count,
                listings: listingCount[0].count,
                bookings: bookingCount[0].count,
                pendingListings: pendingListings[0].count,
                pendingReports
            },
            recentUsers,
            recentBookings
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Manage users
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { role, status, search } = req.query;
        const users = await User.getAll({ role, status, search });

        res.render('admin/users', {
            title: 'Manage Users - EaseTrip',
            layout: 'layouts/main',
            users,
            filters: req.query
        });
    } catch (error) {
        console.error('Admin users error:', error);
        req.flash('error_msg', 'Error loading users');
        res.redirect('/admin/dashboard');
    }
});

// Update user status
router.post('/users/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await User.updateStatus(req.params.id, status);

        req.flash('success_msg', 'User status updated');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Update user status error:', error);
        req.flash('error_msg', 'Error updating user');
        res.redirect('/admin/users');
    }
});

// Verify host
router.post('/users/:id/verify', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await db.execute('UPDATE users SET identity_verified = TRUE WHERE id = ?', [req.params.id]);
        req.flash('success_msg', 'Host verified successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Verify host error:', error);
        req.flash('error_msg', 'Error verifying host');
        res.redirect('/admin/users');
    }
});

// Manage listings
router.get('/listings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status, city } = req.query;
        const listings = await Listing.getAll({ status, city });

        res.render('admin/listings', {
            title: 'Manage Listings - EaseTrip',
            layout: 'layouts/main',
            listings,
            filters: req.query
        });
    } catch (error) {
        console.error('Admin listings error:', error);
        req.flash('error_msg', 'Error loading listings');
        res.redirect('/admin/dashboard');
    }
});

// Update listing status
router.post('/listings/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await Listing.update(req.params.id, { status });

        req.flash('success_msg', 'Listing status updated');
        res.redirect('/admin/listings');
    } catch (error) {
        console.error('Update listing status error:', error);
        req.flash('error_msg', 'Error updating listing');
        res.redirect('/admin/listings');
    }
});

// Feature/unfeature listing
router.post('/listings/:id/feature', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { featured } = req.body;
        await db.execute('UPDATE listings SET is_featured = ? WHERE id = ?', [featured === 'true', req.params.id]);

        req.flash('success_msg', `Listing ${featured === 'true' ? 'featured' : 'unfeatured'}`);
        res.redirect('/admin/listings');
    } catch (error) {
        console.error('Feature listing error:', error);
        req.flash('error_msg', 'Error updating listing');
        res.redirect('/admin/listings');
    }
});

// Manage reports
router.get('/reports', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const status = req.query.status || null;     // null = All
    const reports = await Report.getAll(status);

    res.render('admin/reports', {
      title: 'Manage Reports - EaseTrip',
      layout: 'layouts/main',
      reports,
      filters: { status }                        // matches reports.pug
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    req.flash('error_msg', 'Error loading reports');
    res.redirect('/admin/dashboard');
  }
});


// Handle report
router.post('/reports/:id/handle', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status, notes, action } = req.body;
        const report = await Report.findById(req.params.id);

        if (!report) {
            req.flash('error_msg', 'Report not found');
            return res.redirect('/admin/reports');
        }

        // Take action based on report type
        if (action === 'remove') {
            if (report.type === 'listing' && report.reported_listing_id) {
                await Listing.update(report.reported_listing_id, { status: 'delisted' });
            } else if (report.type === 'review' && report.reported_review_id) {
                await Review.updateStatus(report.reported_review_id, 'removed');
            } else if (report.type === 'user' && report.reported_user_id) {
                await User.updateStatus(report.reported_user_id, 'suspended');
            }
        }

        await Report.updateStatus(req.params.id, status, req.session.user.id, notes);

        req.flash('success_msg', 'Report handled successfully');
        res.redirect('/admin/reports');
    } catch (error) {
        console.error('Handle report error:', error);
        req.flash('error_msg', 'Error handling report');
        res.redirect('/admin/reports');
    }
});

// Update report status (simple status update from buttons)
router.post('/reports/:id/update', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        await Report.updateStatus(req.params.id, status, req.session.user.id);

        req.flash('success_msg', `Report marked as ${status}`);
        res.redirect('/admin/reports');
    } catch (error) {
        console.error('Update report status error:', error);
        req.flash('error_msg', 'Error updating report');
        res.redirect('/admin/reports');
    }
});

// Send message to user
router.post('/message', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { receiver_id, subject, content } = req.body;

        await Message.create({
            sender_id: req.session.user.id,
            receiver_id: parseInt(receiver_id),
            subject,
            content,
            is_system_message: true
        });

        req.flash('success_msg', 'Message sent successfully');
        res.redirect('back');
    } catch (error) {
        console.error('Send message error:', error);
        req.flash('error_msg', 'Error sending message');
        res.redirect('back');
    }
});

// Weather management
router.get('/weather', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const weatherData = await Weather.getAllWeather();
        

        res.render('admin/weather', {
            title: 'Weather Management - EaseTrip',
            layout: 'layouts/main',
            weatherData,
           
        });
    } catch (error) {
        console.error('Admin weather error:', error);
        req.flash('error_msg', 'Error loading weather data');
        res.redirect('/admin/dashboard');
    }
});

// Add/update weather data



// Activity reports
router.get('/activity', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Get activity stats
        const [monthlyBookings] = await db.execute(`
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
            FROM bookings
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 12
        `);

        const [topHosts] = await db.execute(`
            SELECT u.id, u.name, u.email, COUNT(l.id) as listings, 
                   (SELECT COUNT(*) FROM bookings WHERE host_id = u.id) as total_bookings
            FROM users u
            LEFT JOIN listings l ON u.id = l.host_id
            WHERE u.role = 'host'
            GROUP BY u.id
            ORDER BY total_bookings DESC
            LIMIT 10
        `);

        const [topListings] = await db.execute(`
            SELECT l.id, l.title, l.city, COUNT(b.id) as bookings,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id) as avg_rating
            FROM listings l
            LEFT JOIN bookings b ON l.id = b.listing_id
            GROUP BY l.id
            ORDER BY bookings DESC
            LIMIT 10
        `);

        res.render('admin/activity', {
            title: 'Activity Reports - EaseTrip',
            layout: 'layouts/main',
            monthlyBookings,
            topHosts,
            topListings
        });
    } catch (error) {
        console.error('Activity report error:', error);
        req.flash('error_msg', 'Error loading activity');
        res.redirect('/admin/dashboard');
    }
});

module.exports = router;
