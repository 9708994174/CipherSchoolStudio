import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/api';
import './Profile.scss';

function Profile() {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
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
                    <span className="profile-page__login-icon">🔒</span>
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

    // Build 12-month heatmap
    const months = [];
    const today = new Date();
    for (let m = 11; m >= 0; m--) {
        const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const label = d.toLocaleString('en', { month: 'short' });
        const weeks = [];
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dt = new Date(d.getFullYear(), d.getMonth(), day);
            const key = dt.toISOString().slice(0, 10);
            weeks.push({ key, count: activity[key] || 0 });
        }
        months.push({ label, weeks });
    }

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
                {/* ── LEFT SIDEBAR ─── */}
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffa116" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
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
                    <div className="profile-sidebar__lang">
                        <h3>Languages</h3>
                        <div className="profile-sidebar__lang-item">
                            <span className="profile-sidebar__lang-badge">SQL</span>
                            <span>{totalSolved} problems solved</span>
                        </div>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ─── */}
                <div className="profile-main">
                    {/* Donut + Difficulty Bars */}
                    <div className="profile-stats-row">
                        <div className="profile-donut-card">
                            <svg className="profile-donut" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke="#ffa116" strokeWidth="8"
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
                            <div className="profile-badge-icon">🔥</div>
                            <div className="profile-badge-info">
                                <span className="profile-badge-value">{streak.current || 0}</span>
                                <span className="profile-badge-label">Current Streak</span>
                            </div>
                            <div className="profile-badge-icon">🏆</div>
                            <div className="profile-badge-info">
                                <span className="profile-badge-value">{streak.max || 0}</span>
                                <span className="profile-badge-label">Max Streak</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Heatmap */}
                    <div className="profile-heatmap-card">
                        <div className="profile-heatmap-header">
                            <span className="profile-heatmap-title">
                                <strong>{stats.totalSubmissions || 0}</strong> submissions in the past year
                            </span>
                            <span className="profile-heatmap-meta">Total active days: {p.activeDays || 0} · Max streak: {streak.max || 0}</span>
                        </div>
                        <div className="profile-heatmap">
                            {months.map(m => (
                                <div key={m.label} className="profile-heatmap-month">
                                    <div className="profile-heatmap-cells">
                                        {m.weeks.map(w => (
                                            <div key={w.key} className={`profile-heatmap-cell ${w.count > 0 ? 'profile-heatmap-cell--active' : ''}`}
                                                style={w.count > 0 ? { background: `rgba(44,187,93,${Math.min(0.3 + w.count * 0.2, 1)})` } : {}}
                                                title={`${w.key}: ${w.count} submissions`}
                                            />
                                        ))}
                                    </div>
                                    <span className="profile-heatmap-label">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs: Recent, List */}
                    <div className="profile-tabs-card">
                        <div className="profile-tabs">
                            <button className={`profile-tab ${activeTab === 'recent' ? 'profile-tab--active' : ''}`} onClick={() => setActiveTab('recent')}>
                                📋 Recent AC
                            </button>
                            <button className={`profile-tab ${activeTab === 'list' ? 'profile-tab--active' : ''}`} onClick={() => setActiveTab('list')}>
                                📃 All Solved
                            </button>
                        </div>
                        <div className="profile-tab-content">
                            {recent.length === 0 ? (
                                <div className="profile-tab-empty">No submissions yet. Start solving problems!</div>
                            ) : (
                                recent.filter(r => activeTab === 'recent' || r.isCompleted).map((r, i) => (
                                    <div key={i} className="profile-submission-row" onClick={() => navigate(`/assignment/${r.assignmentId}`)}>
                                        <span className={`profile-submission-status ${r.isCompleted ? 'profile-submission-status--ac' : ''}`}>
                                            {r.isCompleted ? '✓' : '○'}
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
