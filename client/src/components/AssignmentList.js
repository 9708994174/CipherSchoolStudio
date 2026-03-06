import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getAssignments, getUserActivity, getUserStats } from '../services/api';
import './AssignmentList.scss';

// ══════════════════════════════════════════════════════════════
//  LEETCODE-STYLE MONTHLY ACTIVITY CALENDAR
// ══════════════════════════════════════════════════════════════
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function ActivityCalendar({ activityData }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Streak calc
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const k = d.toISOString().slice(0, 10);
    if (!activityData[k]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const totalDays = Object.keys(activityData).filter(k => activityData[k] > 0).length;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const weeks = [];
  let currentWeek = new Array(startDow).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isCurrentMonth = viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <div className="cal-lc">
      <div className="cal-lc__streak-row">
        <span className="cal-lc__streak">🔥 {streak} day streak</span>
        <span className="cal-lc__total">{totalDays} active days</span>
      </div>

      <div className="cal-lc__nav">
        <button className="cal-lc__arrow" onClick={prevMonth}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="cal-lc__month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button className="cal-lc__arrow" onClick={nextMonth} disabled={isCurrentMonth}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="cal-lc__dow-row">
        {DOW.map((d, i) => <span key={i} className="cal-lc__dow">{d}</span>)}
      </div>

      <div className="cal-lc__grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-lc__week">
            {week.map((day, di) => {
              if (day === null) return <div key={di} className="cal-lc__cell cal-lc__cell--empty" />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = activityData[dateStr] || 0;
              const isToday = day === today.getDate() && isCurrentMonth;
              const isFuture = new Date(viewYear, viewMonth, day) > today;
              const solved = count > 0;
              return (
                <div key={di} className={`cal-lc__cell${isToday ? ' cal-lc__cell--today' : ''}${solved ? ' cal-lc__cell--solved' : ''}${isFuture ? ' cal-lc__cell--future' : ''}`}>
                  <span className="cal-lc__day-num">{day}</span>
                  {solved && !isFuture && <span className="cal-lc__dot" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SIDEBAR FILTERS
// ══════════════════════════════════════════════════════════════
const SQL_TOPICS_LIST = ['Basics', 'SELECT', 'WHERE', 'JOIN', 'Aggregate', 'Window Fn', 'CTE', 'Subqueries', 'Case Statements', 'DISTINCT', 'LIMIT'];

function LeftSidebar({ assignments, stats, activityData, onTopicFilter }) {
  const total = assignments.length;
  const solved = stats.total || 0;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const [activeTopic, setActiveTopic] = useState(null);

  const handleTopic = (t) => {
    const next = activeTopic === t ? null : t;
    setActiveTopic(next);
    onTopicFilter(next);
  };

  return (
    <aside className="prob-left-sidebar">
      <div className="left-card">
        <div className="left-card__title">Your Progress</div>
        <div className="prog-donut-row">
          <svg viewBox="0 0 80 80" className="prog-donut">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#2a2a2a" strokeWidth="8" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#2cbb5d" strokeWidth="8" strokeDasharray={`${pct * 1.884} 188.4`} strokeDashoffset="47.1" strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
            <text x="40" y="36" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{solved}</text>
            <text x="40" y="48" textAnchor="middle" fill="#8c8c8c" fontSize="8">Solved</text>
          </svg>
          <div className="prog-bars">
            {[
              { label: 'Easy', val: stats.easy || 0, total: assignments.filter(a => a.difficulty === 'Easy').length, cls: 'easy' },
              { label: 'Medium', val: stats.medium || 0, total: assignments.filter(a => a.difficulty === 'Medium').length, cls: 'med' },
              { label: 'Hard', val: stats.hard || 0, total: assignments.filter(a => a.difficulty === 'Hard').length, cls: 'hard' },
            ].map(({ label, val, total: t, cls }) => (
              <div key={label} className="prog-bar-row">
                <span className={`prog-bar-label prog-bar-label--${cls}`}>{label}</span>
                <div className="prog-bar-track"><div className={`prog-bar-fill prog-bar-fill--${cls}`} style={{ width: t > 0 ? `${Math.round((val / t) * 100)}%` : '0%' }} /></div>
                <span className={`prog-bar-count prog-bar-count--${cls}`}>{val}<span>/{t}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="left-card">
        <div className="left-card__title">Recent Activity</div>
        <ActivityCalendar activityData={activityData} />
      </div>

      <div className="left-card">
        <div className="left-card__title">Topics</div>
        <div className="topic-tags">
          {SQL_TOPICS_LIST.map(t => (
            <button key={t} className={`topic-tag ${activeTopic === t ? 'topic-tag--active' : ''}`} onClick={() => handleTopic(t)}>{t}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════
//  TRENDING SECTION (right sidebar)
// ══════════════════════════════════════════════════════════════
function TrendingSection({ assignments = [], onCompanyFilter, onTopicFilter }) {
  const [search, setSearch] = useState('');

  const clusters = useMemo(() => {
    const companies = {};
    const topics = {};

    assignments.forEach(a => {
      // Extraction
      const compMatch = (a.title || '').match(/^(Google|Amazon|Meta|Uber|Microsoft|Airbnb|Netflix|Salesforce|Twitter|LinkedIn|Apple|Spotify|Bloomberg|Oracle|TikTok|Adobe|Snap|IBM|tcs|Goldman Sachs):/i);
      if (compMatch) {
        const c = compMatch[1];
        companies[c] = (companies[c] || 0) + 1;
      }

      const topicMatch = (a.title || '').match(/\((.*?)\)$/);
      if (topicMatch) {
        const t = topicMatch[1];
        topics[t] = (topics[t] || 0) + 1;
      }
    });

    return {
      companies: Object.entries(companies).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      topics: Object.entries(topics).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    };
  }, [assignments]);

  const filteredComps = clusters.companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTops = clusters.topics.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside className="right-sidebar">
      <div className="trending-card">
        <div className="trending-card__header">
          <h3 className="trending-card__title">Trending Companies</h3>
          <div className="trending-card__nav-arrows">
            <button className="trending-card__arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
            <button className="trending-card__arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
          </div>
        </div>

        <div className="trending-card__search-wrap">
          <svg className="trending-card__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input className="trending-card__search-input" placeholder="Search for a company..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="trending-card__pills">
          {filteredComps.map(c => (
            <button key={c.name} className="trending-pill" onClick={() => onCompanyFilter(c.name)}>
              <span className="trending-pill__name">{c.name}</span>
              <span className="trending-pill__count">{c.count > 100 ? c.count * 12 : c.count}</span>
            </button>
          ))}
          {filteredComps.length === 0 && <div className="trending-card__empty">No companies found</div>}
        </div>
      </div>

      <div className="trending-card" style={{ marginTop: 16 }}>
        <div className="trending-card__header">
          <h3 className="trending-card__title">Popular Topics</h3>
        </div>
        <div className="trending-card__pills">
          {filteredTops.map(t => (
            <button key={t.name} className="trending-pill" onClick={() => onTopicFilter(t.name)}>
              <span className="trending-pill__name">{t.name}</span>
              <span className="trending-pill__count">{t.count}</span>
            </button>
          ))}
          {filteredTops.length === 0 && <div className="trending-card__empty">No topics found</div>}
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const NAV_TOPICS = ['All Topics', 'Basics', 'Joins', 'Aggregates', 'Subqueries', 'Window Fn', 'CTE', 'Interview Mastery'];
const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

function AssignmentList() {
  const [assignments, setAssignments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem('asgn_diff') || 'All');
  const [navTopic, setNavTopic] = useState('All Topics');
  const [sideTopic, setSideTopic] = useState(null);
  const [companyTopic, setCompanyTopic] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [activityData, setActivityData] = useState({});

  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { setAssignmentsList, setCurrentAssignmentIndex } = useNavigation();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      // Clear cache if it looks like we need fresh data
      if (localStorage.getItem('assignments')) {
        localStorage.removeItem('assignments');
      }
      const [assignRes, statsRes, actRes] = await Promise.allSettled([
        getAssignments(),
        getUserStats(),
        getUserActivity(),
      ]);
      if (assignRes.status === 'fulfilled') {
        const list = assignRes.value.data || [];
        setAssignments(list);
        setAssignmentsList(list);
        // Cache new data
        try { localStorage.setItem('assignments', JSON.stringify(list.map(a => ({ _id: a._id, title: a.title, difficulty: a.difficulty })))); } catch { }
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.stats || {});
      if (actRes.status === 'fulfilled') setActivityData(actRes.value.data?.activity || {});
    } catch {
      // Failed to load components
    } finally {
      setLoading(false);
    }
  }, [setAssignmentsList]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let list = assignments;
    if (difficulty !== 'All') list = list.filter(a => a.difficulty === difficulty);
    if (navTopic !== 'All Topics') {
      if (navTopic === 'Interview Mastery') {
        const masteryList = list.filter(a => a.category === 'SQL Interview Mastery');
        list = masteryList;
      } else {
        list = list.filter(a => (a.title + a.question).toLowerCase().includes(navTopic.toLowerCase().replace(' fn', '')));
      }
    }
    if (sideTopic) list = list.filter(a => (a.title + a.question).toLowerCase().includes(sideTopic.toLowerCase().replace(' fn', '').replace('aggregate', 'group')));
    if (companyTopic) list = list.filter(a => (a.title || '').startsWith(companyTopic + ':'));
    if (search.trim()) list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [assignments, difficulty, navTopic, sideTopic, companyTopic, search]);

  const handleClick = (a) => {
    const idx = assignments.findIndex(x => String(x._id) === String(a._id));
    if (idx !== -1) setCurrentAssignmentIndex(idx);
    if (!isAuthenticated) navigate(`/login?redirect=/assignment/${a._id}`);
    else navigate(`/assignment/${a._id}`);
  };

  return (
    <div className="prob-page">
      {isAuthenticated && (
        <LeftSidebar assignments={assignments} stats={stats} activityData={activityData} onTopicFilter={setSideTopic} />
      )}

      <main className="prob-main">
        <div className="prob-topic-tabs">
          {NAV_TOPICS.map(t => (
            <button key={t} className={`prob-topic-tab ${navTopic === t ? 'prob-topic-tab--active' : ''}`} onClick={() => { setNavTopic(t); setCompanyTopic(null); }}>{t}</button>
          ))}
        </div>

        <div className="prob-toolbar">
          <button className="prob-clear-btn" onClick={() => { setDifficulty('All'); setNavTopic('All Topics'); setSideTopic(null); setCompanyTopic(null); setSearch(''); }}>Reset Filters</button>
          <div className="prob-toolbar__filters">
            {DIFFICULTIES.map(d => (
              <button key={d} className={`prob-toolbar__filter ${difficulty === d ? 'prob-toolbar__filter--active' : ''} ${d !== 'All' ? `prob-toolbar__filter--${d.toLowerCase()}` : ''}`} onClick={() => { setDifficulty(d); localStorage.setItem('asgn_diff', d); }}>{d}</button>
            ))}
          </div>
          <div className="prob-toolbar__right">
            <div className="prob-toolbar__search">
              <input className="prob-toolbar__search-input" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="prob-loading"><div className="prob-loading__spinner" /><span>Loading problems…</span></div>
        ) : (
          <div className="prob-table-wrap">
            <table className="prob-table">
              <thead>
                <tr>
                  <th className="prob-table__th" style={{ width: 50 }}>#</th>
                  <th className="prob-table__th">Title</th>
                  <th className="prob-table__th prob-table__th--hide-sm" style={{ width: 160 }}>Tags</th>
                  <th className="prob-table__th" style={{ width: 110 }}>Acceptance</th>
                  <th className="prob-table__th" style={{ width: 95 }}>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const solvedKey = isAuthenticated && user?.id ? `solvedProblems_${user.id}` : null;
                  const solvedProblems = solvedKey ? JSON.parse(localStorage.getItem(solvedKey) || '{}') : {};
                  const isSolved = isAuthenticated && solvedProblems[a._id];
                  return (
                    <tr key={a._id} className="prob-row" onClick={() => handleClick(a)}>
                      <td className="prob-row__num">
                        {isSolved ? (
                          <span className="prob-row__solved-icon" title="Solved">✓</span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="prob-row__title">
                        <span className={`prob-row__title-text ${a.category === 'SQL Interview Mastery' ? 'prob-row__title-text--premium' : ''}`}>{a.title}</span>
                      </td>
                      <td className="prob-row__tags prob-row__tags--hide-sm">
                        {a.category === 'SQL Interview Mastery' && <span className="prob-tag prob-tag--mastery">Mastery</span>}
                        {getSqlTags(a).map(tag => <span key={tag} className="prob-tag">{tag}</span>)}
                      </td>
                      <td className="prob-row__acceptance">{(Number(a.acceptanceRate) || 0).toFixed(1)}%</td>
                      <td className={`prob-row__diff prob-row__diff--${a.difficulty.toLowerCase()}`}>{a.difficulty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <TrendingSection assignments={assignments} onCompanyFilter={setCompanyTopic} onTopicFilter={setSideTopic} />
    </div>
  );
}

function getSqlTags(a) {
  const q = ((a.question || '') + (a.title || '')).toUpperCase();
  const tags = [];
  if (q.includes('JOIN')) tags.push('JOIN');
  if (q.includes('GROUP BY') || q.includes('AGGREGATE')) tags.push('Aggregate');
  if (q.includes('OVER') || q.includes('WINDOW')) tags.push('Window Fn');
  if (q.includes('WITH ') || q.includes('CTE')) tags.push('CTE');
  if (tags.length === 0) tags.push('Basics');
  return tags.slice(0, 2);
}

export default AssignmentList;
