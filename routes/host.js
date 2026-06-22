const express = require('express');
const router = express.Router();
const { isAuthenticated, isHost } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');
const Report = require('../models/Report');
const db = require('../config/database');

// Host dashboard
router.get('/dashboard', isAuthenticated, isHost, async (req, res) => {
    try {
        const stats = await User.getHostStats(req.session.user.id);
        const bookingStats = await Booking.getHostStats(req.session.user.id);
        const recentBookings = await Booking.getByHost(req.session.user.id);
        const listings = await Listing.getByHost(req.session.user.id);

        res.render('host/dashboard', {
            title: 'Host Dashboard - EaseTrip',
            layout: 'layouts/main',
            stats,
            bookingStats,
            recentBookings: recentBookings.slice(0, 5),
            listings: listings.slice(0, 4)
        });
    } catch (error) {
        console.error('Host dashboard error:', error);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// View all listings
router.get('/listings', isAuthenticated, isHost, async (req, res) => {
    try {
        const status = req.query.status;
        const listings = await Listing.getByHost(req.session.user.id, status);

        res.render('host/listings', {
            title: 'My Listings - EaseTrip',
            layout: 'layouts/main',
            listings,
            filter: status
        });
    } catch (error) {
        console.error('Host listings error:', error);
        req.flash('error_msg', 'Error loading listings');
        res.redirect('/host/dashboard');
    }
});

// Create listing form
router.get('/listings/create', isAuthenticated, isHost, async (req, res) => {
    try {
        const amenities = await Listing.getAllAmenities();

        res.render('host/create-listing', {
            title: 'Create Listing - EaseTrip',
            layout: 'layouts/main',
            amenities
        });
    } catch (error) {
        console.error('Create listing form error:', error);
        req.flash('error_msg', 'Error loading form');
        res.redirect('/host/listings');
    }
});

// Create listing
router.post('/listings/create', isAuthenticated, isHost, upload.array('images', 10), async (req, res) => {
    try {
        const {
            title, description, type, category, price, address, city, state,
            postal_code, latitude, longitude, max_guests, bedrooms, bathrooms, amenities
        } = req.body;

        const listingId = await Listing.create({
            host_id: req.session.user.id,
            title,
            description,
            type,
            category,
            price: parseFloat(price),
            address,
            city,
            state,
            postal_code,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            max_guests: parseInt(max_guests) || 1,
            bedrooms: parseInt(bedrooms) || 1,
            bathrooms: parseInt(bathrooms) || 1
        });

        // Add images
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                await Listing.addImage(listingId, '/uploads/' + req.files[i].filename, i === 0);
            }
        }

        // Add amenities
        if (amenities) {
            const amenityIds = Array.isArray(amenities) ? amenities : [amenities];
            for (const amenityId of amenityIds) {
                await Listing.addAmenity(listingId, parseInt(amenityId));
            }
        }

        req.flash('success_msg', 'Listing created successfully! It is pending approval.');
        res.redirect('/host/listings');
    } catch (error) {
        console.error('Create listing error:', error);
        req.flash('error_msg', 'Error creating listing');
        res.redirect('/host/listings/create');
    }
});

// Edit listing form
router.get('/listings/:id/edit', isAuthenticated, isHost, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing || listing.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Listing not found');
            return res.redirect('/host/listings');
        }

        const amenities = await Listing.getAllAmenities();

        res.render('host/edit-listing', {
            title: 'Edit Listing - EaseTrip',
            layout: 'layouts/main',
            listing,
            amenities
        });
    } catch (error) {
        console.error('Edit listing form error:', error);
        req.flash('error_msg', 'Error loading listing');
        res.redirect('/host/listings');
    }
});

// Update listing
router.post('/listings/:id/edit', isAuthenticated, isHost, upload.array('images', 10), async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing || listing.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Listing not found');
            return res.redirect('/host/listings');
        }

        const {
            title, description, type, category, price, address, city, state,
            postal_code, latitude, longitude, max_guests, bedrooms, bathrooms, amenities
        } = req.body;

        await Listing.update(req.params.id, {
            title,
            description,
            type,
            category,
            price: parseFloat(price),
            address,
            city,
            state,
            postal_code,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            max_guests: parseInt(max_guests) || 1,
            bedrooms: parseInt(bedrooms) || 1,
            bathrooms: parseInt(bathrooms) || 1
        });

        // Add new images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await Listing.addImage(req.params.id, '/uploads/' + file.filename, false);
            }
        }

        // Update amenities
        if (amenities) {
            // Remove existing amenities
            await db.execute('DELETE FROM listing_amenities WHERE listing_id = ?', [req.params.id]);

            const amenityIds = Array.isArray(amenities) ? amenities : [amenities];
            for (const amenityId of amenityIds) {
                await Listing.addAmenity(req.params.id, parseInt(amenityId));
            }
        }

        req.flash('success_msg', 'Listing updated successfully');
        res.redirect('/host/listings');
    } catch (error) {
        console.error('Update listing error:', error);
        req.flash('error_msg', 'Error updating listing');
        res.redirect(`/host/listings/${req.params.id}/edit`);
    }
});

// Delete/Delist listing
router.post('/listings/:id/delete', isAuthenticated, isHost, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing || listing.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Listing not found');
            return res.redirect('/host/listings');
        }

        const { action } = req.body;

        if (action === 'delist') {
            await Listing.update(req.params.id, { status: 'delisted' });
            req.flash('success_msg', 'Listing delisted successfully');
        } else if (action === 'activate') {
            await Listing.update(req.params.id, { status: 'active' });
            req.flash('success_msg', 'Listing activated successfully');
        } else {
            await Listing.delete(req.params.id);
            req.flash('success_msg', 'Listing deleted successfully');
        }

        res.redirect('/host/listings');
    } catch (error) {
        console.error('Delete listing error:', error);
        req.flash('error_msg', 'Error processing request');
        res.redirect('/host/listings');
    }
});

// View bookings
router.get('/bookings', isAuthenticated, isHost, async (req, res) => {
    try {
        const status = req.query.status;
        const bookings = await Booking.getByHost(req.session.user.id, status);

        res.render('host/bookings', {
            title: 'Bookings - EaseTrip',
            layout: 'layouts/main',
            bookings,
            filter: status
        });
    } catch (error) {
        console.error('Host bookings error:', error);
        req.flash('error_msg', 'Error loading bookings');
        res.redirect('/host/dashboard');
    }
});

// Confirm/reject booking
router.post('/bookings/:id/update', isAuthenticated, isHost, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking || booking.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/host/bookings');
        }

        const { action, reason } = req.body;

        if (action === 'confirm') {
            await Booking.updateStatus(req.params.id, 'confirmed');
            req.flash('success_msg', 'Booking confirmed');
        } else if (action === 'reject') {
            await Booking.updateStatus(req.params.id, 'rejected', reason);
            req.flash('success_msg', 'Booking rejected');
        }

        res.redirect('/host/bookings');
    } catch (error) {
        console.error('Update booking error:', error);
        req.flash('error_msg', 'Error updating booking');
        res.redirect('/host/bookings');
    }
});

// View reviews
router.get('/reviews', isAuthenticated, isHost, async (req, res) => {
    try {
        const reviews = await Review.getByHost(req.session.user.id);

        res.render('host/reviews', {
            title: 'Reviews - EaseTrip',
            layout: 'layouts/main',
            reviews
        });
    } catch (error) {
        console.error('Host reviews error:', error);
        req.flash('error_msg', 'Error loading reviews');
        res.redirect('/host/dashboard');
    }
});

// Report review
router.post('/reviews/:id/report', isAuthenticated, isHost, async (req, res) => {
    try {
        const { reason, description } = req.body;

        await Report.create({
            reporter_id: req.session.user.id,
            reported_review_id: req.params.id,
            type: 'review',
            reason,
            description
        });

        await Review.report(req.params.id, reason);

        req.flash('success_msg', 'Review reported successfully');
        res.redirect('/host/reviews');
    } catch (error) {
        console.error('Report review error:', error);
        req.flash('error_msg', 'Error reporting review');
        res.redirect('/host/reviews');
    }
});


// Host bookings page
router.get('/bookings', isAuthenticated, isHost, async (req, res) => {
    try {
        const status = req.query.status;
        const bookings = await Booking.getByHost(req.session.user.id, status);

        res.render('host/bookings', {
            title: 'Bookings - EaseTrip',
            layout: 'layouts/main',
            bookings,
            filter: status
        });
    } catch (error) {
        console.error('Host bookings error:', error);
        req.flash('error_msg', 'Error loading bookings');
        res.redirect('/host/dashboard');
    }
});

// Update booking status
router.post('/bookings/:id/update', isAuthenticated, isHost, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking || booking.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/host/bookings');
        }

        const { action } = req.body;

        if (action === 'confirm') {
            await Booking.updateStatus(req.params.id, 'confirmed');
            req.flash('success_msg', 'Booking confirmed!');
        } else if (action === 'reject') {
            await Booking.updateStatus(req.params.id, 'rejected');
            req.flash('success_msg', 'Booking rejected');
        }

        res.redirect('/host/bookings');
    } catch (error) {
        console.error('Booking update error:', error);
        req.flash('error_msg', 'Error updating booking');
        res.redirect('/host/bookings');
    }

    if (booking.status === 'pending' && new Date(booking.check_in) <= new Date(new Date().toISOString().slice(0, 10))) {
        await Booking.updateStatus(req.params.id, 'rejected');
        req.flash('error_msg', 'Booking expired. Check-in date already passed');
        return res.redirect('/host/bookings');
        }
});

// Host reviews page
router.get('/reviews', isAuthenticated, isHost, async (req, res) => {
    try {
        const reviews = await Review.getByHost(req.session.user.id);

        res.render('host/reviews', {
            title: 'Reviews - EaseTrip',
            layout: 'layouts/main',
            reviews
        });
    } catch (error) {
        console.error('Host reviews error:', error);
        req.flash('error_msg', 'Error loading reviews');
        res.redirect('/host/dashboard');
    }
});

// Report a review
router.post('/reviews/:id/report', isAuthenticated, isHost, async (req, res) => {
    try {
        const { reason, description } = req.body;

        await Report.create({
            reporter_id: req.session.user.id,
            reported_review_id: req.params.id,
            type: 'review',
            reason,
            description
        });

        await Review.report(req.params.id, reason);

        req.flash('success_msg', 'Review reported successfully');
        res.redirect('/host/reviews');
    } catch (error) {
        console.error('Report review error:', error);
        req.flash('error_msg', 'Error reporting review');
        res.redirect('/host/reviews');
    }
});

// Import Message model
const Message = require('../models/Message');

// Host Inbox 
router.get('/inbox', isAuthenticated, isHost, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const received = await Message.getInbox(userId);
        const sent = await Message.getSent(userId);

        const messages = [...received, ...sent].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const unreadCount = await Message.getUnreadCount(userId);

        res.render('host/inbox', {
            title: 'Inbox - EaseTrip',
            layout: 'layouts/main',
            messages,
            unreadCount,
            currentUserId: userId
        });
    } catch (error) {
        console.error('Host inbox error:', error);
        req.flash('error_msg', 'Error loading inbox');
        res.redirect('/host/dashboard');
    }
});


// View conversation with a user
router.get('/inbox/conversation/:userId', isAuthenticated, isHost, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const conversation = await Message.getConversation(req.session.user.id, otherUserId);
        const [otherUser] = await db.execute('SELECT id, name, avatar, role FROM users WHERE id = ?', [otherUserId]);

        // Mark messages as read
        for (const msg of conversation) {
            if (msg.receiver_id === req.session.user.id && !msg.is_read) {
                await Message.markAsRead(msg.id);
            }
        }

        res.render('host/conversation', {
            title: 'Conversation - EaseTrip',
            layout: 'layouts/main',
            conversation,
            otherUser: otherUser[0]
        });
    } catch (error) {
        console.error('Host conversation error:', error);
        req.flash('error_msg', 'Error loading conversation');
        res.redirect('/host/inbox');
    }
});

// Send message/reply
router.post('/inbox/send', isAuthenticated, isHost, async (req, res) => {
    try {
        const { receiver_id, subject, content, booking_id } = req.body;

        await Message.create({
            sender_id: req.session.user.id,
            receiver_id: receiver_id,
            booking_id: booking_id || null,
            subject: subject || null,
            content
        });

        req.flash('success_msg', 'Message sent successfully');
        if (booking_id) {
            res.redirect(`/host/inbox/booking/${booking_id}`);
        } else {
            res.redirect(`/host/inbox/conversation/${receiver_id}`);
        }
    } catch (error) {
        console.error('Send message error:', error);
        req.flash('error_msg', 'Error sending message');
        res.redirect('/host/inbox');
    }
});

// Booking-based conversation for host
router.get('/inbox/booking/:bookingId', isAuthenticated, isHost, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking || booking.host_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/host/bookings');
        }

        // Check if booking is confirmed
        if (booking.status !== 'confirmed') {
            req.flash('error_msg', 'Chat is only available for confirmed bookings');
            return res.redirect('/host/bookings');
        }

        // Check if already reviewed (trip over)
        const Review = require('../models/Review');
        const hasReview = await Review.hasReviewed(booking.id);
        if (hasReview) {
            req.flash('error_msg', 'Chat has ended since the guest submitted a review');
            return res.redirect('/host/bookings');
        }

        // Get conversation with customer for this booking
        const conversation = await Message.getConversation(req.session.user.id, booking.customer_id);
        const [customerUser] = await db.execute('SELECT id, name, avatar, role FROM users WHERE id = ?', [booking.customer_id]);

        // Mark messages as read
        for (const msg of conversation) {
            if (msg.receiver_id === req.session.user.id && !msg.is_read) {
                await Message.markAsRead(msg.id);
            }
        }

        res.render('host/booking-chat', {
            title: 'Chat with Guest - EaseTrip',
            layout: 'layouts/main',
            conversation,
            booking,
            otherUser: customerUser[0]
        });
    } catch (error) {
        console.error('Host booking chat error:', error);
        req.flash('error_msg', 'Error loading chat');
        res.redirect('/host/bookings');
    }
});

module.exports = router;
