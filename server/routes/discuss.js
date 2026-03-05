const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const jwt = require('jsonwebtoken');

// ── Create discussions table on startup ─────────────────────
(async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS discussions (
        id SERIAL PRIMARY KEY,
        assignment_id VARCHAR(255) NOT NULL DEFAULT 'global',
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        username VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
        title VARCHAR(500) DEFAULT '',
        body TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        liked_by TEXT[] DEFAULT '{}',
        type VARCHAR(20) DEFAULT 'discuss' CHECK (type IN ('discuss', 'solution')),
        language VARCHAR(20) DEFAULT 'sql',
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS discussion_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        username VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_discussions_assignment ON discussions(assignment_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_post ON discussion_comments(post_id)`);
        console.log('✅ Discussions & Comments tables ready (PostgreSQL)');
    } catch (err) {
        console.error('❌ Failed to create discussions table:', err.message);
    }
})();

// ── Auth helper ─────────────────────────────────────────────
function getUser(req) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const d = jwt.verify(token, process.env.JWT_SECRET || 'cipher_secret');
            return { id: String(d.userId || d.id), username: d.username || 'Anonymous' };
        }
    } catch { }
    return { id: 'anonymous', username: 'Anonymous' };
}

// ──────────────────────────────────────────────────────────────
// GET /api/discuss/all — list ALL posts globally (for Discuss page)
// ──────────────────────────────────────────────────────────────
router.get('/all', async (req, res) => {
    try {
        const sort = req.query.sort || 'latest'; // latest | trending | top
        let orderBy = 'created_at DESC';
        if (sort === 'trending') orderBy = 'likes DESC, created_at DESC';
        if (sort === 'top') orderBy = 'likes DESC';

        const { rows } = await pool.query(
            `SELECT id as _id, assignment_id, user_id as "userId", username, title, body, 
              likes, liked_by, type, language, tags, created_at as "createdAt", updated_at as "updatedAt"
       FROM discussions 
       ORDER BY ${orderBy}
       LIMIT 50`
        );
        res.json({ success: true, posts: rows });
    } catch (err) {
        console.error('GET all discussions error:', err.message);
        res.json({ success: true, posts: [] });
    }
});

// GET /api/discuss/global/stats/:assignmentId — engagement stats
router.get('/global/stats/:assignmentId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(likes), 0) as total_likes 
       FROM discussions 
       WHERE assignment_id = $1`,
            [req.params.assignmentId]
        );
        res.json({
            success: true,
            discussions: parseInt(rows[0].count) || 0,
            likes: parseInt(rows[0].total_likes) || 0,
        });
    } catch (err) {
        console.error('GET stats error:', err.message);
        res.json({ success: true, discussions: 0, likes: 0 });
    }
});

// GET /api/discuss/:assignmentId — list all posts for a problem
router.get('/:assignmentId', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id as _id, assignment_id, user_id as "userId", username, title, body, 
              likes, liked_by, type, language, tags, created_at as "createdAt", updated_at as "updatedAt"
       FROM discussions 
       WHERE assignment_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
            [req.params.assignmentId]
        );
        res.json({ success: true, posts: rows });
    } catch (err) {
        console.error('GET discussions error:', err.message);
        res.json({ success: true, posts: [] });
    }
});

// POST /api/discuss/:assignmentId — create post
router.post('/:assignmentId', async (req, res) => {
    try {
        const { id: userId, username } = getUser(req);
        const { body, title = '', type = 'discuss', language = 'sql', tags = [] } = req.body;
        if (!body || !body.trim()) return res.status(400).json({ error: 'Post body is required.' });

        const { rows } = await pool.query(
            `INSERT INTO discussions (assignment_id, user_id, username, title, body, type, language, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id as _id, assignment_id, user_id as "userId", username, title, body, 
                 likes, liked_by, type, language, tags, created_at as "createdAt"`,
            [req.params.assignmentId, userId, username, title, body.trim(), type, language,
            Array.isArray(tags) ? tags : []]
        );
        res.json({ success: true, post: rows[0] });
    } catch (err) {
        console.error('POST discussion error:', err.message);
        res.status(500).json({ error: 'Failed to create post: ' + err.message });
    }
});

// POST /api/discuss/:assignmentId/:postId/like — toggle like
router.post('/:assignmentId/:postId/like', async (req, res) => {
    try {
        const { id: userId } = getUser(req);
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' });

        const { rows: existing } = await pool.query(
            `SELECT likes, liked_by FROM discussions WHERE id = $1`, [postId]
        );
        if (existing.length === 0) return res.status(404).json({ error: 'Post not found.' });

        const likedBy = existing[0].liked_by || [];
        const alreadyLiked = likedBy.includes(userId);

        if (alreadyLiked) {
            await pool.query(
                `UPDATE discussions SET likes = likes - 1, liked_by = array_remove(liked_by, $1), updated_at = NOW() WHERE id = $2`,
                [userId, postId]
            );
            res.json({ success: true, likes: existing[0].likes - 1, liked: false });
        } else {
            await pool.query(
                `UPDATE discussions SET likes = likes + 1, liked_by = array_append(liked_by, $1), updated_at = NOW() WHERE id = $2`,
                [userId, postId]
            );
            res.json({ success: true, likes: existing[0].likes + 1, liked: true });
        }
    } catch (err) {
        console.error('LIKE discussion error:', err.message);
        res.status(500).json({ error: 'Failed to like post.' });
    }
});

// ── COMMENTS ──────────────────────────────────────────────────

// GET /api/discuss/post/:postId/comments — list comments
router.get('/post/:postId/comments', async (req, res) => {
    try {
        const postId = parseInt(req.params.postId, 10);
        const { rows } = await pool.query(
            `SELECT id as _id, post_id, user_id as "userId", username, body, created_at as "createdAt"
       FROM discussion_comments 
       WHERE post_id = $1 
       ORDER BY created_at ASC`,
            [postId]
        );
        res.json({ success: true, comments: rows });
    } catch (err) {
        console.error('GET comments error:', err.message);
        res.json({ success: true, comments: [] });
    }
});

// POST /api/discuss/post/:postId/comments — post comment
router.post('/post/:postId/comments', async (req, res) => {
    try {
        const { id: userId, username } = getUser(req);
        const postId = parseInt(req.params.postId, 10);
        const { body } = req.body;
        if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required.' });

        const { rows } = await pool.query(
            `INSERT INTO discussion_comments (post_id, user_id, username, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id as _id, post_id, user_id as "userId", username, body, created_at as "createdAt"`,
            [postId, userId, username, body.trim()]
        );
        res.json({ success: true, comment: rows[0] });
    } catch (err) {
        console.error('POST comment error:', err.message);
        res.status(500).json({ error: 'Failed to post comment.' });
    }
});

module.exports = router;
