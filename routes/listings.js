const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Weather = require('../models/Weather');

// Search/Browse listings
router.get('/', async (req, res) => {
    try {
        const filters = {
            city: req.query.city,
            type: req.query.type,
            category: req.query.category,
            minPrice: req.query.minPrice,
            maxPrice: req.query.maxPrice,
            guests: req.query.guests,
            search: req.query.search,
            sort: req.query.sort,
            limit: req.query.limit || 12,
            offset: req.query.offset || 0
        };

        const listings = await Listing.search(filters);
        const amenities = await Listing.getAllAmenities();
        const cities = Weather.getMalaysianCities();

        res.render('listings/index', {
            title: 'Browse Listings - EaseTrip',
            layout: 'layouts/main',
            listings,
            filters: req.query,
            amenities,
            cities
        });
    } catch (error) {
        console.error('Search error:', error);
        req.flash('error_msg', 'Error loading listings');
        res.redirect('/');
    }
});



// Listing detail page
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    const user = req.session.user;
    const isHostOwner = user && user.id === listing?.host_id;
    const isAdmin = user && user.role === 'admin';

    const canView =
      listing &&
      (listing.status === 'active' || isHostOwner || isAdmin);

    if (!canView) {
      req.flash('error_msg', 'Listing not found');
      return res.redirect('/listings');
    }

    await Listing.incrementViews(req.params.id);

    const reviews = await Review.getByListing(req.params.id);

    let isFavorite = false;
    if (user) {
      isFavorite = await Favorite.isFavorite(user.id, listing.id);
    }

    res.render('listings/detail', {
      title: `${listing.title} - EaseTrip`,
      layout: 'layouts/main',
      listing,
      reviews,
      isFavorite
    });
  } catch (error) {
    console.error('Listing detail error:', error);
    req.flash('error_msg', 'Error loading listing');
    res.redirect('/listings');
  }
});


module.exports = router;
