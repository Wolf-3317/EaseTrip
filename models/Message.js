const db = require('../config/database');

class Message {
    static async create(data) {
        const { sender_id, receiver_id, booking_id, subject, content, is_system_message = false } = data;

        const [result] = await db.execute(
            `INSERT INTO messages (sender_id, receiver_id, booking_id, subject, content, is_system_message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sender_id, receiver_id, booking_id || null, subject || null, content, is_system_message]
        );

        return result.insertId;
    }

    static async getInbox(userId) {
        const [rows] = await db.execute(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.receiver_id = ?
            ORDER BY m.created_at DESC
        `, [userId]);
        return rows;
    }

    static async getSent(userId) {
        const [rows] = await db.execute(`
            SELECT m.*, u.name as receiver_name
            FROM messages m
            JOIN users u ON m.receiver_id = u.id
            WHERE m.sender_id = ?
            ORDER BY m.created_at DESC
        `, [userId]);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute(`
            SELECT m.*, 
                   s.name as sender_name, s.avatar as sender_avatar,
                   r.name as receiver_name
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.receiver_id = r.id
            WHERE m.id = ?
        `, [id]);
        return rows[0];
    }

    static async markAsRead(id) {
        await db.execute('UPDATE messages SET is_read = TRUE WHERE id = ?', [id]);
        return true;
    }

    static async getUnreadCount(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    static async getConversation(userId, otherUserId) {
        const [rows] = await db.execute(`
            SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `, [userId, otherUserId, otherUserId, userId]);
        return rows;
    }
}

module.exports = Message;
