const db = require('../config/database');

class Review {
    static async create(data) {
        const { booking_id, listing_id, customer_id, rating, comment,
            cleanliness_rating, communication_rating, location_rating, value_rating } = data;

        const [result] = await db.execute(
            `INSERT INTO reviews (booking_id, listing_id, customer_id, rating, comment,
             cleanliness_rating, communication_rating, location_rating, value_rating)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [booking_id, listing_id, customer_id, rating, comment,
                cleanliness_rating, communication_rating, location_rating, value_rating]
        );

        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT r.*, u.name as customer_name, u.avatar as customer_avatar,
                   l.title as listing_title
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN listings l ON r.listing_id = l.id
            WHERE r.id = ?
        `, [id]);
        return rows[0];
    }

    static async getByListing(listingId) {
        const [rows] = await db.execute(`
            SELECT r.*, u.name as customer_name, u.avatar as customer_avatar
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            WHERE r.listing_id = ? AND r.status = 'active'
            ORDER BY r.created_at DESC
        `, [listingId]);
        return rows;
    }

    static async getByCustomer(customerId) {
        const [rows] = await db.execute(`
            SELECT r.*, l.title as listing_title,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image
            FROM reviews r
            JOIN listings l ON r.listing_id = l.id
            WHERE r.customer_id = ?
            ORDER BY r.created_at DESC
        `, [customerId]);
        return rows;
    }

    static async getByHost(hostId) {
        const [rows] = await db.execute(`
            SELECT r.*, u.name as customer_name, u.avatar as customer_avatar, l.title as listing_title
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN listings l ON r.listing_id = l.id
            WHERE l.host_id = ?
            ORDER BY r.created_at DESC
        `, [hostId]);
        return rows;
    }

    static async update(id, data) {
        const { rating, comment, cleanliness_rating, communication_rating, location_rating, value_rating } = data;
        await db.execute(
            `UPDATE reviews SET rating = ?, comment = ?, cleanliness_rating = ?, 
             communication_rating = ?, location_rating = ?, value_rating = ?, updated_at = NOW()
             WHERE id = ?`,
            [rating, comment, cleanliness_rating, communication_rating, location_rating, value_rating, id]
        );
        return true;
    }

    static async report(id, reason) {
        await db.execute(
            'UPDATE reviews SET is_reported = TRUE, report_reason = ? WHERE id = ?',
            [reason, id]
        );
        return true;
    }

    static async updateStatus(id, status) {
        await db.execute('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
        return true;
    }

    static async hasReviewed(bookingId) {
        const [rows] = await db.execute(
            'SELECT id FROM reviews WHERE booking_id = ?',
            [bookingId]
        );
        return rows.length > 0;
    }

    static async getReportedReviews() {
        const [rows] = await db.execute(`
            SELECT r.*, u.name as customer_name, l.title as listing_title, h.name as host_name
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN listings l ON r.listing_id = l.id
            JOIN users h ON l.host_id = h.id
            WHERE r.is_reported = TRUE AND r.status = 'active'
            ORDER BY r.created_at DESC
        `);
        return rows;
    }
}

module.exports = Review;
