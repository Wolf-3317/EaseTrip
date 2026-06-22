const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isGuest, isAuthenticated } = require('../middleware/auth');

// Login page
router.get('/login', isGuest, (req, res) => {
    res.render('auth/login', {
        title: 'Login - EaseTrip',
        layout: 'layouts/main'
    });
});

// Login handler
router.post('/login', isGuest, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        const isMatch = await User.verifyPassword(password, user.password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        if (user.status === 'banned' || user.status === 'suspended') {
            req.flash('error_msg', 'Your account has been suspended. Please send an email to legal@easetrip.my for appeal');
            return res.redirect('/login');
        }

        // Create session
        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            avatar: user.avatar
        };

        req.flash('success_msg', `Welcome back, ${user.name}!`);

        // Redirect based on role
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else if (user.role === 'host') {
            return res.redirect('/host/dashboard');
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/login');
    }
});

// Register page
router.get('/register', isGuest, (req, res) => {
    res.render('auth/register', {
        title: 'Register - EaseTrip',
        layout: 'layouts/main'
    });
});

// Register handler
router.post('/register', isGuest, async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone, role = 'customer' } = req.body;
        const errors = [];

        // Validation
        if (!name || !email || !password) {
            errors.push('Please fill in all required fields');
        }
        if (password !== confirmPassword) {
            errors.push('Passwords do not match');
        }
        if (password && password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            errors.push('Email already registered');
        }

        if (errors.length > 0) {
            return res.render('auth/register', {
                title: 'Register - EaseTrip',
                layout: 'layouts/main',
                errors,
                name,
                email,
                phone,
                role
            });
        }

        // Create user
        const userId = await User.create({
            name,
            email,
            password,
            phone,
            role: role === 'host' ? 'host' : 'customer'
        });

        req.flash('success_msg', 'Registration successful! Please log in.');
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/register');
    }
});

// Logout
router.get('/logout', isAuthenticated, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// Profile page
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('auth/profile', {
            title: 'My Profile - EaseTrip',
            layout: 'layouts/main',
            profile: user
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/');
    }
});

// Update profile
router.post('/profile', isAuthenticated, async (req, res) => {
    try {
        let { email, name, phone, bio, address } = req.body;

        email = (email || '').trim().toLowerCase();

        await User.updateProfile(req.session.user.id, { email, name, phone, bio, address });

        // Update session 
        req.session.user.name = name;
        req.session.user.email = email;
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/profile');
    }
});

// Change password
router.post('/profile/password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findByEmail(req.session.user.email);
        const isMatch = await User.verifyPassword(currentPassword, user.password);

        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/profile');
        }

        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/profile');
        }

        if (newPassword.length < 6) {
            req.flash('error_msg', 'Password must be at least 6 characters');
            return res.redirect('/profile');
        }

        await User.updatePassword(req.session.user.id, newPassword);
        req.flash('success_msg', 'Password changed successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Password change error:', error);
        req.flash('error_msg', 'Error changing password');
        res.redirect('/profile');
    }
});

module.exports = router;
