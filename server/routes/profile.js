const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getUser(req) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const d = jwt.verify(token, JWT_SECRET);
            return { id: String(d.userId || d.id), username: d.username || 'User' };
        }
    } catch { }
    return null;
}

// GET /api/profile — current user profile with full stats
router.get('/', async (req, res) => {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // Get user info
        const { rows: userRows } = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = $1', [user.id]
        );
        if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
        const u = userRows[0];

        // Get solving stats
        const { rows: statsRows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE up.is_completed = true) as solved,
        COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Easy') as easy,
        COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Medium') as medium,
        COUNT(*) FILTER (WHERE up.is_completed = true AND a.difficulty = 'Hard') as hard,
        COUNT(*) as attempted,
        COALESCE(SUM(up.attempt_count), 0) as total_submissions
      FROM user_progress up
      LEFT JOIN assignments a ON CAST(up.assignment_id AS INTEGER) = a.id
      WHERE up.user_id = $1
    `, [user.id]);

        // Get total assignments count by difficulty
        const { rows: totalRows } = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE difficulty = 'Easy') as total_easy,
        COUNT(*) FILTER (WHERE difficulty = 'Medium') as total_medium,
        COUNT(*) FILTER (WHERE difficulty = 'Hard') as total_hard
      FROM assignments
    `);

        // Get recent submissions (last 15)
        const { rows: recentRows } = await pool.query(`
      SELECT up.assignment_id, a.title, a.difficulty, up.is_completed,
             up.attempt_count, up.updated_at
      FROM user_progress up
      LEFT JOIN assignments a ON CAST(up.assignment_id AS INTEGER) = a.id
      WHERE up.user_id = $1
      ORDER BY up.updated_at DESC
      LIMIT 15
    `, [user.id]);

        // Get activity heatmap (last 1 year) - only count solved days
        const { rows: activityRows } = await pool.query(`
      SELECT DATE(updated_at) as day, COUNT(*) as cnt
      FROM user_progress
      WHERE user_id = $1 AND updated_at > NOW() - INTERVAL '1 year' AND is_completed = true
      GROUP BY DATE(updated_at)
      ORDER BY day
    `, [user.id]);

        const activity = {};
        activityRows.forEach(r => {
            activity[new Date(r.day).toISOString().slice(0, 10)] = parseInt(r.cnt) || 0;
        });

        // Calculate streak
        let streak = 0;
        const d = new Date();
        const solvedDays = {};
        activityRows.forEach(r => {
            solvedDays[new Date(r.day).toISOString().slice(0, 10)] = true;
        });
        while (true) {
            const k = d.toISOString().slice(0, 10);
            if (!solvedDays[k]) break;
            streak++;
            d.setDate(d.getDate() - 1);
        }

        // Calculate max streak
        const sortedDays = Object.keys(solvedDays).sort();
        let maxStreak = 0, curStreak = 0, prev = null;
        sortedDays.forEach(day => {
            if (prev) {
                const diff = (new Date(day) - new Date(prev)) / 86400000;
                curStreak = diff === 1 ? curStreak + 1 : 1;
            } else { curStreak = 1; }
            maxStreak = Math.max(maxStreak, curStreak);
            prev = day;
        });

        // Get discussion count
        const { rows: discRows } = await pool.query(
            'SELECT COUNT(*) as cnt FROM discussions WHERE user_id = $1', [user.id]
        );

        // Get contest stats
        const { rows: contestStatsRows } = await pool.query(`
          SELECT 
            COALESCE(SUM(score), 0) as total_contest_score,
            COALESCE(SUM(problems_solved), 0) as total_contest_solved,
            COUNT(*) as contests_joined
          FROM contest_participants
          WHERE user_id = $1
        `, [user.id]);
        const cs = contestStatsRows[0] || {};

        // Calculate global rank (based on total contest score)
        const { rows: rankRows } = await pool.query(`
          SELECT rank FROM (
            SELECT user_id, RANK() OVER (ORDER BY COALESCE(SUM(score), 0) DESC, COALESCE(SUM(problems_solved), 0) DESC) as rank
            FROM contest_participants
            GROUP BY user_id
          ) r WHERE user_id = $1
        `, [user.id]);
        const globalRank = rankRows[0]?.rank || '--';

        const s = statsRows[0] || {};
        const t = totalRows[0] || {};

        res.json({
            success: true,
            profile: {
                id: u.id,
                username: u.username,
                email: u.email,
                joinedAt: u.created_at,
                stats: {
                    solved: parseInt(s.solved) || 0,
                    easy: parseInt(s.easy) || 0,
                    medium: parseInt(s.medium) || 0,
                    hard: parseInt(s.hard) || 0,
                    attempted: parseInt(s.attempted) || 0,
                    totalSubmissions: parseInt(s.total_submissions) || 0,
                    totalProblems: parseInt(t.total) || 0,
                    totalEasy: parseInt(t.total_easy) || 0,
                    totalMedium: parseInt(t.total_medium) || 0,
                    totalHard: parseInt(t.total_hard) || 0,
                },
                streak: { current: streak, max: maxStreak },
                activeDays: Object.keys(solvedDays).length,
                activity,
                contestStats: {
                    totalScore: parseInt(cs.total_contest_score) || 0,
                    solved: parseInt(cs.total_contest_solved) || 0,
                    joined: parseInt(cs.contests_joined) || 0,
                    globalRank: globalRank
                },
                recentSubmissions: recentRows.map(r => ({
                    assignmentId: r.assignment_id,
                    title: r.title || `Problem #${r.assignment_id}`,
                    difficulty: r.difficulty || 'Easy',
                    isCompleted: r.is_completed,
                    attempts: r.attempt_count,
                    time: r.updated_at,
                })),
                discussions: parseInt(discRows[0]?.cnt) || 0,
            }
        });
    } catch (err) {
        console.error('Profile error:', err.message);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

module.exports = router;
