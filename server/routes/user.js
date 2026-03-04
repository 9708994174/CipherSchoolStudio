const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const jwt = require('jsonwebtoken');

// ── Auth middleware (optional — fallback to userId param) ─────
function getUser(req) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cipher_secret');
            return String(decoded.userId || decoded.id || decoded._id);
        }
    } catch { }
    return req.query.userId || req.body.userId || 'anonymous';
}

// GET /api/user/activity — solved days heatmap for calendar
router.get('/activity', async (req, res) => {
    try {
        const userId = getUser(req);
        const { rows } = await pool.query(
            `SELECT DATE(updated_at) as day, COUNT(*) as cnt
             FROM user_progress
             WHERE user_id = $1 AND is_completed = true
             GROUP BY DATE(updated_at)
             ORDER BY day`,
            [userId]
        );

        // Build date → count map
        const map = {};
        rows.forEach(r => {
            const day = new Date(r.day).toISOString().slice(0, 10);
            map[day] = parseInt(r.cnt) || 0;
        });

        res.json({ success: true, activity: map });
    } catch (err) {
        console.error('Activity error:', err.message);
        res.json({ success: true, activity: {} }); // Graceful fallback
    }
});

// GET /api/user/stats — progress summary
router.get('/stats', async (req, res) => {
    try {
        const userId = getUser(req);
        const { rows } = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE up.is_completed = true) as total,
                COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Easy') as easy,
                COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Medium') as medium,
                COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Hard') as hard,
                COUNT(*) as attempted
             FROM user_progress up
             LEFT JOIN assignments a ON CAST(up.assignment_id AS INTEGER) = a.id
             WHERE up.user_id = $1`,
            [userId]
        );

        const r = rows[0] || {};
        res.json({
            success: true, stats: {
                total: parseInt(r.total) || 0,
                easy: parseInt(r.easy) || 0,
                medium: parseInt(r.medium) || 0,
                hard: parseInt(r.hard) || 0,
                attempted: parseInt(r.attempted) || 0,
            }
        });
    } catch (err) {
        console.error('Stats error:', err.message);
        res.json({ success: true, stats: { total: 0, easy: 0, medium: 0, hard: 0, attempted: 0 } });
    }
});

module.exports = router;
