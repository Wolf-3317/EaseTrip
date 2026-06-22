const db = require('../config/database');

class Booking {
    static async create(data) {
        const { listing_id, customer_id, host_id, check_in, check_out, guests, total_price, service_fee = 0, special_requests } = data;

        const [result] = await db.execute(
            `INSERT INTO bookings (listing_id, customer_id, host_id, check_in, check_out, guests, total_price, service_fee, special_requests)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [listing_id, customer_id, host_id, check_in, check_out, guests, total_price, service_fee, special_requests || null]
        );

        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT b.*, l.title as listing_title, l.city as listing_city, l.address as listing_address,
                   l.price as listing_price,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
                   u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                   h.name as host_name, h.email as host_email, h.phone as host_phone
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users u ON b.customer_id = u.id
            JOIN users h ON b.host_id = h.id
            WHERE b.id = ?
        `, [id]);
        return rows[0];
    }

    static async getByCustomer(customerId, status = null) {
        let query = `
            SELECT b.*, l.title as listing_title, l.city as listing_city,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
                   (SELECT COUNT(*) FROM reviews WHERE booking_id = b.id) > 0 as has_review,
                   h.name as host_name
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users h ON b.host_id = h.id
            WHERE b.customer_id = ?
        `;
        const params = [customerId];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        query += ' ORDER BY b.check_in DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async getByHost(hostId, status = null) {
        let query = `
            SELECT b.*, l.title as listing_title, l.city as listing_city,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
                   u.name as customer_name, u.email as customer_email, u.phone as customer_phone
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users u ON b.customer_id = u.id
            WHERE b.host_id = ?
        `;
        const params = [hostId];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        query += ' ORDER BY b.check_in DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async updateStatus(id, status, reason = null) {
        if (status === 'cancelled') {
            await db.execute(
                'UPDATE bookings SET status = ?, cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?',
                [status, reason, id]
            );
        } else {
            await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        }
        return true;
    }

    static async canCancel(bookingId) {
        const [rows] = await db.execute(`
            SELECT check_in, status FROM bookings WHERE id = ?
        `, [bookingId]);

        if (!rows[0]) return false;
        if (rows[0].status !== 'confirmed' && rows[0].status !== 'pending') return false;

        const checkIn = new Date(rows[0].check_in);
        const now = new Date();
        const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);

        return hoursUntilCheckIn >= 48;
    }

    static async getUpcomingTrips(customerId) {
        const [rows] = await db.execute(`
            SELECT b.*, l.title as listing_title, l.city as listing_city, l.address as listing_address,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
                   h.name as host_name, h.phone as host_phone
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            JOIN users h ON b.host_id = h.id
            WHERE b.customer_id = ? AND b.check_in >= CURDATE() AND b.status IN ('confirmed', 'pending')
            ORDER BY b.check_in ASC
        `, [customerId]);
        return rows;
    }

    static async getPastTrips(customerId) {
        const [rows] = await db.execute(`
            SELECT b.*, l.title as listing_title, l.city as listing_city,
                   (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = 1 LIMIT 1) as listing_image,
                   (SELECT id FROM reviews WHERE booking_id = b.id LIMIT 1) as review_id
            FROM bookings b
            JOIN listings l ON b.listing_id = l.id
            WHERE b.customer_id = ? AND (b.check_out < CURDATE() OR b.status = 'completed')
            ORDER BY b.check_out DESC
        `, [customerId]);
        return rows;
    }

    static async checkAvailability(listingId, checkIn, checkOut) {
        const [rows] = await db.execute(`
            SELECT id FROM bookings 
            WHERE listing_id = ? 
            AND status IN ('confirmed', 'pending')
            AND ((check_in <= ? AND check_out > ?) OR (check_in < ? AND check_out >= ?) OR (check_in >= ? AND check_out <= ?))
        `, [listingId, checkIn, checkIn, checkOut, checkOut, checkIn, checkOut]);

        return rows.length === 0;
    }

    static async expirePendingBookings() {
        const [result] = await db.execute(`
            UPDATE bookings
            SET status = 'rejected'
            WHERE status = 'pending'
            AND check_in <= CURDATE()
        `);

        return result.affectedRows;
        }


    static async getHostStats(hostId) {
        const [pending] = await db.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE host_id = ? AND status = "pending"',
            [hostId]
        );
        const [upcoming] = await db.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE host_id = ? AND status = "confirmed" AND check_in >= CURDATE()',
            [hostId]
        );
        const [completed] = await db.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE host_id = ? AND status = "completed"',
            [hostId]
        );

        return {
            pending: pending[0].count,
            upcoming: upcoming[0].count,
            completed: completed[0].count
        };
    }
}

module.exports = Booking;
