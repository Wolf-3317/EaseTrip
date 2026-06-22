const express = require('express');
const router = express.Router();
const Weather = require('../models/Weather');
const Booking = require('../models/Booking');
const { isAuthenticated } = require('../middleware/auth');

// Get weather for a city and date
router.get('/weather', async (req, res) => {
    try {
        const { city, date } = req.query;

        if (!city) {
            return res.status(400).json({ error: 'City is required' });
        }
        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Get today's date in Malaysia time (UTC+8)
        const nowMY = new Date(Date.now() + (8 * 60 * 60 * 1000));
        const todayStr = nowMY.toISOString().split('T')[0];

        const [ty, tm, td] = todayStr.split('-').map(Number);
        const [ry, rm, rd] = date.split('-').map(Number);
        const todayMs = Date.UTC(ty, tm - 1, td);
        const requestedMs = Date.UTC(ry, rm - 1, rd);
        const diffDays = (requestedMs - todayMs) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) {
            return res.json({
                city, date, available: false,
                message: 'Weather data is not available for past dates'
            });
        }

        if (diffDays >= 7) {
            return res.json({
                city, date, available: false,
                message: 'Weather forecast is only available up to 7 days in advance'
            });
        }

        const weather = await Weather.getWeather(city, date);

        if (!weather) {
            return res.json({
                city, date, available: false,
                message: 'Weather data not available for this date'
            });
        }

        res.json({
            available: true,
            city: weather.city,
            date: weather.date,
            condition: weather.condition_main,
            description: weather.condition_description,
            icon: weather.icon,
            temperature: {
                high: weather.temp_high,
                low: weather.temp_low
            },
            morning: weather.morning_forecast,
            afternoon: weather.afternoon_forecast,
            night: weather.night_forecast
        });

    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// Toggle favorite
router.post('/favorites/toggle/:listingId', isAuthenticated, async (req, res) => {
    try {
        const Favorite = require('../models/Favorite');
        const isFav = await Favorite.isFavorite(req.session.user.id, req.params.listingId);

        if (isFav) {
            await Favorite.remove(req.session.user.id, req.params.listingId);
            res.json({ success: true, favorited: false });
        } else {
            await Favorite.add(req.session.user.id, req.params.listingId);
            res.json({ success: true, favorited: true });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// Get Malaysian cities
router.get('/cities', (req, res) => {
    res.json(Weather.getMalaysianCities());
});

module.exports = router;