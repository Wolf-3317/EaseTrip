const db = require('../config/database');

class Listing {
    static async create(data) {
        const {
            host_id, title, description, type = 'accommodation', category,
            price, address, city, state, postal_code, latitude, longitude,
            max_guests = 1, bedrooms = 1, bathrooms = 1
        } = data;

        const [result] = await db.execute(
            `INSERT INTO listings (host_id, title, description, type, category, price, 
             address, city, state, postal_code, latitude, longitude, max_guests, bedrooms, bathrooms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                host_id,
                title,
                description || null,
                type,
                category || null,
                price,
                address || null,
                city,
                state || null,
                postal_code || null,
                latitude || null,
                longitude || null,
                max_guests,
                bedrooms,
                bathrooms
            ]
        );

        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT l.*, u.name as host_name, u.avatar as host_avatar, u.created_at as host_since,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id AND status = 'active') as avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id AND status = 'active') as review_count
            FROM listings l
            JOIN users u ON l.host_id = u.id
            WHERE l.id = ?
        `, [id]);

        if (rows[0]) {
            rows[0].images = await this.getImages(id);
            rows[0].amenities = await this.getAmenities(id);
        }

        return rows[0];
    }

    static async getImages(listingId) {
        const [rows] = await db.execute(
            'SELECT * FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, display_order',
            [listingId]
        );
        return rows;
    }

    static async getAmenities(listingId) {
        const [rows] = await db.execute(`
            SELECT a.* FROM amenities a
            JOIN listing_amenities la ON a.id = la.amenity_id
            WHERE la.listing_id = ?
        `, [listingId]);
        return rows;
    }

    static async addImage(listingId, imageUrl, isPrimary = false) {
        const [result] = await db.execute(
            'INSERT INTO listing_images (listing_id, image_url, is_primary) VALUES (?, ?, ?)',
            [listingId, imageUrl, isPrimary]
        );
        return result.insertId;
    }

    static async addAmenity(listingId, amenityId) {
        await db.execute(
            'INSERT IGNORE INTO listing_amenities (listing_id, amenity_id) VALUES (?, ?)',
            [listingId, amenityId]
        );
    }

    static async update(id, data) {
        const allowedFields = ['title', 'description', 'type', 'category', 'price',
            'address', 'city', 'state', 'postal_code', 'latitude', 'longitude',
            'max_guests', 'bedrooms', 'bathrooms', 'status'];

        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && allowedFields.includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return false;

        values.push(id);
        await db.execute(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`, values);
        return true;
    }

    static async delete(id) {
        await db.execute('DELETE FROM listings WHERE id = ?', [id]);
        return true;
    }

    static async search(filters = {}) {
        let query = `
            SELECT l.*, 
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id AND status = 'active') as avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id AND status = 'active') as review_count,
                   u.name as host_name
            FROM listings l
            JOIN users u ON l.host_id = u.id
            WHERE l.status = 'active'
        `;
        const params = [];

        if (filters.city) {
            query += ' AND l.city LIKE ?';
            params.push(`%${filters.city}%`);
        }
        if (filters.type) {
            query += ' AND l.type = ?';
            params.push(filters.type);
        }
        if (filters.category) {
            query += ' AND l.category = ?';
            params.push(filters.category);
        }
        if (filters.minPrice) {
            query += ' AND l.price >= ?';
            params.push(parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            query += ' AND l.price <= ?';
            params.push(parseFloat(filters.maxPrice));
        }
        if (filters.guests) {
            query += ' AND l.max_guests >= ?';
            params.push(parseInt(filters.guests));
        }
        if (filters.search) {
            query += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.city LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        // Sorting
        const sortOptions = {
            'price_asc': 'l.price ASC',
            'price_desc': 'l.price DESC',
            'rating': 'avg_rating DESC',
            'newest': 'l.created_at DESC'
        };
        query += ` ORDER BY ${sortOptions[filters.sort] || 'l.created_at DESC'}`;

        // Pagination 
        const limit = parseInt(filters.limit) || 12;
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const [rows] = await db.query(query, params);
        return rows;
    }

    static async getFeatured(limit = 8) {
        const limitInt = parseInt(limit) || 8;
        const [rows] = await db.query(`
            SELECT l.*, 
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id AND status = 'active') as avg_rating,
                   (SELECT COUNT(*) FROM reviews WHERE listing_id = l.id AND status = 'active') as review_count
            FROM listings l
            WHERE l.status = 'active' AND l.is_featured = 1
            ORDER BY l.created_at DESC
            LIMIT ${limitInt}
        `);
        return rows;
    }

    static async getPopularCities() {
        const [rows] = await db.execute(`
            SELECT city, COUNT(*) as listing_count,
                   (SELECT image_url FROM listing_images li 
                    JOIN listings l2 ON li.listing_id = l2.id 
                    WHERE l2.city = l.city LIMIT 1) as image
            FROM listings l
            WHERE status = 'active'
            GROUP BY city
            ORDER BY listing_count DESC
            LIMIT 6
        `);
        return rows;
    }

    static async getByHost(hostId, status = null) {
        let query = `
            SELECT l.*, 
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id) as avg_rating,
                   (SELECT COUNT(*) FROM bookings WHERE listing_id = l.id AND status = 'confirmed') as booking_count
            FROM listings l
            WHERE l.host_id = ?
        `;
        const params = [hostId];

        if (status) {
            query += ' AND l.status = ?';
            params.push(status);
        }

        query += ' ORDER BY l.created_at DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async getAll(filters = {}) {
        let query = `
            SELECT l.*, u.name as host_name, u.email as host_email,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image
            FROM listings l
            JOIN users u ON l.host_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            query += ' AND l.status = ?';
            params.push(filters.status);
        }
        if (filters.city) {
            query += ' AND l.city LIKE ?';
            params.push(`%${filters.city}%`);
        }

        query += ' ORDER BY l.created_at DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async incrementViews(id) {
        await db.execute('UPDATE listings SET view_count = view_count + 1 WHERE id = ?', [id]);
    }

    static async getAllAmenities() {
        const [rows] = await db.execute('SELECT * FROM amenities ORDER BY category, name');
        return rows;
    }
}

module.exports = Listing;
