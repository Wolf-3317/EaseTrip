// Authentication 

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

const isGuest = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return next();
    }
    res.redirect('/');
};

const isCustomer = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'customer' || req.session.user.role === 'admin') {
            return next();
        }
    }
    req.flash('error_msg', 'Access denied. Customer privileges required.');
    res.redirect('/');
};

const isHost = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'host' || req.session.user.role === 'admin') {
            return next();
        }
    }
    req.flash('error_msg', 'Access denied. Host privileges required.');
    res.redirect('/');
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Access denied. Administrator privileges required.');
    res.redirect('/');
};

const isActiveUser = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.status === 'active') {
            return next();
        }
        req.flash('error_msg', 'Your account is suspended. Please contact support.');
        req.session.destroy();
        return res.redirect('/login');
    }
    res.redirect('/login');
};

module.exports = {
    isAuthenticated,
    isGuest,
    isCustomer,
    isHost,
    isAdmin,
    isActiveUser
};
