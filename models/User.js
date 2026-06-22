const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { email, password, name, phone, role = 'customer' } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)`,
            [email, hashedPassword, name, phone, role]
        );

        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, email, name, phone, avatar, role, status, bio, address, identity_verified, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateProfile(id, data) {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && ['email', 'name', 'phone', 'bio', 'address', 'avatar'].includes(key)) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return false;

        values.push(id);
        await db.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return true;
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return true;
    }

    static async updateStatus(id, status) {
        await db.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, id]
        );
        return true;
    }

    static async getAll(filters = {}) {
        let query = 'SELECT id, email, name, phone, role, status, identity_verified, created_at FROM users WHERE 1=1';
        const params = [];

        if (filters.role) {
            query += ' AND role = ?';
            params.push(filters.role);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
            const limitInt = parseInt(filters.limit);
            query += ` LIMIT ${limitInt}`;
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    static async getHostStats(hostId) {
        const [listingCount] = await db.execute(
            'SELECT COUNT(*) as count FROM listings WHERE host_id = ?',
            [hostId]
        );
        const [bookingCount] = await db.execute(
            'SELECT COUNT(*) as count FROM bookings WHERE host_id = ? AND status = "confirmed"',
            [hostId]
        );

        return {
            listings: listingCount[0].count,
            bookings: bookingCount[0].count,
            earnings: 0
        };
    }
}

module.exports = User;
