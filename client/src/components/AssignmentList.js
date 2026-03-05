import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getAssignments, getUserActivity, getUserStats } from '../services/api';
import './AssignmentList.scss';

function TrendingSection({ assignments = [], onCompanyFilter }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 14;

  const clusters = useMemo(() => {
    const companies = {};
    assignments.forEach(a => {
      const compMatch = (a.title || '').match(/^(Google|Amazon|Meta|Uber|Microsoft|Airbnb|Netflix|Salesforce|Twitter|LinkedIn|Apple|Spotify|Bloomberg|Oracle|TikTok|Adobe|Snap|IBM|tcs|Goldman Sachs):/i);
      if (compMatch) {
        const c = compMatch[1];
        companies[c] = (companies[c] || 0) + 1;
      }
    });
    return Object.entries(companies)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [assignments]);

  const filtered = clusters.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const visible = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <aside className="right-sidebar">
      <div className="trending-card">
        <div className="trending-card__header">
          <div className="trending-card__header-top">
            <h3 className="trending-card__title">Trending Companies</h3>
            <div className="trending-card__nav">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="trending-card__nav-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="trending-card__nav-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
          <div className="trending-card__search-mini">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search for a company..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </div>
        <div className="trending-card__grid">
          {visible.map(c => (
            <span key={c.name} className="trending-card__company-chip" onClick={() => onCompanyFilter(c.name)}>
              {c.name} <span className="trending-card__chip-count">{c.count}</span>
            </span>
          ))}
          {visible.length === 0 && <div className="trending-card__empty">No companies found</div>}
        </div>
      </div>
    </aside>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const NAV_TOPICS = ['All Topics', 'Basics', 'Joins', 'Aggregates', 'Subqueries', 'Window Fn', 'CTE'];
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
  const { isAuthenticated , user} = useAuth();
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
    if (navTopic !== 'All Topics') list = list.filter(a => (a.title + a.question).toLowerCase().includes(navTopic.toLowerCase().replace(' fn', '')));
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
                        <span className="prob-row__title-text">{a.title}</span>
                      </td>
                      <td className="prob-row__tags prob-row__tags--hide-sm">
                        {getSqlTags(a).map(tag => <span key={tag} className="prob-tag">{tag}</span>)}
                      </td>
                      <td className="prob-row__acceptance">{((String(a._id).length % 40) + 40).toFixed(1)}%</td>
                      <td className={`prob-row__diff prob-row__diff--${a.difficulty.toLowerCase()}`}>{a.difficulty}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <TrendingSection assignments={assignments} onCompanyFilter={setCompanyTopic} />
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
