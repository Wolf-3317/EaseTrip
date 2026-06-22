const express = require('express');
const router = express.Router();
const { isAuthenticated, isCustomer } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Message = require('../models/Message');
const Report = require('../models/Report');

// Customer dashboard
router.get('/dashboard', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const upcomingTrips = await Booking.getUpcomingTrips(req.session.user.id);
        const favorites = await Favorite.getByUser(req.session.user.id);
        const unreadMessages = await Message.getUnreadCount(req.session.user.id);

        res.render('customer/dashboard', {
            title: 'Dashboard - EaseTrip',
            layout: 'layouts/main',
            upcomingTrips: upcomingTrips.slice(0, 3),
            favorites: favorites.slice(0, 4),
            unreadMessages
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// View all bookings
router.get('/bookings', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const status = req.query.status;
        const bookings = await Booking.getByCustomer(req.session.user.id, status);

        res.render('customer/bookings', {
            title: 'My Bookings - EaseTrip',
            layout: 'layouts/main',
            bookings,
            filter: status
        });
    } catch (error) {
        console.error('Bookings error:', error);
        req.flash('error_msg', 'Error loading bookings');
        res.redirect('/customer/dashboard');
    }
});

// View trips (upcoming and past)
router.get('/trips', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const upcomingTrips = await Booking.getUpcomingTrips(req.session.user.id);
        const pastTrips = await Booking.getPastTrips(req.session.user.id);

        res.render('customer/trips', {
            title: 'My Trips - EaseTrip',
            layout: 'layouts/main',
            upcomingTrips,
            pastTrips
        });
    } catch (error) {
        console.error('Trips error:', error);
        req.flash('error_msg', 'Error loading trips');
        res.redirect('/customer/dashboard');
    }
});

// Create booking
router.post('/book/:listingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const { check_in, check_out, guests, special_requests } = req.body;
        const listingId = req.params.listingId;

        const listing = await Listing.findById(listingId);
        if (!listing || listing.status !== 'active') {
            req.flash('error_msg', 'Listing not available');
            return res.redirect('/listings');
        }

        // Check availability
        const isAvailable = await Booking.checkAvailability(listingId, check_in, check_out);
        if (!isAvailable) {
            req.flash('error_msg', 'Selected dates are not available');
            return res.redirect(`/listings/${listingId}`);
        }

        // Calculate total price
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const totalPrice = listing.price * nights;
        const serviceFee = totalPrice * 0.1; // 10% service fee

        const bookingId = await Booking.create({
            listing_id: listingId,
            customer_id: req.session.user.id,
            host_id: listing.host_id,
            check_in,
            check_out,
            guests: parseInt(guests) || 1,
            total_price: totalPrice + serviceFee,
            service_fee: serviceFee,
            special_requests
        });

        req.flash('success_msg', 'Booking request submitted successfully!');
        res.redirect('/customer/bookings');
    } catch (error) {
        console.error('Booking error:', error);
        req.flash('error_msg', 'Error creating booking');
        res.redirect('/listings');
    }
});

// Cancel booking
router.post('/bookings/:id/cancel', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking || booking.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/customer/bookings');
        }

        const canCancel = await Booking.canCancel(bookingId);
        if (!canCancel) {
            req.flash('error_msg', 'Cannot cancel booking less than 48 hours before check-in');
            return res.redirect('/customer/bookings');
        }

        await Booking.updateStatus(bookingId, 'cancelled', reason);
        req.flash('success_msg', 'Booking cancelled successfully');
        res.redirect('/customer/bookings');
    } catch (error) {
        console.error('Cancel booking error:', error);
        req.flash('error_msg', 'Error cancelling booking');
        res.redirect('/customer/bookings');
    }
});

// Favorites
router.get('/favorites', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const favorites = await Favorite.getByUser(req.session.user.id);

        res.render('customer/favorites', {
            title: 'My Favorites - EaseTrip',
            layout: 'layouts/main',
            favorites
        });
    } catch (error) {
        console.error('Favorites error:', error);
        req.flash('error_msg', 'Error loading favorites');
        res.redirect('/customer/dashboard');
    }
});

// Add favorite
router.post('/favorites/:listingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        await Favorite.add(req.session.user.id, req.params.listingId);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true });
        }

        req.flash('success_msg', 'Added to favorites');
        res.redirect('back');
    } catch (error) {
        console.error('Add favorite error:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Failed to add favorite' });
        }
        req.flash('error_msg', 'Error adding to favorites');
        res.redirect('back');
    }
});

// Remove favorite
router.delete('/favorites/:listingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        await Favorite.remove(req.session.user.id, req.params.listingId);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true });
        }

        req.flash('success_msg', 'Removed from favorites');
        res.redirect('/customer/favorites');
    } catch (error) {
        console.error('Remove favorite error:', error);
        if (req.xhr) {
            return res.status(500).json({ error: 'Failed to remove favorite' });
        }
        req.flash('error_msg', 'Error removing from favorites');
        res.redirect('/customer/favorites');
    }
});

// Reviews
router.get('/reviews', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const reviews = await Review.getByCustomer(req.session.user.id);

        res.render('customer/reviews', {
            title: 'My Reviews - EaseTrip',
            layout: 'layouts/main',
            reviews
        });
    } catch (error) {
        console.error('Reviews error:', error);
        req.flash('error_msg', 'Error loading reviews');
        res.redirect('/customer/dashboard');
    }
});

// Create review form
router.get('/review/:bookingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking || booking.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/customer/trips');
        }

        // Allow review if booking is confirmed or completed
        if (booking.status !== 'confirmed' && booking.status !== 'completed') {
            req.flash('error_msg', 'You can only review confirmed or completed bookings');
            return res.redirect('/customer/trips');
        }

        const hasReviewed = await Review.hasReviewed(booking.id);
        if (hasReviewed) {
            req.flash('error_msg', 'You have already reviewed this booking');
            return res.redirect('/customer/reviews');
        }

        res.render('customer/create-review', {
            title: 'Write a Review - EaseTrip',
            layout: 'layouts/main',
            booking
        });
    } catch (error) {
        console.error('Review form error:', error);
        req.flash('error_msg', 'Error loading review form');
        res.redirect('/customer/trips');
    }
});

// Submit review
router.post('/review/:bookingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking || booking.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/customer/trips');
        }

        const { rating, comment, cleanliness, communication, location, value } = req.body;

        await Review.create({
            booking_id: booking.id,
            listing_id: booking.listing_id,
            customer_id: req.session.user.id,
            rating: parseInt(rating),
            comment,
            cleanliness_rating: parseInt(cleanliness),
            communication_rating: parseInt(communication),
            location_rating: parseInt(location),
            value_rating: parseInt(value)
        });

        // Mark booking as completed
        await Booking.updateStatus(booking.id, 'completed');

        req.flash('success_msg', 'Thank you for your review!');
        res.redirect('/customer/reviews');
    } catch (error) {
        console.error('Submit review error:', error);
        req.flash('error_msg', 'Error submitting review');
        res.redirect('/customer/trips');
    }
});

// Edit review
router.get('/reviews/:id/edit', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review || review.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Review not found');
            return res.redirect('/customer/reviews');
        }

        res.render('customer/edit-review', {
            title: 'Edit Review - EaseTrip',
            layout: 'layouts/main',
            review
        });
    } catch (error) {
        console.error('Edit review error:', error);
        req.flash('error_msg', 'Error loading review');
        res.redirect('/customer/reviews');
    }
});

// Update review
router.post('/reviews/:id', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review || review.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Review not found');
            return res.redirect('/customer/reviews');
        }

        const { rating, comment, cleanliness, communication, location, value } = req.body;

        await Review.update(req.params.id, {
            rating: parseInt(rating),
            comment,
            cleanliness_rating: parseInt(cleanliness),
            communication_rating: parseInt(communication),
            location_rating: parseInt(location),
            value_rating: parseInt(value)
        });

        req.flash('success_msg', 'Review updated successfully');
        res.redirect('/customer/reviews');
    } catch (error) {
        console.error('Update review error:', error);
        req.flash('error_msg', 'Error updating review');
        res.redirect('/customer/reviews');
    }
});

// Inbox
router.get('/inbox', isAuthenticated, async (req, res) => {
    try {
        const messages = await Message.getInbox(req.session.user.id);

        res.render('customer/inbox', {
            title: 'Inbox - EaseTrip',
            layout: 'layouts/main',
            messages
        });
    } catch (error) {
        console.error('Inbox error:', error);
        req.flash('error_msg', 'Error loading inbox');
        res.redirect('/customer/dashboard');
    }
});

// View message
router.get('/inbox/:id', isAuthenticated, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message || message.receiver_id !== req.session.user.id) {
            req.flash('error_msg', 'Message not found');
            return res.redirect('/customer/inbox');
        }

        await Message.markAsRead(req.params.id);

        res.render('customer/message', {
            title: 'Message - EaseTrip',
            layout: 'layouts/main',
            message
        });
    } catch (error) {
        console.error('View message error:', error);
        req.flash('error_msg', 'Error loading message');
        res.redirect('/customer/inbox');
    }
});

// Report listing
router.post('/report/listing/:id', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const { reason, description } = req.body;

        await Report.create({
            reporter_id: req.session.user.id,
            reported_listing_id: req.params.id,
            type: 'listing',
            reason,
            description
        });

        req.flash('success_msg', 'Report submitted. We will review it shortly.');
        const backUrl = req.get('Referrer') || '/';
        res.redirect(backUrl);
    } catch (error) {
        console.error('Report listing error:', error);
        req.flash('error_msg', 'Error submitting report');
        res.redirect('back');
    }
});

// View conversation with a user (host)
router.get('/inbox/conversation/:userId', isAuthenticated, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const conversation = await Message.getConversation(req.session.user.id, otherUserId);
        const db = require('../config/database');
        const [otherUser] = await db.execute('SELECT id, name, avatar, role FROM users WHERE id = ?', [otherUserId]);

        // Mark messages as read
        for (const msg of conversation) {
            if (msg.receiver_id === req.session.user.id && !msg.is_read) {
                await Message.markAsRead(msg.id);
            }
        }

        res.render('customer/conversation', {
            title: 'Conversation - EaseTrip',
            layout: 'layouts/main',
            conversation,
            otherUser: otherUser[0]
        });
    } catch (error) {
        console.error('Customer conversation error:', error);
        req.flash('error_msg', 'Error loading conversation');
        res.redirect('/customer/inbox');
    }
});

// Send message/reply
router.post('/inbox/send', isAuthenticated, async (req, res) => {
    try {
        const { receiver_id, subject, content, booking_id } = req.body;

        // Validate booking if provided
        if (booking_id) {
            const booking = await Booking.findById(booking_id);
            if (!booking || booking.customer_id !== req.session.user.id) {
                req.flash('error_msg', 'Invalid booking');
                return res.redirect('/customer/bookings');
            }
            // Check if booking is confirmed and not reviewed
            const Review = require('../models/Review');
            const hasReview = await Review.hasReviewed(booking_id);
            if (booking.status !== 'confirmed' || hasReview) {
                req.flash('error_msg', 'Chat is only available for confirmed bookings without a review');
                return res.redirect('/customer/bookings');
            }
        }

        await Message.create({
            sender_id: req.session.user.id,
            receiver_id: receiver_id,
            booking_id: booking_id || null,
            subject: subject || null,
            content
        });

        if (booking_id) {
            req.flash('success_msg', 'Message sent successfully');
            res.redirect(`/customer/inbox/booking/${booking_id}`);
        } else {
            req.flash('success_msg', 'Message sent successfully');
            res.redirect(`/customer/inbox/conversation/${receiver_id}`);
        }
    } catch (error) {
        console.error('Send message error:', error);
        req.flash('error_msg', 'Error sending message');
        res.redirect('/customer/inbox');
    }
});

// Booking-based conversation (validates booking before allowing chat)
router.get('/inbox/booking/:bookingId', isAuthenticated, isCustomer, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking || booking.customer_id !== req.session.user.id) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/customer/bookings');
        }

        // Check if booking is confirmed
        if (booking.status !== 'confirmed') {
            req.flash('error_msg', 'Chat is only available for confirmed bookings');
            return res.redirect('/customer/bookings');
        }

        // Check if already reviewed (trip over)
        const Review = require('../models/Review');
        const hasReview = await Review.hasReviewed(booking.id);
        if (hasReview) {
            req.flash('error_msg', 'Chat has ended since you submitted a review');
            return res.redirect('/customer/bookings');
        }

        // Get conversation with host for this booking
        const conversation = await Message.getConversation(req.session.user.id, booking.host_id);
        const db = require('../config/database');
        const [hostUser] = await db.execute('SELECT id, name, avatar, role FROM users WHERE id = ?', [booking.host_id]);

        // Mark messages as read
        for (const msg of conversation) {
            if (msg.receiver_id === req.session.user.id && !msg.is_read) {
                await Message.markAsRead(msg.id);
            }
        }

        res.render('customer/booking-chat', {
            title: 'Chat with Host - EaseTrip',
            layout: 'layouts/main',
            conversation,
            booking,
            otherUser: hostUser[0]
        });
    } catch (error) {
        console.error('Booking chat error:', error);
        req.flash('error_msg', 'Error loading chat');
        res.redirect('/customer/bookings');
    }
});

module.exports = router;
