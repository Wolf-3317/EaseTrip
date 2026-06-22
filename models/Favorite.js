const db = require('../config/database');

class Favorite {
    static async add(userId, listingId) {
        await db.execute(
            'INSERT IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)',
            [userId, listingId]
        );
        return true;
    }

    static async remove(userId, listingId) {
        await db.execute(
            'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
            [userId, listingId]
        );
        return true;
    }

    static async getByUser(userId) {
        const [rows] = await db.execute(`
            SELECT f.*, l.title, l.price, l.city, l.type,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as primary_image,
                   (SELECT AVG(rating) FROM reviews WHERE listing_id = l.id) as avg_rating
            FROM favorites f
            JOIN listings l ON f.listing_id = l.id
            WHERE f.user_id = ? AND l.status = 'active'
            ORDER BY f.created_at DESC
        `, [userId]);
        return rows;
    }

    static async isFavorite(userId, listingId) {
        const [rows] = await db.execute(
            'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?',
            [userId, listingId]
        );
        return rows.length > 0;
    }
}

module.exports = Favorite;
