import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QueryProvider, useQuery } from './contexts/QueryContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AssignmentList from './components/AssignmentList';
import AssignmentAttempt from './components/AssignmentAttempt';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { getAssignments, getContests, getContestById, joinContest, submitContestAnswer, getContestLeaderboard, getContestHistory, getAllDiscussions, createPost as apiCreatePost, likePost as apiLikePost, getComments, postComment } from './services/api';
import './App.scss';

// =============================================================================
//  STREAK BADGE  (header component)
// =============================================================================
function StreakBadge() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [dailyId, setDailyId] = useState(null);
  const navigate = useNavigate();

  const loadStreak = useCallback(() => {
    try {
      const userId = localStorage.getItem('authUserId') || '';
      const solved = JSON.parse(localStorage.getItem(userId ? `solvedDays_${userId}` : 'solvedDays') || '{}');
      const today = new Date().toISOString().slice(0, 10);
      setChecked(!!solved[today]);

      let s = 0;
      const d = new Date();
      while (true) {
        const k = d.toISOString().slice(0, 10);
        if (!solved[k]) break;
        s++;
        d.setDate(d.getDate() - 1);
      }
      setStreak(s);

      const days = Object.keys(solved).filter(k => solved[k] > 0).sort();
      let best = 0, cur = 0, prev = null;
      days.forEach(day => {
        if (prev) {
          const diff = (new Date(day) - new Date(prev)) / 86400000;
          cur = diff === 1 ? cur + 1 : 1;
        } else { cur = 1; }
        best = Math.max(best, cur);
        prev = day;
      });
      setLongest(best);
    } catch { }
  }, []);

  useEffect(() => {
    loadStreak();
    const handler = () => setTimeout(loadStreak, 200);
    window.addEventListener('problem-solved', handler);
    return () => window.removeEventListener('problem-solved', handler);
  }, [loadStreak]);

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (!e.target.closest('.streak-badge')) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('assignments') || '[]');
      if (cached.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const seed = today.replace(/-/g, '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
        setDailyId(cached[seed % cached.length]?._id || cached[0]._id);
      }
    } catch { }
  }, []);

  const handleStartChallenge = () => {
    setOpen(false);
    navigate(dailyId ? `/assignment/${dailyId}` : '/');
  };

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const authId = localStorage.getItem('authUserId') || '';
    const solved = JSON.parse(localStorage.getItem(authId ? `solvedDays_${authId}` : 'solvedDays') || '{}');
    last7.push({ key: k, day: d.toLocaleDateString('en', { weekday: 'short' }), filled: !!solved[k] });
  }

  return (
    <div className="streak-badge">
      <button
        className={`streak-badge__btn ${streak > 0 ? 'streak-badge__btn--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        title={`${streak} day streak`}
      >
        <span className="streak-badge__fire">🔥</span>
        <span className="streak-badge__count">{streak}</span>
      </button>

      {open && (
        <div className="streak-popup">
          <div className="streak-popup__top">
            <div className="streak-popup__flame">🔥</div>
            <div>
              <div className="streak-popup__number">{streak}</div>
              <div className="streak-popup__label">Day Streak</div>
            </div>
          </div>

          <div className="streak-popup__week">
            {last7.map(({ key, day, filled }) => (
              <div key={key} className="streak-popup__day">
                <div className={`streak-popup__dot ${filled ? 'streak-popup__dot--filled' : ''}`}>
                  {filled && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="streak-popup__day-label">{day}</span>
              </div>
            ))}
          </div>

          <div className="streak-popup__stats">
            <div className="streak-popup__stat">
              <span className="streak-popup__stat-val">{streak}</span>
              <span className="streak-popup__stat-label">Current</span>
            </div>
            <div className="streak-popup__stat-divider" />
            <div className="streak-popup__stat">
              <span className="streak-popup__stat-val">{longest}</span>
              <span className="streak-popup__stat-label">Longest</span>
            </div>
          </div>

          <div className="streak-popup__footer">
            {checked ? (
              <div className="streak-popup__checked">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#2cbb5d" />
                  <path d="M5 8l2.5 2.5L11 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Solved today! Streak maintained 🎉
              </div>
            ) : (
              <button className="streak-popup__checkin-btn" onClick={handleStartChallenge}>
                Solve today's challenge
              </button>
            )}
            <p className="streak-popup__note">Streak increases when you submit a correct answer</p>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Assignment Route Wrapper
// -----------------------------------------------------------------------------
function AssignmentRouteWrapper() {
  const { id: assignmentId } = useParams();
  return (
    <>
      <TopNavBar />
      <main className="app__main">
        <ProtectedRoute>
          <AssignmentAttempt key={assignmentId} />
        </ProtectedRoute>
      </main>
    </>
  );
}

// -----------------------------------------------------------------------------
//  Discuss Page
// -----------------------------------------------------------------------------
function DiscussPage() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('latest');
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const [posting, setPosting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllDiscussions(sort);
      if (res.data?.success) setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Fetch discuss error:', err);
    } finally { setLoading(false); }
  }, [sort]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newBody.trim()) return;
    try {
      setPosting(true);
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await apiCreatePost('global', { title: newTitle, body: newBody, tags });
      setNewTitle(''); setNewBody(''); setNewTags(''); setShowModal(false);
      fetchPosts();
    } catch (err) {
      console.error('Create post error:', err);
    } finally { setPosting(false); }
  };

  const handleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiLikePost('global', postId);
      if (res.data?.success) {
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
        if (selectedPost && selectedPost._id === postId) {
          setSelectedPost(prev => ({ ...prev, likes: res.data.likes }));
        }
      }
    } catch (err) { console.error('Like err:', err); }
  };

  const fetchComments = useCallback(async (postId) => {
    try {
      setCommentLoading(true);
      const res = await getComments(postId);
      if (res.data?.success) setComments(res.data.comments || []);
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally { setCommentLoading(false); }
  }, []);

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      setCommenting(true);
      const res = await postComment(selectedPost._id, newComment);
      if (res.data?.success) {
        setNewComment('');
        fetchComments(selectedPost._id);
      }
    } catch (err) {
      console.error('Post comment error:', err);
    } finally { setCommenting(false); }
  };

  useEffect(() => {
    if (selectedPost) fetchComments(selectedPost._id);
  }, [selectedPost, fetchComments]);

  const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (selectedPost) {
    return (
      <div className="discuss-page discuss-page--detail">
        <div className="discuss-page__back" onClick={() => setSelectedPost(null)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Discussions
        </div>
        <div className="discuss-post discuss-post--full">
          <div className="discuss-post__votes" onClick={(e) => handleLike(selectedPost._id, e)}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 6H3l5-6z" fill="currentColor" /></svg>
            <span>{selectedPost.likes || 0}</span>
          </div>
          <div className="discuss-post__body">
            <h2 className="discuss-post__title-full">{selectedPost.title || 'Untitled'}</h2>
            <div className="discuss-post__meta">
              <span className="discuss-post__author">{selectedPost.username}</span>
              <span className="discuss-post__dot">·</span>
              <span className="discuss-post__time">{timeAgo(selectedPost.createdAt)}</span>
              {(selectedPost.tags || []).map(t => <span key={t} className="discuss-post__tag">{t}</span>)}
            </div>
            <div className="discuss-post__content-full">
              {selectedPost.body && selectedPost.body.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="discuss-comments">
          <h3 className="discuss-comments__title">Comments ({comments.length})</h3>

          {isAuthenticated ? (
            <div className="discuss-comments__input-wrap">
              <textarea
                className="discuss-comments__input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
              />
              <button
                className={`discuss-comments__post-btn ${commenting ? 'discuss-comments__post-btn--loading' : ''}`}
                onClick={handlePostComment}
                disabled={commenting || !newComment.trim()}
              >
                {commenting ? 'Post...' : 'Post'}
              </button>
            </div>
          ) : (
            <div className="discuss-comments__login-prompt">
              Please <a href="/login">login</a> to join the conversation.
            </div>
          )}

          <div className="discuss-comments__list">
            {commentLoading ? (
              <div className="discuss-comments__loading">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="discuss-comments__empty">
                No comments yet. Start the conversation!
              </div>
            ) : (
              comments.map(c => (
                <div key={c._id} className="discuss-comment">
                  <div className="discuss-comment__avatar">{(c.username || 'U').slice(0, 1).toUpperCase()}</div>
                  <div className="discuss-comment__body">
                    <div className="discuss-comment__header">
                      <span className="discuss-comment__author">{c.username}</span>
                      <span className="discuss-comment__time">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="discuss-comment__text">{c.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discuss-page">
      <div className="discuss-page__header">
        <h1 className="discuss-page__title">Discuss</h1>
        <p className="discuss-page__subtitle">Share solutions, ask questions, and learn from the community</p>
      </div>
      <div className="discuss-page__toolbar">
        <div className="discuss-page__tabs">
          {['latest', 'trending', 'top'].map(s => (
            <button key={s} className={`discuss-page__tab ${sort === s ? 'discuss-page__tab--active' : ''}`}
              onClick={() => setSort(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
        {isAuthenticated && <button className="discuss-page__new-btn" onClick={() => setShowModal(true)}>+ New Post</button>}
      </div>
      {showModal && (
        <>
          <div className="discuss-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="discuss-modal">
            <h3>Create New Post</h3>
            <input className="discuss-modal__input" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea className="discuss-modal__textarea" placeholder="Write your post..." rows={5} value={newBody} onChange={e => setNewBody(e.target.value)} />
            <input className="discuss-modal__input" placeholder="Tags (comma separated)" value={newTags} onChange={e => setNewTags(e.target.value)} />
            <div className="discuss-modal__actions">
              <button className="discuss-modal__cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="discuss-modal__submit" onClick={handleCreatePost} disabled={posting || !newBody.trim()}>{posting ? 'Posting...' : 'Post'}</button>
            </div>
          </div>
        </>
      )}
      <div className="discuss-page__list">
        {loading ? <div className="discuss-page__loading"><div className="discuss-page__spinner" />Loading...</div>
          : posts.length === 0 ? (
            <div className="discuss-page__empty-state">
              <div className="discuss-page__empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
              <h3 className="discuss-page__empty-heading">No discussions yet</h3>
              <p className="discuss-page__empty-desc">Be the first to start a conversation! Ask a question, share your approach, or discuss SQL concepts.</p>
              {isAuthenticated ? (
                <button className="discuss-page__start-btn" onClick={() => setShowModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  Start a Discussion
                </button>
              ) : (
                <p className="discuss-page__login-hint">Please <a href="/login">login</a> to start a discussion.</p>
              )}
            </div>
          )
            : posts.map(p => (
              <div key={p._id} className="discuss-post" onClick={() => setSelectedPost(p)} style={{ cursor: 'pointer' }}>
                <div className="discuss-post__votes" onClick={(e) => handleLike(p._id, e)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 6H3l5-6z" fill="currentColor" /></svg>
                  <span>{p.likes || 0}</span>
                </div>
                <div className="discuss-post__body">
                  <div className="discuss-post__title-row">
                    {(p.likes || 0) >= 3 && <span className="discuss-post__hot">🔥</span>}
                    <span className="discuss-post__title">{p.title || 'Untitled'}</span>
                  </div>
                  <div className="discuss-post__meta">
                    <span className="discuss-post__author">{p.username}</span>
                    <span className="discuss-post__dot">·</span>
                    <span className="discuss-post__time">{timeAgo(p.createdAt)}</span>
                    {(p.tags || []).map(t => <span key={t} className="discuss-post__tag">{t}</span>)}
                  </div>
                  <p className="discuss-post__preview">{(p.body || '').slice(0, 150)}{(p.body || '').length > 150 ? '...' : ''}</p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Interview Page
// -----------------------------------------------------------------------------
function InterviewPage() {
  const navigate = useNavigate();
  const companies = [
    { name: 'Google', icon: 'google', count: 15, topics: ['Window Functions', 'Aggregation', 'Joins'] },
    { name: 'Amazon', icon: 'amazon', count: 12, topics: ['Subqueries', 'CTEs', 'Window Functions'] },
    { name: 'Meta', icon: 'meta', count: 10, topics: ['String Functions', 'Aggregation', 'Joins'] },
    { name: 'Microsoft', icon: 'microsoft', count: 8, topics: ['Stored Procedures', 'Performance', 'Joins'] },
    { name: 'Uber', icon: 'uber', count: 7, topics: ['Geospatial Queries', 'Window Functions'] },
    { name: 'Airbnb', icon: 'airbnb', count: 6, topics: ['Date Functions', 'Aggregation'] },
    { name: 'Netflix', icon: 'netflix', count: 5, topics: ['Ranking', 'Window Functions'] },
    { name: 'Apple', icon: 'apple', count: 5, topics: ['CTEs', 'Complex Joins'] },
  ];
  const studyPlans = [
    { icon: '1', title: 'SQL Fundamentals', desc: 'Master SELECT, WHERE, JOIN, GROUP BY, HAVING', level: 'Beginner', problems: 12 },
    { icon: '2', title: 'Query Optimization', desc: 'Indexing strategies, execution plans, and query tuning', level: 'Advanced', problems: 8 },
    { icon: '3', title: 'Problem Patterns', desc: 'Running totals, gaps & islands, pivoting, recursive queries', level: 'Intermediate', problems: 15 },
    { icon: '4', title: 'Mock Interviews', desc: 'Timed SQL challenges simulating real interview conditions', level: 'All Levels', problems: 10 },
    { icon: '5', title: 'Database Design', desc: 'Normalization, schema design, ER diagrams', level: 'Intermediate', problems: 6 },
    { icon: '6', title: 'Security & Best Practices', desc: 'SQL injection prevention and parameterized queries', level: 'Advanced', problems: 4 },
  ];
  const tips = [
    { title: 'Always clarify requirements', desc: 'Ask about edge cases, NULL handling, and expected output format.' },
    { title: 'Start with a simple approach', desc: 'Write a basic query first, then optimize. Show clear thinking.' },
    { title: 'Explain your thought process', desc: 'Walk through your approach verbally as you write.' },
    { title: 'Master window functions', desc: 'ROW_NUMBER, RANK, LAG, LEAD appear in 70%+ of SQL interviews.' },
    { title: 'Know your JOINs deeply', desc: 'INNER, LEFT, RIGHT, FULL, CROSS, SELF — with edge case awareness.' },
  ];

  return (
    <div className="interview-page">
      <div className="interview-page__header">
        <h1 className="interview-page__title">Interview Prep</h1>
        <p className="interview-page__subtitle">Practice SQL questions from top tech companies and ace your next interview</p>
      </div>
      <div className="interview-page__content">
        <div className="interview-page__companies">
          <h2 className="interview-page__section-title">Top Companies</h2>
          <div className="interview-page__company-grid">
            {companies.map(c => (
              <div key={c.name} className="interview-company-card" onClick={() => navigate('/')}>
                <span className="interview-company-card__icon"><img src={`https://logo.clearbit.com/${c.icon}.com`} alt={c.name} width="28" height="28" style={{borderRadius: "6px"}} onError={(e) => { e.target.style.display="none"; e.target.parentNode.textContent = c.name.charAt(0); }} /></span>
                <div className="interview-company-card__info">
                  <span className="interview-company-card__name">{c.name}</span>
                  <span className="interview-company-card__topics">{c.topics.join(' · ')}</span>
                </div>
                <span className="interview-company-card__count">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="interview-page__tips">
          <h2 className="interview-page__section-title">Study Plans</h2>
          <div className="interview-page__tips-grid">
            {studyPlans.map(t => (
              <div key={t.title} className="interview-tip-card" onClick={() => navigate('/')}>
                <span className="interview-tip-card__icon">{t.icon}</span>
                <div className="interview-tip-card__body">
                  <span className="interview-tip-card__title">{t.title}</span>
                  <span className="interview-tip-card__desc">{t.desc}</span>
                </div>
                <div className="interview-tip-card__right">
                  <span className="interview-tip-card__problems">{t.problems} problems</span>
                  <span className="interview-tip-card__level">{t.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="interview-page__quick-tips">
          <h2 className="interview-page__section-title">Quick Tips</h2>
          <div className="interview-page__tips-list">
            {tips.map((tip, i) => (
              <div key={i} className="interview-quick-tip">
                <span className="interview-quick-tip__num">{i + 1}</span>
                <div>
                  <span className="interview-quick-tip__title">{tip.title}</span>
                  <span className="interview-quick-tip__desc">{tip.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
//  Top Nav Bar
// -----------------------------------------------------------------------------
function TopNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [timer, setTimer] = useState(0);
  const [qPaletteOpen, setQPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAssignmentPage = location.pathname.includes('/assignment/');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isHomePage = location.pathname === '/';
  const isDiscussPage = location.pathname === '/discuss';
  const isInterviewPage = location.pathname === '/interview';

  const { execute, submit } = useQuery();
  const { assignments, currentIndex, setCurrentAssignmentIndex,
    getNextAssignmentId, getPreviousAssignmentId, hasNext, hasPrevious, setAssignmentsList } = useNavigation();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAssignmentPage) { setTimer(0); return; }
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isAssignmentPage, location.pathname]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    const handler = e => {
      if (qPaletteOpen && !e.target.closest('.app__question-palette')) setQPaletteOpen(false);
      if (userMenuOpen && !e.target.closest('.app__user-menu')) setUserMenuOpen(false);
    };
    if (qPaletteOpen || userMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [qPaletteOpen, userMenuOpen]);

  useEffect(() => {
    if (!isAssignmentPage || assignments.length > 0) return;
    try {
      const cached = JSON.parse(localStorage.getItem('assignments') || '[]');
      if (cached.length > 0) {
        setAssignmentsList(cached);
        const curId = location.pathname.split('/assignment/')[1];
        const idx = cached.findIndex(a => String(a._id) === String(curId));
        if (idx !== -1) setCurrentAssignmentIndex(idx);
        return;
      }
    } catch { }
    getAssignments().then(res => {
      const list = res.data || [];
      if (list.length > 0) {
        setAssignmentsList(list);
        try { localStorage.setItem('assignments', JSON.stringify(list.map(a => ({ _id: a._id, title: a.title, difficulty: a.difficulty })))); } catch { }
        const curId = location.pathname.split('/assignment/')[1];
        const idx = list.findIndex(a => String(a._id) === String(curId));
        if (idx !== -1) setCurrentAssignmentIndex(idx);
      }
    }).catch(() => { });
  }, [isAssignmentPage, assignments.length, location.pathname, setAssignmentsList, setCurrentAssignmentIndex]);

  return (
    <header className={`app__header ${isAssignmentPage ? 'app__header--problem' : ''}`}>
      <div className="app__header-left">
        <div className="app__brand" onClick={() => navigate('/')}>
          CipherSQL<span>Studio</span>
        </div>

        {!isAssignmentPage && !isAuthPage && (
          <nav className="app__nav">
            <button
              className={`app__nav-link ${isHomePage ? 'app__nav-link--active' : ''}`}
              onClick={() => navigate('/')}
            >
              Problems
            </button>
            <button
              className={`app__nav-link ${isDiscussPage ? 'app__nav-link--active' : ''}`}
              onClick={() => navigate('/discuss')}
            >
              Discuss
            </button>
            <button
              className={`app__nav-link ${isInterviewPage ? 'app__nav-link--active' : ''}`}
              onClick={() => navigate('/interview')}
            >
              Interview
            </button>
          </nav>
        )}

        {isAssignmentPage && (
          <>
            <div className="app__sep" />
            <div className="app__question-palette">
              <button
                className="app__question-palette-btn"
                onClick={() => setQPaletteOpen(v => !v)}
                title="Problem List"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                <span>Problem List</span>
              </button>
            </div>

            {qPaletteOpen && (
              <>
                <div className="app__question-palette-overlay" onClick={() => setQPaletteOpen(false)} />
                <div className="app__question-palette-sidebar app__question-palette-sidebar--open">
                  <div className="app__question-palette-header">
                    <h3>Problem List</h3>
                    <button className="app__question-palette-close" onClick={() => setQPaletteOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="app__question-palette-list">
                    {assignments.length === 0 ? (
                      <div className="app__question-palette-empty">Loading problems...</div>
                    ) : assignments.map((a, idx) => {
                      const curId = location.pathname.split('/assignment/')[1];
                      const active = String(a._id) === String(curId);
                      const diff = (a.difficulty || 'Easy').toLowerCase();

                      const userSolvedKey = isAuthenticated && user?.id ? `solvedProblems_${user.id}` : null;
                      const solvedProblems = userSolvedKey ? JSON.parse(localStorage.getItem(userSolvedKey) || '{}') : {};
                      const isSolved = isAuthenticated && solvedProblems[a._id];

                      return (
                        <button
                          key={a._id}
                          className={`app__question-palette-item${active ? ' app__question-palette-item--active' : ''}`}
                          onClick={(e) => {
                            console.log('Palette: clicking assignment', a._id, 'index', idx);
                            e.preventDefault();
                            e.stopPropagation();
                            setQPaletteOpen(false);
                            try {
                              console.log('Palette: navigating to /assignment/' + a._id);
                              setCurrentAssignmentIndex(idx);
                              navigate(`/assignment/${a._id}`);
                              console.log('Palette: navigation called.');
                            } catch (err) {
                              console.error('Palette: navigation error:', err);
                            }
                          }}
                        >
                          <div className="app__question-palette-status-col">
                            {isSolved ? (
                              <svg className="app__question-palette-solved-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" fill="#2cbb5d" />
                                <path d="M5 8l2.5 2.5L11 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <span className="app__question-palette-number">{idx + 1}</span>
                            )}
                          </div>
                          <div className="app__question-palette-content">
                            <span className="app__question-palette-title">{a.title}</span>
                            <span className={`app__question-palette-difficulty app__question-palette-difficulty--${diff}`}>
                              {a.difficulty || 'Easy'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="app__nav-arrows">
              <button
                className="app__nav-btn" title="Previous Problem"
                onClick={() => {
                  const id = getPreviousAssignmentId();
                  if (id) navigate(`/assignment/${id}`);
                }}
                disabled={!hasPrevious()}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {currentIndex >= 0 && (
                <span className="app__nav-label">{currentIndex + 1} / {assignments.length}</span>
              )}
              <button
                className="app__nav-btn" title="Next Problem"
                onClick={() => {
                  const id = getNextAssignmentId();
                  if (id) navigate(`/assignment/${id}`);
                }}
                disabled={!hasNext()}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {isAssignmentPage && (
        <div className="app__header-center">
          <button
            className="app__action-btn app__action-btn--run"
            onClick={() => execute && execute()}
            title="Run Code (Ctrl+Enter)"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2.5v11L13 8 3 2.5z" />
            </svg>
            Run
          </button>
          <button
            className="app__action-btn app__action-btn--submit"
            onClick={() => submit && submit()}
            title="Submit Solution"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l2.5 5.5L16 7.5l-4.5 4L13 16l-5-2.5L3 16l1.5-4.5L0 7.5l5.5-1L8 1z" />
            </svg>
            Submit
          </button>
        </div>
      )}

      <div className="app__header-right">
        {isAssignmentPage && (
          <div className="app__timer">
            <svg viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="9" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 6v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M6 2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {fmt(timer)}
          </div>
        )}

        {!isAuthPage && (
          isAuthenticated ? (
            <div className="app__header-right-inner">
              <StreakBadge />

              <div className="app__user-menu">
                <button className="app__user-btn" onClick={() => setUserMenuOpen(v => !v)}>
                  <div className="app__user-avatar">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="app__user-name">{user?.username || 'User'}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.5 }}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="app__user-dropdown">
                    <div className="app__user-info">
                      <div className="app__user-fullname">{user?.username}</div>
                      <div className="app__user-email">{user?.email}</div>
                    </div>
                    <div className="app__user-menu-divider" />
                    <button
                      className="app__user-menu-item"
                      onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="7" r="4" />
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      </svg>
                      My Profile
                    </button>
                    <button
                      className="app__user-menu-item"
                      onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="app__auth-buttons">
              <button className="app__auth-btn app__auth-btn--ghost" onClick={() => navigate('/login')}>Sign In</button>
              <button className="app__auth-btn app__auth-btn--primary" onClick={() => navigate('/signup')}>Sign Up</button>
            </div>
          )
        )}
      </div>
    </header>
  );
}


// -----------------------------------------------------------------------------
//  Contest Page (Real API)
// -----------------------------------------------------------------------------
function ContestPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('past');
  const [selectedContest, setSelectedContest] = useState(null);
  const [contestDetail, setContestDetail] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [joining, setJoining] = useState(false);

  const fetchContests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getContests();
      if (res.data?.success) setContests(res.data.contests || []);
    } catch (err) {
      console.error('Fetch contests error:', err);
    } finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getContestHistory();
      if (res.data?.success) setMyHistory(res.data.history || []);
    } catch (err) { console.error('History error:', err); }
  }, [isAuthenticated]);

  useEffect(() => { fetchContests(); fetchHistory(); }, [fetchContests, fetchHistory]);

  const loadContestDetail = async (id) => {
    try {
      const [detailRes, lbRes] = await Promise.all([
        getContestById(id),
        getContestLeaderboard(id)
      ]);
      if (detailRes.data?.success) setContestDetail(detailRes.data.contest);
      if (lbRes.data?.success) setLeaderboard(lbRes.data.leaderboard || []);
      setSelectedContest(id);
    } catch (err) { console.error('Contest detail error:', err); }
  };

  const handleJoin = async (id) => {
    if (!isAuthenticated) return alert('Please log in to join contests');
    try {
      setJoining(true);
      await joinContest(id);
      await loadContestDetail(id);
    } catch (err) { console.error('Join error:', err); }
    finally { setJoining(false); }
  };

  const now = new Date();
  const upcoming = contests.filter(c => new Date(c.start_time) > now);
  const past = contests.filter(c => new Date(c.end_time) < now);

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ', ' + dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  };

  const getCountdown = (d) => {
    const diff = new Date(d) - now;
    if (diff <= 0) return 'Started';
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return days > 0 ? days + 'd ' + String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0') + ':00'
      : String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0') + ':00';
  };

  // Contest detail view
  if (selectedContest && contestDetail) {
    const myPart = contestDetail.myParticipation;
    return (
      <div className="contest-page">
        <div className="contest-detail-header">
          <button className="contest-detail-back" onClick={() => { setSelectedContest(null); setContestDetail(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <h1>{contestDetail.title}</h1>
          <div className="contest-detail-meta">
            <span>{formatDate(contestDetail.start_time)}</span>
            <span>{contestDetail.duration_minutes} min</span>
            <span>{contestDetail.participant_count || contestDetail.participantCount || 0} participants</span>
          </div>
        </div>

        <div className="contest-page__content">
          <div className="contest-page__main">
            <h3 style={{color: '#e8e8e8', marginBottom: 12, fontSize: 16}}>Questions ({contestDetail.questions?.length || 0})</h3>
            {contestDetail.questions?.map((q, i) => (
              <div key={q.id} className="contest-question-card">
                <div className="contest-question-card__num">{i + 1}</div>
                <div className="contest-question-card__body">
                  <span className="contest-question-card__title">{q.title}</span>
                  <p className="contest-question-card__desc">{q.description}</p>
                </div>
                <span className={'contest-question-card__diff contest-question-card__diff--' + q.difficulty.toLowerCase()}>{q.difficulty}</span>
              </div>
            ))}

            {!myPart && contestDetail.status !== 'ended' && (
              <button className="contest-join-btn" onClick={() => handleJoin(contestDetail.id)} disabled={joining}>
                {joining ? 'Joining...' : 'Join Contest'}
              </button>
            )}
            {myPart && (
              <div className="contest-my-score">
                <span>Your Score: <strong>{myPart.score}</strong></span>
                <span>Solved: <strong>{myPart.problems_solved}/{contestDetail.questions?.length || 0}</strong></span>
              </div>
            )}
          </div>

          <div className="contest-page__leaderboard">
            <h3 style={{color: '#e8e8e8', marginBottom: 12, fontSize: 16}}>Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <div className="contest-page__empty">No participants yet</div>
            ) : (
              <div className="contest-page__lb-list">
                {leaderboard.map(u => (
                  <div key={u.rank} className="contest-lb-row">
                    <span className="contest-lb-row__rank">{u.rank}</span>
                    <div className="contest-lb-row__avatar">{(u.username || 'A').charAt(0).toUpperCase()}</div>
                    <span className="contest-lb-row__name">{u.username}</span>
                    <div className="contest-lb-row__stats">
                      <span>Score: <strong>{u.score}</strong></span>
                      <span>Solved: {u.problemsSolved}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main contests list view
  return (
    <div className="contest-page">
      <div className="contest-page__hero">
        <svg className="contest-page__trophy" viewBox="0 0 64 80" width="80" height="100">
          <path d="M16 8h32v4H16z" fill="#d4920a"/>
          <path d="M12 12h40v24c0 12-8 20-20 20S12 48 12 36V12z" fill="#d4920a"/>
          <path d="M20 12h24v20c0 8-5 14-12 14s-12-6-12-14V12z" fill="#b87d08"/>
          <circle cx="32" cy="28" r="8" fill="rgba(255,255,255,.2)"/>
          <path d="M8 12h4v12c0 4-2 6-4 6s-4-2-4-6v-6h4V12z" fill="#d4920a"/>
          <path d="M52 12h4v6h-4v6c0 4-2 6-4 6s-4-2-4-6V12h8z" fill="#d4920a" transform="scale(-1,1) translate(-64,0)"/>
          <rect x="24" y="56" width="16" height="4" rx="1" fill="#b87d08"/>
          <rect x="20" y="60" width="24" height="6" rx="2" fill="#d4920a"/>
        </svg>
        <h1 className="contest-page__title">SQL Contest</h1>
        <p className="contest-page__subtitle">Compete every week. Solve SQL challenges and see your ranking!</p>
      </div>

      {upcoming.length > 0 && (
        <div className="contest-page__upcoming">
          {upcoming.slice(0, 2).map(ct => (
            <div key={ct.id} className={'contest-card contest-card--' + ct.type} onClick={() => loadContestDetail(ct.id)}>
              <div className="contest-card__countdown">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {getCountdown(ct.start_time)}
              </div>
              <div className="contest-card__info">
                <h3>{ct.title}</h3>
                <p>{formatDate(ct.start_time)}</p>
              </div>
              <button className="contest-card__register" onClick={(e) => { e.stopPropagation(); handleJoin(ct.id); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="contest-page__content">
        <div className="contest-page__main">
          <div className="contest-page__tabs">
            <button className={'contest-page__tab ' + (tab === 'past' ? 'contest-page__tab--active' : '')} onClick={() => setTab('past')}>Past Contests</button>
            <button className={'contest-page__tab ' + (tab === 'my' ? 'contest-page__tab--active' : '')} onClick={() => setTab('my')}>My Contests</button>
          </div>
          <div className="contest-page__list">
            {loading ? (
              <div className="contest-page__empty">Loading contests...</div>
            ) : tab === 'my' && !isAuthenticated ? (
              <div className="contest-page__empty">Sign in to view your contest history</div>
            ) : tab === 'my' ? (
              myHistory.length === 0 ? (
                <div className="contest-page__empty">You haven't participated in any contests yet</div>
              ) : (
                myHistory.map(h => (
                  <div key={h.contest_id} className="contest-row" onClick={() => loadContestDetail(h.contest_id)}>
                    <div className={'contest-row__icon contest-row__icon--' + h.type}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v4l2 2"/></svg>
                    </div>
                    <div className="contest-row__info">
                      <span className="contest-row__title">{h.title}</span>
                      <span className="contest-row__date">{formatDate(h.start_time)}</span>
                    </div>
                    <span className="contest-row__problems">{h.problems_solved} / 2</span>
                    <span className="contest-row__problems">Score: {h.score}</span>
                  </div>
                ))
              )
            ) : (
              past.map(ct => (
                <div key={ct.id} className="contest-row" onClick={() => loadContestDetail(ct.id)}>
                  <div className={'contest-row__icon contest-row__icon--' + ct.type}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v4l2 2"/></svg>
                  </div>
                  <div className="contest-row__info">
                    <span className="contest-row__title">{ct.title}</span>
                    <span className="contest-row__date">{formatDate(ct.start_time)}</span>
                  </div>
                  <span className="contest-row__problems">0 / 2</span>
                  <button className="contest-row__btn" onClick={(e) => { e.stopPropagation(); loadContestDetail(ct.id); }}>Virtual</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="contest-page__leaderboard">
          <h3 style={{color: '#e8e8e8', marginBottom: 12, fontSize: 16}}>Global Ranking</h3>
          <div className="contest-page__empty" style={{fontSize: 12}}>
            Participate in contests to appear on the leaderboard
          </div>
        </div>
      </div>
    </div>
  );
}


function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        <NavigationProvider>
          <Router>
            <div className="app">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/"
                  element={
                    <>
                      <TopNavBar />
                      <main className="app__main">
                        <AssignmentList />
                      </main>
                    </>
                  }
                />
                <Route
                  path="/discuss"
                  element={
                    <>
                      <TopNavBar />
                      <main className="app__main">
                        <DiscussPage />
                      </main>
                    </>
                  }
                />
                <Route
                  path="/interview"
                  element={
                    <>
                      <TopNavBar />
                      <main className="app__main">
                        <InterviewPage />
                      </main>
                    </>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <>
                      <TopNavBar />
                      <main className="app__main">
                        <Profile />
                      </main>
                    </>
                  }
                />
                <Route path="/assignment/:id" element={<AssignmentRouteWrapper />} />
              </Routes>
            </div>
          </Router>
        </NavigationProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

export default App;
