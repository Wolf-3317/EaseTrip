const db = require('../config/database');

class Report {
    static async create(data) {
        const { reporter_id, reported_user_id, reported_listing_id, reported_review_id, type, reason, description } = data;

        const [result] = await db.execute(
            `INSERT INTO reports (reporter_id, reported_user_id, reported_listing_id, reported_review_id, type, reason, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                reporter_id,
                reported_user_id || null,
                reported_listing_id || null,
                reported_review_id || null,
                type,
                reason || null,
                description || null
            ]
        );

        return result.insertId;
    }

    static async getAll(status = null) {
        let query = `
            SELECT r.*, 
                   rep.name as reporter_name,
                   ru.name as reported_user_name,
                   l.title as listing_title,
                   rev.comment as review_comment,
                   rev.listing_id as review_listing_id
            FROM reports r
            JOIN users rep ON r.reporter_id = rep.id
            LEFT JOIN users ru ON r.reported_user_id = ru.id
            LEFT JOIN listings l ON r.reported_listing_id = l.id
            LEFT JOIN reviews rev ON r.reported_review_id = rev.id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND r.status = ?';
            params.push(status);
        }

        query += ' ORDER BY r.created_at DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT r.*, 
                   rep.name as reporter_name, rep.email as reporter_email,
                   ru.name as reported_user_name, ru.email as reported_user_email,
                   l.title as listing_title,
                   rev.comment as review_comment,
                   rev.listing_id as review_listing_id
            FROM reports r
            JOIN users rep ON r.reporter_id = rep.id
            LEFT JOIN users ru ON r.reported_user_id = ru.id
            LEFT JOIN listings l ON r.reported_listing_id = l.id
            LEFT JOIN reviews rev ON r.reported_review_id = rev.id
            WHERE r.id = ?
        `, [id]);
        return rows[0];
    }

    static async updateStatus(id, status, adminId, notes = null) {
        await db.execute(
            `UPDATE reports SET status = ?, resolved_by = ?, admin_notes = ?, resolved_at = NOW() WHERE id = ?`,
            [status, adminId, notes, id]
        );
        return true;
    }

    static async getPendingCount() {
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
        return rows[0].count;
    }
}

module.exports = Report;
