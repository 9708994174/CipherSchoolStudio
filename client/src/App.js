import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QueryProvider, useQuery } from './contexts/QueryContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AssignmentList from './components/AssignmentList';
import AssignmentAttempt from './components/AssignmentAttempt';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { getAssignments } from './services/api';
import './App.scss';

// ══════════════════════════════════════════════════════════════
//  STREAK BADGE  (header component)
// ══════════════════════════════════════════════════════════════
function StreakBadge() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);
  const [dailyId, setDailyId] = useState(null);
  const navigate = useNavigate();

  // Load streak from localStorage
  const loadStreak = useCallback(() => {
    try {
      const solved = JSON.parse(localStorage.getItem('solvedDays') || '{}');
      const today = new Date().toISOString().slice(0, 10);
      setChecked(!!solved[today]);

      // Count current streak (consecutive days ending today)
      let s = 0;
      const d = new Date();
      while (true) {
        const k = d.toISOString().slice(0, 10);
        if (!solved[k]) break;
        s++;
        d.setDate(d.getDate() - 1);
      }
      setStreak(s);

      // Longest streak
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
    // Update when a problem is solved
    const handler = () => setTimeout(loadStreak, 200);
    window.addEventListener('problem-solved', handler);
    return () => window.removeEventListener('problem-solved', handler);
  }, [loadStreak]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (!e.target.closest('.streak-badge')) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Pick today's daily challenge from cached assignments
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

  // Build last 7 days for the mini calendar strip
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const solved = JSON.parse(localStorage.getItem('solvedDays') || '{}');
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
          {/* Header */}
          <div className="streak-popup__top">
            <div className="streak-popup__flame">🔥</div>
            <div>
              <div className="streak-popup__number">{streak}</div>
              <div className="streak-popup__label">Day Streak</div>
            </div>
          </div>

          {/* 7-day strip */}
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

          {/* Stats row */}
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

          {/* Daily challenge button */}
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
                🔥 Solve today's challenge
              </button>
            )}
            <p className="streak-popup__note">Streak increases when you submit a correct answer</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Route wrapper for assignment pages ───────────────────────
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

// ── Top navigation bar ───────────────────────────────────────
// ── Discuss Page ─────────────────────────────────────────────
function DiscussPage() {
  const [posts] = useState([
    { id: 1, title: 'How to approach SQL JOIN problems?', author: 'SQLMaster', replies: 12, views: 346, tags: ['JOIN', 'Tips'], time: '2h ago', hot: true },
    { id: 2, title: 'Understanding Window Functions - Complete Guide', author: 'DataExpert', replies: 28, views: 892, tags: ['Window Fn', 'Guide'], time: '5h ago', hot: true },
    { id: 3, title: 'GROUP BY vs PARTITION BY - When to use what?', author: 'QueryNinja', replies: 15, views: 523, tags: ['Aggregate', 'Window Fn'], time: '1d ago', hot: false },
    { id: 4, title: 'Common mistakes in SQL subqueries', author: 'DBWizard', replies: 9, views: 234, tags: ['Subqueries'], time: '1d ago', hot: false },
    { id: 5, title: 'Is CTE better than subquery for performance?', author: 'PerfGeek', replies: 21, views: 678, tags: ['CTE', 'Performance'], time: '2d ago', hot: true },
    { id: 6, title: 'Tips for Google SQL interviews', author: 'InterviewPro', replies: 34, views: 1205, tags: ['Interview', 'Google'], time: '3d ago', hot: true },
    { id: 7, title: 'How to optimize complex JOIN queries?', author: 'OptimizeSQL', replies: 7, views: 189, tags: ['JOIN', 'Performance'], time: '3d ago', hot: false },
    { id: 8, title: 'HAVING vs WHERE - A confusion solved', author: 'Beginner101', replies: 11, views: 412, tags: ['Basics', 'Aggregate'], time: '4d ago', hot: false },
  ]);

  return (
    <div className="discuss-page">
      <div className="discuss-page__header">
        <h1 className="discuss-page__title">Discuss</h1>
        <p className="discuss-page__subtitle">Share solutions, ask questions, and learn from the community</p>
      </div>
      <div className="discuss-page__toolbar">
        <div className="discuss-page__tabs">
          <button className="discuss-page__tab discuss-page__tab--active">Trending</button>
          <button className="discuss-page__tab">Latest</button>
          <button className="discuss-page__tab">Most Voted</button>
          <button className="discuss-page__tab">My Posts</button>
        </div>
        <button className="discuss-page__new-btn">+ New Post</button>
      </div>
      <div className="discuss-page__list">
        {posts.map(p => (
          <div key={p.id} className="discuss-post">
            <div className="discuss-post__votes">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 6H3l5-6z" fill="currentColor" /></svg>
              <span>{p.replies}</span>
            </div>
            <div className="discuss-post__body">
              <div className="discuss-post__title-row">
                {p.hot && <span className="discuss-post__hot">🔥</span>}
                <span className="discuss-post__title">{p.title}</span>
              </div>
              <div className="discuss-post__meta">
                <span className="discuss-post__author">{p.author}</span>
                <span className="discuss-post__dot">·</span>
                <span className="discuss-post__time">{p.time}</span>
                <span className="discuss-post__dot">·</span>
                <span className="discuss-post__views">{p.views} views</span>
                {p.tags.map(t => <span key={t} className="discuss-post__tag">{t}</span>)}
              </div>
            </div>
            <div className="discuss-post__replies">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <span>{p.replies}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Interview Page ───────────────────────────────────────────
function InterviewPage() {
  const navigate = useNavigate();
  const companies = [
    { name: 'Google', icon: '🔍', count: 15, color: '#4285f4' },
    { name: 'Amazon', icon: '📦', count: 12, color: '#ff9900' },
    { name: 'Meta', icon: '💠', count: 10, color: '#0668e1' },
    { name: 'Microsoft', icon: '🪟', count: 8, color: '#00a4ef' },
    { name: 'Uber', icon: '🚗', count: 7, color: '#000' },
    { name: 'Airbnb', icon: '🏠', count: 6, color: '#ff5a5f' },
    { name: 'Netflix', icon: '🎬', count: 5, color: '#e50914' },
    { name: 'Apple', icon: '🍎', count: 5, color: '#a2aaad' },
  ];

  const tips = [
    { icon: '📝', title: 'SQL Fundamentals', desc: 'Master SELECT, WHERE, JOIN, GROUP BY', level: 'Beginner' },
    { icon: '⚡', title: 'Query Optimization', desc: 'Learn indexing, execution plans, and query tuning', level: 'Advanced' },
    { icon: '🧩', title: 'Problem Patterns', desc: 'Common SQL patterns: running totals, gaps & islands', level: 'Intermediate' },
    { icon: '🎯', title: 'Mock Interviews', desc: 'Practice with timed SQL challenges', level: 'All Levels' },
  ];

  return (
    <div className="interview-page">
      <div className="interview-page__header">
        <h1 className="interview-page__title">Interview Prep</h1>
        <p className="interview-page__subtitle">Practice SQL questions from top tech companies</p>
      </div>
      <div className="interview-page__content">
        <div className="interview-page__companies">
          <h2 className="interview-page__section-title">Top Companies</h2>
          <div className="interview-page__company-grid">
            {companies.map(c => (
              <div key={c.name} className="interview-company-card" onClick={() => navigate('/')}>
                <span className="interview-company-card__icon">{c.icon}</span>
                <span className="interview-company-card__name">{c.name}</span>
                <span className="interview-company-card__count">{c.count} questions</span>
              </div>
            ))}
          </div>
        </div>
        <div className="interview-page__tips">
          <h2 className="interview-page__section-title">Study Plans</h2>
          <div className="interview-page__tips-grid">
            {tips.map(t => (
              <div key={t.title} className="interview-tip-card">
                <span className="interview-tip-card__icon">{t.icon}</span>
                <div className="interview-tip-card__body">
                  <span className="interview-tip-card__title">{t.title}</span>
                  <span className="interview-tip-card__desc">{t.desc}</span>
                </div>
                <span className="interview-tip-card__level">{t.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    getNextAssignmentId, getPreviousAssignmentId, hasNext, hasPrevious } = useNavigation();
  const { user, logout, isAuthenticated } = useAuth();

  // Timer — reset when navigating to a new assignment
  useEffect(() => {
    if (!isAssignmentPage) { setTimer(0); return; }
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isAssignmentPage, location.pathname]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Close menus on outside click
  useEffect(() => {
    const handler = e => {
      if (qPaletteOpen && !e.target.closest('.app__question-palette')) setQPaletteOpen(false);
      if (userMenuOpen && !e.target.closest('.app__user-menu')) setUserMenuOpen(false);
    };
    if (qPaletteOpen || userMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [qPaletteOpen, userMenuOpen]);

  // Lazy-load assignments for problem palette when empty
  const { setAssignmentsList } = useNavigation();
  useEffect(() => {
    if (!isAssignmentPage || assignments.length > 0) return;
    // Try localStorage cache first
    try {
      const cached = JSON.parse(localStorage.getItem('assignments') || '[]');
      if (cached.length > 0) {
        setAssignmentsList(cached);
        // Set current index based on URL
        const curId = location.pathname.split('/assignment/')[1];
        const idx = cached.findIndex(a => String(a._id) === String(curId));
        if (idx !== -1) setCurrentAssignmentIndex(idx);
        return;
      }
    } catch { }
    // Fallback: fetch from API
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

      {/* ── Left side ─────────────────────────────── */}
      <div className="app__header-left">
        {/* Brand */}
        <div className="app__brand" onClick={() => navigate('/')}>
          CipherSQL<span>Studio</span>
        </div>

        {/* Home nav links */}
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

        {/* Assignment page: list icon + prev/next */}
        {isAssignmentPage && (
          <>
            <div className="app__sep" />

            {/* Question palette toggle */}
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

            {/* Sidebar */}
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
                      return (
                        <button
                          key={a._id}
                          className={`app__question-palette-item${active ? ' app__question-palette-item--active' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQPaletteOpen(false);
                            setCurrentAssignmentIndex(idx);
                            navigate(`/assignment/${a._id}`);
                          }}
                        >
                          <span className="app__question-palette-number">{idx + 1}</span>
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

            {/* Prev / Next arrows */}
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

      {/* ── Center: Run / Submit (assignment page only) ─── */}
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

      {/* ── Right ─────────────────────────────────────── */}
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
              {/* 🔥 Streak badge */}
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

// ── App root ─────────────────────────────────────────────────
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
