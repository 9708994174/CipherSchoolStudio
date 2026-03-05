import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/api';
import './Profile.scss';

function Profile() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recent');

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getUserProfile();
            if (res.data?.success) setProfile(res.data.profile);
        } catch (err) {
            console.error('Profile fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchProfile();
        else setLoading(false);
    }, [isAuthenticated, fetchProfile]);

    if (!isAuthenticated) {
        return (
            <div className="profile-page profile-page--empty">
                <div className="profile-page__login-prompt">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    <h2>Sign in to view your profile</h2>
                    <p>Track your progress, streaks, and submissions</p>
                    <button className="profile-page__login-btn" onClick={() => navigate('/login')}>Sign In</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="profile-page profile-page--loading">
                <div className="profile-page__spinner" />
                <span>Loading profile...</span>
            </div>
        );
    }

    const p = profile || {};
    const stats = p.stats || {};
    const streak = p.streak || {};
    const recent = p.recentSubmissions || [];
    const activity = p.activity || {};

    // Build progress donut
    const totalSolved = stats.solved || 0;
    const totalProblems = stats.totalProblems || 1;
    const pct = Math.round((totalSolved / totalProblems) * 100);
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (pct / 100) * circumference;

    // Build GitHub-style 52-week heatmap grid (7 rows x ~52 cols)
    const heatmapWeeks = [];
    const heatmapToday = new Date();
    heatmapToday.setHours(0, 0, 0, 0);
    const startDate = new Date(heatmapToday);
    startDate.setDate(startDate.getDate() - 364 - startDate.getDay());

    let totalActiveDays = 0;
    let currentWeek = [];
    const monthLabels = [];
    let lastMonth = -1;

    for (let d = new Date(startDate); d <= heatmapToday; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const count = activity[key] || 0;
        if (count > 0) totalActiveDays++;
        const dayOfWeek = d.getDay();

        if (d.getMonth() !== lastMonth) {
            monthLabels.push({ weekIdx: heatmapWeeks.length, label: d.toLocaleString('en', { month: 'short' }) });
            lastMonth = d.getMonth();
        }

        currentWeek.push({ key, count, dayOfWeek });

        if (dayOfWeek === 6) {
            heatmapWeeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) heatmapWeeks.push(currentWeek);

    const getGreenLevel = (count) => {
        if (count === 0) return 'rgba(255,255,255,0.04)';
        if (count === 1) return '#0e4429';
        if (count <= 3) return '#006d32';
        if (count <= 6) return '#26a641';
        return '#39d353';
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    return (
        <div className="profile-page">
            <div className="profile-page__layout">
                {/* LEFT SIDEBAR */}
                <aside className="profile-sidebar">
                    <div className="profile-sidebar__avatar">
                        {(p.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <h2 className="profile-sidebar__name">{p.username}</h2>
                    <p className="profile-sidebar__email">{p.email}</p>
                    <p className="profile-sidebar__joined">
                        Joined {new Date(p.joinedAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                    </p>

                    <div className="profile-sidebar__divider" />

                    <div className="profile-sidebar__community">
                        <h3>Community Stats</h3>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="#2cbb5d"><path d="M8 1l2 5h5l-4 3.5 1.5 5L8 11l-4.5 3.5L5 9.5 1 6h5z" /></svg>
                            <span>Solutions</span>
                            <strong>{totalSolved}</strong>
                        </div>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4920a" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                            <span>Discuss</span>
                            <strong>{p.discussions || 0}</strong>
                        </div>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="#ff375f"><path d="M8 1l2 5h5l-4 3.5 1.5 5L8 11l-4.5 3.5L5 9.5 1 6h5z" /></svg>
                            <span>Submissions</span>
                            <strong>{stats.totalSubmissions || 0}</strong>
                        </div>
                    </div>

                    <div className="profile-sidebar__divider" />
                    <div className="profile-sidebar__contest">
                        <h3>Contest Stats</h3>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffc01e" strokeWidth="2"><circle cx="12" cy="8" r="7" /><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" /></svg>
                            <span>Global Rank</span>
                            <strong className="profile-sidebar__rank">{p.contestStats?.globalRank || '--'}</strong>
                        </div>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4920a" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 8 12 10c5-2 5-6 7.5-6a2.5 2.5 0 010 5H18l-6 13-6-13z" /></svg>
                            <span>Total Score</span>
                            <strong>{p.contestStats?.totalScore || 0}</strong>
                        </div>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2cbb5d" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            <span>Solved</span>
                            <strong>{p.contestStats?.solved || 0}</strong>
                        </div>
                        <div className="profile-sidebar__stat-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            <span>Contests</span>
                            <strong>{p.contestStats?.joined || 0}</strong>
                        </div>
                    </div>

                    <div className="profile-sidebar__divider" />
                    <div className="profile-sidebar__lang">
                        <h3>Languages</h3>
                        <div className="profile-sidebar__lang-item">
                            <span className="profile-sidebar__lang-badge">SQL</span>
                            <span>{totalSolved} problems solved</span>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <div className="profile-main">
                    {/* Donut + Difficulty Bars + Streak */}
                    <div className="profile-stats-row">
                        <div className="profile-donut-card">
                            <svg className="profile-donut" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke="#d4920a" strokeWidth="8"
                                    strokeDasharray={circumference} strokeDashoffset={offset}
                                    strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                                <text x="60" y="54" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">{totalSolved}</text>
                                <text x="60" y="70" textAnchor="middle" fill="#8c8c8c" fontSize="10">/{totalProblems} Solved</text>
                            </svg>
                        </div>
                        <div className="profile-diff-bars">
                            {[
                                { label: 'Easy', solved: stats.easy, total: stats.totalEasy, color: '#00b8a3' },
                                { label: 'Med.', solved: stats.medium, total: stats.totalMedium, color: '#ffc01e' },
                                { label: 'Hard', solved: stats.hard, total: stats.totalHard, color: '#ff375f' },
                            ].map(d => (
                                <div key={d.label} className="profile-diff-row">
                                    <span className="profile-diff-label" style={{ color: d.color }}>{d.label}</span>
                                    <div className="profile-diff-track">
                                        <div className="profile-diff-fill" style={{ width: `${d.total ? (d.solved / d.total) * 100 : 0}%`, background: d.color }} />
                                    </div>
                                    <span className="profile-diff-count" style={{ color: d.color }}>{d.solved || 0}<span>/{d.total || 0}</span></span>
                                </div>
                            ))}
                        </div>
                        <div className="profile-badges-card">
                            <div className="profile-badge-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4920a" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
                            <div className="profile-badge-info">
                                <span className="profile-badge-value">{streak.current || 0}</span>
                                <span className="profile-badge-label">Current Streak</span>
                            </div>
                            <div className="profile-badge-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4920a" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 8 12 10c5-2 5-6 7.5-6a2.5 2.5 0 010 5H18l-6 13-6-13z" /></svg></div>
                            <div className="profile-badge-info">
                                <span className="profile-badge-value">{streak.max || 0}</span>
                                <span className="profile-badge-label">Max Streak</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Heatmap - GitHub/LeetCode style */}
                    <div className="profile-heatmap-card">
                        <div className="profile-heatmap-header">
                            <span className="profile-heatmap-title">
                                <strong>{totalActiveDays}</strong> active days in the past year
                            </span>
                            <span className="profile-heatmap-meta">Total solved: {totalSolved} | Max streak: {streak.max || 0}</span>
                        </div>

                        <div className="profile-heatmap-grid-wrap">
                            {/* Month labels */}
                            <div className="profile-heatmap-month-row">
                                <div className="profile-heatmap-day-spacer" />
                                {monthLabels.map((m, i) => (
                                    <span key={i} className="profile-heatmap-month-lbl"
                                        style={{ gridColumnStart: m.weekIdx + 1 }}>
                                        {m.label}
                                    </span>
                                ))}
                            </div>

                            <div className="profile-heatmap-grid">
                                {/* Day labels */}
                                <div className="profile-heatmap-day-labels">
                                    <span></span>
                                    <span>Mon</span>
                                    <span></span>
                                    <span>Wed</span>
                                    <span></span>
                                    <span>Fri</span>
                                    <span></span>
                                </div>

                                {/* Week columns */}
                                <div className="profile-heatmap-columns">
                                    {heatmapWeeks.map((week, wi) => (
                                        <div key={wi} className="profile-heatmap-col">
                                            {Array.from({ length: 7 }, (_, di) => {
                                                const cell = week.find(c => c.dayOfWeek === di);
                                                if (!cell) return <div key={di} className="profile-heatmap-cell profile-heatmap-cell--empty" />;
                                                return (
                                                    <div
                                                        key={di}
                                                        className={`profile-heatmap-cell ${cell.count > 0 ? 'profile-heatmap-cell--active' : ''}`}
                                                        style={{ background: getGreenLevel(cell.count) }}
                                                        title={`${cell.key}: ${cell.count} problem${cell.count !== 1 ? 's' : ''} solved`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="profile-heatmap-legend">
                            <span>Less</span>
                            <div className="profile-heatmap-cell" style={{ background: 'rgba(255,255,255,0.04)' }} />
                            <div className="profile-heatmap-cell" style={{ background: '#0e4429' }} />
                            <div className="profile-heatmap-cell" style={{ background: '#006d32' }} />
                            <div className="profile-heatmap-cell" style={{ background: '#26a641' }} />
                            <div className="profile-heatmap-cell" style={{ background: '#39d353' }} />
                            <span>More</span>
                        </div>
                    </div>

                    {/* Tabs: Recent, List */}
                    <div className="profile-tabs-card">
                        <div className="profile-tabs">
                            <button className={`profile-tab ${activeTab === 'recent' ? 'profile-tab--active' : ''}`} onClick={() => setActiveTab('recent')}>
                                Recent AC
                            </button>
                            <button className={`profile-tab ${activeTab === 'list' ? 'profile-tab--active' : ''}`} onClick={() => setActiveTab('list')}>
                                All Solved
                            </button>
                        </div>
                        <div className="profile-tab-content">
                            {recent.length === 0 ? (
                                <div className="profile-tab-empty">No submissions yet. Start solving problems!</div>
                            ) : (
                                recent.filter(r => activeTab === 'recent' || r.isCompleted).map((r, i) => (
                                    <div key={i} className="profile-submission-row" onClick={() => navigate(`/assignment/${r.assignmentId}`)}>
                                        <span className={`profile-submission-status ${r.isCompleted ? 'profile-submission-status--ac' : ''}`}>
                                            {r.isCompleted ? '\u2713' : '\u25CB'}
                                        </span>
                                        <span className="profile-submission-title">{r.title}</span>
                                        <span className="profile-submission-time">{timeAgo(r.time)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
