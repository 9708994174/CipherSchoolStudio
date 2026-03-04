import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useQuery } from '../contexts/QueryContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getAssignment,
  getAssignments,
  getAssignmentProgress,
  saveAssignmentProgress,
  executeQuery,
  getHint,
  submitQuery,
  checkServerHealth,
  getDiscussions,
  createPost,
  likePost,
  getEngagementStats,
} from '../services/api';
import SchemaViewer from './SchemaViewer';
import ResultsPanel from './ResultsPanel';
import './AssignmentAttempt.scss';

// ── LeetCode-style test case viewer ──────────────────────────
function TestCaseViewer({ testCases }) {
  const [activeCase, setActiveCase] = useState(0);
  const cases = testCases.slice(0, 3);
  const tc = cases[activeCase] || cases[0];
  if (!tc) return null;
  return (
    <div className="tc-viewer">
      <div className="tc-viewer__tabs">
        {cases.map((_, i) => (
          <button
            key={i}
            className={`tc-viewer__tab ${activeCase === i ? 'tc-viewer__tab--active' : ''}`}
            onClick={() => setActiveCase(i)}
          >
            Case {i + 1}
          </button>
        ))}
        {testCases.length > 3 && (
          <span className="tc-viewer__hidden">+{testCases.length - 3} hidden</span>
        )}
      </div>
      <div className="tc-viewer__body">
        {tc.description && (
          <div className="tc-viewer__row">
            <span className="tc-viewer__label">Description</span>
            <div className="tc-viewer__value">{tc.description}</div>
          </div>
        )}
        <div className="tc-viewer__row">
          <span className="tc-viewer__label">Input</span>
          <pre className="tc-viewer__pre">
            {tc.input && tc.input.trim() ? tc.input : 'Uses default table data'}
          </pre>
        </div>
        {tc.expectedOutput && (
          <div className="tc-viewer__row">
            <span className="tc-viewer__label">Expected Output</span>
            <pre className="tc-viewer__pre">
              {typeof tc.expectedOutput.value === 'object'
                ? JSON.stringify(tc.expectedOutput.value, null, 2)
                : String(tc.expectedOutput.value || '')}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Editorial tips generator ─────────────────────────────────
function getEditorialTips(assignment) {
  const q = ((assignment?.question || '') + ' ' + (assignment?.description || '')).toUpperCase();
  const tips = [];
  if (q.includes('JOIN')) tips.push('Use JOIN to combine rows from two or more tables based on a related column.');
  if (q.includes('GROUP BY')) tips.push('GROUP BY groups rows sharing a property so aggregate functions can be applied.');
  if (q.includes('HAVING')) tips.push('HAVING filters groups after aggregation — use WHERE for row-level filters.');
  if (q.includes('ORDER')) tips.push('ORDER BY sorts results. Use DESC for descending, ASC (default) for ascending.');
  if (q.includes('SUBQUERY') || q.includes('IN (')) tips.push('Subqueries let you nest a query inside another — useful for filtering with aggregates.');
  if (q.includes('WINDOW') || q.includes('OVER')) tips.push('Window functions (RANK, ROW_NUMBER, LEAD, LAG) operate over a set of rows without collapsing them.');
  if (q.includes('DISTINCT')) tips.push('DISTINCT removes duplicate rows from the result set.');
  if (q.includes('COUNT') || q.includes('SUM') || q.includes('AVG')) tips.push('Aggregate functions (COUNT, SUM, AVG, MIN, MAX) compute a value from a set of rows.');
  if (tips.length === 0) tips.push('Start with SELECT to choose which columns to return.', 'Use WHERE to filter rows by condition.', 'Use aliases (AS) to rename columns for clarity.');
  return tips;
}

// \u2550\u2550 ChatPanel \u2013 Discussion / Solutions chat-style UI \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function ChatPanel({ posts = [], loading, onPost, postBody, setPostBody, posting, onLike, user, type }) {
  const bottomRef = useRef(null);
  const textRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts.length]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (postBody.trim()) onPost();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-panel__msgs">
        {loading && (
          <div className="chat-panel__loading">
            <span className="chat-panel__spinner" />
            Loading...
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div className="chat-panel__empty">
            <div className="chat-panel__empty-icon">
              {type === 'solution' ? '📝' : '💬'}
            </div>
            <p>{type === 'solution'
              ? 'No solutions yet. Be the first to share yours!'
              : 'No discussions yet. Start the conversation!'}</p>
          </div>
        )}
        {posts.map((post, i) => {
          const authorName = post.username || post.author || 'Anonymous';
          const isOwn = user && (post.userId === user.id || authorName === user.username);
          const initials = authorName.slice(0, 2).toUpperCase();
          return (
            <div key={post._id || i} className={`chat-msg ${isOwn ? 'chat-msg--own' : ''}`}>
              {/* Avatar */}
              {!isOwn && (
                <div className="chat-msg__avatar">{initials}</div>
              )}
              <div className="chat-msg__content">
                {!isOwn && (
                  <div className="chat-msg__meta">
                    <span className="chat-msg__author">{authorName}</span>
                    <span className="chat-msg__time">{formatTime(post.createdAt)}</span>
                  </div>
                )}
                <div className="chat-msg__bubble">
                  {type === 'solution' && post.code ? (
                    <>
                      {post.body && <p className="chat-msg__text">{post.body}</p>}
                      <pre className="chat-msg__code">{post.code}</pre>
                    </>
                  ) : (
                    <p className="chat-msg__text">{post.body || post.content}</p>
                  )}
                  {isOwn && (
                    <div className="chat-msg__own-meta">
                      <span className="chat-msg__time">{formatTime(post.createdAt)}</span>
                    </div>
                  )}
                </div>
                {/* Like / Dislike row - pinned under the bubble */}
                <div className="chat-msg__actions">
                  <button
                    className={`chat-msg__like ${post.likedByMe ? 'chat-msg__like--active' : ''}`}
                    onClick={() => onLike(post._id)}
                    title="Like"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                    </svg>
                    <span>{post.likes || 0}</span>
                  </button>
                  <button
                    className="chat-msg__dislike"
                    title="Dislike"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
                      <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                    </svg>
                  </button>
                  <button className="chat-msg__reply" title="Reply">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10h10a4 4 0 014 4v1M3 10l4-4M3 10l4 4" />
                    </svg>
                    Reply
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Fixed composer at bottom */}
      <div className="chat-panel__composer">
        <div className="chat-panel__composer-avatar">
          {(user?.username || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="chat-panel__composer-input-wrap">
          <textarea
            ref={textRef}
            className="chat-panel__composer-input"
            placeholder={type === 'solution'
              ? 'Share your SQL solution... (Enter to post)'
              : 'Write a comment... (Enter to post)'}
            value={postBody}
            onChange={e => {
              setPostBody(e.target.value);
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKey}
            rows={1}
          />
          {type === 'solution' && postBody.trim() && !postBody.includes('\n') && (
            <div className="chat-panel__composer-hint">💡 Include your SQL query above</div>
          )}
        </div>
        <button
          className={`chat-panel__composer-btn ${posting ? 'chat-panel__composer-btn--loading' : ''}`}
          onClick={onPost}
          disabled={posting || !postBody.trim()}
          title="Post (Ctrl+Enter)"
        >
          {posting ? (
            <span className="chat-panel__spinner chat-panel__spinner--sm" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function AssignmentAttempt() {

  const { id } = useParams();
  const navigate = useNavigate();
  console.log('[AssignmentAttempt] Rendering with id from useParams:', id);
  const [assignment, setAssignment] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [testTab, setTestTab] = useState('testcase');
  const [submissions, setSubmissions] = useState([]);
  const [editorTheme, setEditorTheme] = useState(() => {
    return localStorage.getItem('editorTheme') || 'vs';
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const { registerExecute, registerSubmit } = useQuery();
  const { setAssignmentsList, setCurrentAssignmentIndex, assignments: navAssignments } = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const editorRef = useRef(null);
  const queryRef = useRef(query);
  const setAssignmentsListRef = useRef(setAssignmentsList);
  const setIdxRef = useRef(setCurrentAssignmentIndex);
  const [cursorInfo, setCursorInfo] = useState('Ln 1, Col 1');

  // Use authenticated user ID if available, otherwise use anonymous session ID
  const [userId] = useState(() => {
    if (isAuthenticated && user?.id) {
      return user.id;
    }
    return localStorage.getItem('userId') || `user_${Date.now()}`;
  });

  // Update userId when authentication state changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // User is authenticated, use their ID
      // Note: userId state won't update automatically, but API calls will use token
      // For localStorage operations, we can use user.id directly
    } else {
      // User is not authenticated, keep using session-based ID
      localStorage.setItem('userId', userId);
    }
  }, [isAuthenticated, user, userId]);
  const [isResizing, setIsResizing] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() => {
    const saved = localStorage.getItem('editorHeight');
    return saved ? parseFloat(saved) : 60; // Default 60%
  });
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // ── Discussion / Solutions state ────────────────────────────
  const [discussions, setDiscussions] = useState([]);
  const [discussLoading, setDiscussLoading] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [solBody, setSolBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [engagementStats, setEngagementStats] = useState({ likes: 0, discussions: 0 });

  const loadDiscussions = useCallback(async () => {
    if (!id) return;
    setDiscussLoading(true);
    try {
      const [discRes, statsRes] = await Promise.allSettled([
        getDiscussions(id),
        getEngagementStats(id),
      ]);
      if (discRes.status === 'fulfilled') setDiscussions(discRes.value.data?.posts || []);
      if (statsRes.status === 'fulfilled') setEngagementStats(statsRes.value.data || {});
    } catch { }
    finally { setDiscussLoading(false); }
  }, [id]);

  useEffect(() => { loadDiscussions(); }, [loadDiscussions]);

  const handlePostDiscussion = async () => {
    if (!postBody.trim()) return;
    setPosting(true);
    try {
      await createPost(id, { body: postBody, type: 'discuss' });
      setPostBody('');
      await loadDiscussions();
    } catch (err) {
      console.error('Failed to post discussion:', err);
      alert('Failed to post comment. Is the server connected to MongoDB?');
    }
    finally { setPosting(false); }
  };

  const handlePostSolution = async () => {
    if (!solBody.trim()) return;
    setPosting(true);
    try {
      await createPost(id, { body: solBody, type: 'solution', language: 'sql' });
      setSolBody('');
      await loadDiscussions();
    } catch (err) {
      console.error('Failed to post solution:', err);
      alert('Failed to post solution. Is the server connected to MongoDB?');
    }
    finally { setPosting(false); }
  };

  const handleLike = async (postId) => {
    try {
      const res = await likePost(id, postId);
      setDiscussions(prev => prev.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
      setEngagementStats(prev => ({ ...prev, likes: (prev.likes || 0) + (res.data.liked ? 1 : -1) }));
    } catch { }
  };


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  console.log('[DEBUG] AssignmentAttempt Render - id:', id);


  useEffect(() => {
    // Register execute and submit with the latest handlers via refs
    console.log('[DEBUG] Registering handlers to QueryContext');
    registerExecute(() => handleExecuteRef.current());
    registerSubmit(() => handleSubmitRef.current());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerExecute, registerSubmit]);

  const fetchAllAssignments = useCallback(async () => {

    // Only fetch if navigation context is empty (avoid redundant re-fetches)
    if (navAssignments && navAssignments.length > 0) {
      const currentIdx = navAssignments.findIndex(a => String(a._id) === String(id));
      if (currentIdx >= 0) setIdxRef.current(currentIdx);
      return;
    }
    try {
      const response = await getAssignments();
      const assignmentsList = response.data;
      setAssignmentsListRef.current(assignmentsList);
      const currentIdx = assignmentsList.findIndex(a => String(a._id) === String(id));
      if (currentIdx >= 0) {
        setIdxRef.current(currentIdx);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  }, [id, navAssignments]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await getAssignmentProgress(id, userId);
      // Get submissions from localStorage
      let allSubmissions = JSON.parse(localStorage.getItem(`submissions_${id}_${userId}`) || '[]');

      // If backend has lastSubmission, add it to the list if not already present
      if (response.data && response.data.lastSubmission) {
        const backendSubmission = response.data.lastSubmission;
        const backendSubmissionId = backendSubmission.submittedAt || backendSubmission.timestamp;

        // Check if this submission already exists in localStorage
        const exists = allSubmissions.some(sub => {
          const subTime = new Date(sub.timestamp).getTime();
          const backendTime = new Date(backendSubmissionId).getTime();
          return Math.abs(subTime - backendTime) < 1000; // Within 1 second
        });

        if (!exists && backendSubmissionId) {
          // Add backend submission to the list
          allSubmissions.unshift({
            id: new Date(backendSubmissionId).getTime(),
            query: backendSubmission.query || '',
            timestamp: new Date(backendSubmissionId).toISOString(),
            passed: backendSubmission.passed || false,
            success: backendSubmission.passed || false,
            testResults: backendSubmission.testResults || [],
            complexity: backendSubmission.complexity || {},
            rowCount: backendSubmission.rowCount || 0,
            result: backendSubmission.result || []
          });
        }
      }

      // Sort by timestamp (newest first)
      allSubmissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setSubmissions(allSubmissions);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      // Fallback to localStorage only
      const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${id}_${userId}`) || '[]');
      setSubmissions(allSubmissions);
    }
  }, [id, userId]);

  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('editorTheme', editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleEditorTheme = () => {
    setEditorTheme(prev => prev === 'vs' ? 'vs-dark' : 'vs');
  };

  const fetchAssignment = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setAssignment(null); // Clear previous assignment
      const response = await getAssignment(id);
      const assignmentData = response.data;
      console.log('Assignment loaded:', assignmentData?.title, 'ID:', id);
      setAssignment(assignmentData);
      setError(null);
    } catch (err) {
      setError('Failed to load assignment. Please try again later.');
      console.error('Error fetching assignment:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await getAssignmentProgress(id, userId);
      if (response.data.sqlQuery) {
        setQuery(response.data.sqlQuery);
        queryRef.current = response.data.sqlQuery;
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, [id, userId]);

  useEffect(() => {
    // Reset state when assignment changes
    console.log('[AssignmentAttempt] useEffect triggered with id:', id, 'URL:', window.location.pathname);
    setAssignment(null);
    setQuery('');
    setResults(null);
    setError(null);
    setHint(null);
    setSubmissionResult(null);
    setActiveTab('description');
    setTestTab('testcase');

    // Check server health on mount
    checkServerHealth().catch(err => {
      console.warn('Server health check failed:', err);
      // Don't show error to user, just log it
    });

    fetchAllAssignments();
    fetchAssignment();
    fetchProgress();
    fetchSubmissions();
  }, [id, fetchAllAssignments, fetchAssignment, fetchProgress, fetchSubmissions]);

  const handleExecute = async () => {
    const currentQuery = queryRef.current;
    if (!currentQuery.trim()) {
      setError('Please enter a SQL query');
      setTestTab('testcase');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults(null);
      setTestTab('testcase');

      const response = await executeQuery(id, currentQuery);

      if (response.data.success) {
        setResults({
          rows: response.data.rows,
          rowCount: response.data.rowCount,
          columns: response.data.columns
        });
        setTestTab('testresult');
      } else {
        setError(response.data.error || 'Query execution failed');
        setTestTab('testresult');
      }

      await saveAssignmentProgress(id, { sqlQuery: currentQuery }, userId);
    } catch (err) {
      let errorMessage = 'Failed to execute query';

      if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running on port 5000.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. The query is taking too long to execute.';
        } else {
          errorMessage = err.message;
        }
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      }

      setError(errorMessage);
      setTestTab('testresult');
      console.error('Error executing query:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keep a ref so the registered handler always calls the latest version
  const handleExecuteRef = useRef(handleExecute);
  handleExecuteRef.current = handleExecute;

  const handleGetHint = async () => {
    try {
      setHintLoading(true);
      setHint(null);
      setError(null);
      const response = await getHint(id, query);
      if (response.data && response.data.hint) {
        setHint(response.data.hint);
        setShowHintModal(true);
      } else {
        setError('No hint available for this problem.');
      }
    } catch (err) {
      let errorMessage = 'Failed to get hint.';
      if (err.userMessage) errorMessage = err.userMessage;
      else if (err.response?.data?.error) errorMessage = err.response.data.error;
      else if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message?.includes('Network Error') || err.message?.includes('ECONNREFUSED'))
        errorMessage = 'Cannot connect to server.';
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
      console.error('Error getting hint:', err);
    } finally {
      setHintLoading(false);
    }
  };

  const handleSubmit = async () => {
    const currentQuery = queryRef.current;
    if (!currentQuery.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSubmissionResult(null);
      setResults(null);

      // Use authenticated user ID if available, otherwise use session-based userId
      const submitUserId = (isAuthenticated && user?.id) ? user.id : userId;
      const response = await submitQuery(id, currentQuery, submitUserId);

      // Handle both success and failure responses
      const submissionData = response.data || {};
      setSubmissionResult({
        passed: submissionData.passed || false,
        testResults: submissionData.testResults || [],
        complexity: submissionData.complexity || {},
        result: submissionData.result,
        rowCount: submissionData.rowCount,
        error: submissionData.error,
        // LeetCode-style stats
        runtime: submissionData.runtime || { ms: 0, beats: 0, distribution: [] },
        memory: submissionData.memory || { mb: 0, beats: 0, distribution: [] },
        submittedAt: submissionData.submittedAt || new Date().toISOString(),
        totalTestCases: submissionData.totalTestCases || (submissionData.testResults || []).length,
        passedTestCases: submissionData.passedTestCases || (submissionData.testResults || []).filter(t => t.passed).length
      });

      // Always show submission dialog (for both pass and fail)
      setShowSubmissionDialog(true);
      setActiveTab('description');

      if (submissionData.passed) {
        // Mark today as solved → updates streak badge + calendar in real-time
        try {
          const today = new Date().toISOString().slice(0, 10);
          const solvedDays = JSON.parse(localStorage.getItem('solvedDays') || '{}');
          solvedDays[today] = (solvedDays[today] || 0) + 1;
          localStorage.setItem('solvedDays', JSON.stringify(solvedDays));
        } catch { }
        // Dispatch event so streak badge and heatmap update instantly
        window.dispatchEvent(new CustomEvent('problem-solved', { detail: { id } }));
      }
      setTestTab('testresult');

      // Save submission to local storage
      const submission = {
        id: Date.now(),
        query: currentQuery,
        timestamp: new Date().toISOString(),
        passed: submissionData.passed || false,
        success: submissionData.passed || false,
        testResults: submissionData.testResults || [],
        complexity: submissionData.complexity || {},
        rowCount: submissionData.rowCount || 0,
        result: submissionData.result || [],
        runtime: submissionData.runtime,
        memory: submissionData.memory
      };
      const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${id}_${userId}`) || '[]');
      allSubmissions.unshift(submission);
      if (allSubmissions.length > 50) allSubmissions.pop();
      localStorage.setItem(`submissions_${id}_${userId}`, JSON.stringify(allSubmissions));
      setSubmissions(allSubmissions);
    } catch (err) {
      let errorMessage = 'Failed to submit query';

      if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.errors?.[0]?.msg) {
        errorMessage = err.response.data.errors[0].msg;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running on port 5000.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Request timed out. The submission is taking too long.';
        } else {
          errorMessage = err.message;
        }
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
      }

      setError(errorMessage);
      setSubmissionResult({
        passed: false,
        error: errorMessage,
        testResults: []
      });
      setTestTab('testresult');
      console.error('Error submitting query:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Keep a ref so the registered handler always calls the latest version
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleQueryChange = (value) => {
    const newVal = value || '';
    setQuery(newVal);
    queryRef.current = newVal;
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    // Track cursor position for status bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorInfo(`Ln ${e.position.lineNumber}, Col ${e.position.column}`);
    });
    // Register keyboard shortcut: Ctrl+Enter = Run
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteRef.current();
    });
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation();
    // Prevent text selection during resize
    e.target.style.userSelect = 'none';
  };

  const handleVerticalMouseDown = (e) => {
    setIsResizingVertical(true);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      // Disable resizing on mobile
      if (window.innerWidth < 1024) return;

      const container = document.querySelector('.assignment-attempt__container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 15% and 85% to allow more flexibility
      const constrainedWidth = Math.max(15, Math.min(85, newWidth));
      localStorage.setItem('leftPanelWidth', constrainedWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingVertical) return;
      // Disable resizing on mobile
      if (window.innerWidth < 1024) return;

      const container = document.querySelector('.assignment-attempt__right-panel');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      // Calculate the percentage from the top of the right panel
      // Account for any hint banner at the top
      const hintBanner = container.querySelector('.assignment-attempt__hint-banner');
      const hintBannerHeight = hintBanner ? hintBanner.offsetHeight : 0;
      const mouseY = e.clientY - containerRect.top - hintBannerHeight;
      const availableHeight = containerRect.height - hintBannerHeight;
      const newHeight = (mouseY / availableHeight) * 100;

      // Constrain between 25% and 85% to allow more flexibility
      const constrainedHeight = Math.max(25, Math.min(85, newHeight));
      setEditorHeight(constrainedHeight);
      localStorage.setItem('editorHeight', constrainedHeight.toString());
    };

    const handleMouseUp = () => {
      setIsResizingVertical(false);
    };

    if (isResizingVertical) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingVertical]);

  if (loading && !assignment) {
    return (
      <div className="assignment-attempt">
        <div className="assignment-attempt__loading">Loading assignment...</div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="assignment-attempt">
        <div className="assignment-attempt__error">{error}</div>
        <button
          className="assignment-attempt__back-btn"
          onClick={() => navigate('/')}
        >
          Back to Assignments
        </button>
      </div>
    );
  }

  if (!assignment) return null;

  return (
    <div className="assignment-attempt">

      {/* ═══ LEETCODE-STYLE SUBMISSION RESULT ══════════════════ */}
      {showSubmissionDialog && submissionResult && (() => {
        const rt = submissionResult.runtime || { ms: 0, beats: 0, distribution: [] };
        const mem = submissionResult.memory || { mb: 0, beats: 0, distribution: [] };
        const passedCount = submissionResult.passedTestCases || (submissionResult.testResults || []).filter(r => r.passed).length;
        const totalCount = submissionResult.totalTestCases || (submissionResult.testResults || []).length;
        const submittedTime = submissionResult.submittedAt ? new Date(submissionResult.submittedAt) : new Date();
        const timeStr = submittedTime.toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' +
          submittedTime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
        const userName = user?.username || 'user';

        // SVG bar chart renderer
        const DistributionChart = ({ data, unit, userValue, label }) => {
          if (!data || data.length === 0) return null;
          const chartW = 560, chartH = 160, barW = 8, gap = 2;
          const maxPct = Math.max(...data.map(d => d.percentage), 1);
          const totalBars = data.length;
          const totalWidth = totalBars * (barW + gap);
          const xScale = chartW / totalWidth;

          return (
            <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} className="lc-chart" preserveAspectRatio="xMidYMid meet">
              {/* Y axis labels */}
              {[0, 20, 40, 60].map(v => {
                const y = chartH - (v / 60) * chartH;
                return (
                  <g key={v}>
                    <line x1="0" y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                    <text x="-4" y={y + 3} fill="#555" fontSize="9" textAnchor="end">{v}%</text>
                  </g>
                );
              })}
              {/* Bars */}
              {data.map((d, i) => {
                const barH = Math.max(1, (d.percentage / maxPct) * (chartH - 10));
                const x = i * (barW + gap) * xScale;
                const y = chartH - barH;
                const isUser = d.isUser;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={barW * xScale}
                    height={barH}
                    rx={1}
                    fill={isUser ? '#ffa116' : 'rgba(90,160,255,0.7)'}
                    className={isUser ? 'lc-chart__bar--user' : ''}
                  />
                );
              })}
              {/* X axis labels */}
              {[0, 10, 20, 30, 40, 50].map((v, i) => {
                const x = (v / totalBars) * chartW;
                return (
                  <text key={i} x={x} y={chartH + 16} fill="#555" fontSize="9" textAnchor="middle">
                    {v}{unit}
                  </text>
                );
              })}
              {/* User indicator tooltip */}
              {(() => {
                const userIdx = data.findIndex(d => d.isUser);
                if (userIdx >= 0) {
                  const x = userIdx * (barW + gap) * xScale + (barW * xScale) / 2;
                  return (
                    <g>
                      <circle cx={x} cy={chartH - ((data[userIdx].percentage / maxPct) * (chartH - 10)) - 12} r="10" fill="#2a2a2a" stroke="#ffa116" strokeWidth="1.5" />
                      <text x={x} y={chartH - ((data[userIdx].percentage / maxPct) * (chartH - 10)) - 8} fill="#fff" fontSize="7" textAnchor="middle" fontWeight="700">👤</text>
                    </g>
                  );
                }
                return null;
              })()}
            </svg>
          );
        };

        return (
          <div className="submission-overlay" onClick={() => setShowSubmissionDialog(false)}>
            <div className="lc-submission" onClick={e => e.stopPropagation()}>

              {/* ── Top: Verdict + test info ─────────────────── */}
              <div className="lc-submission__header">
                <div className="lc-submission__verdict-row">
                  <h1 className={`lc-submission__verdict ${submissionResult.passed ? 'lc-submission__verdict--accepted' : 'lc-submission__verdict--failed'}`}>
                    {submissionResult.passed ? 'Accepted' : 'Wrong Answer'}
                  </h1>
                  <span className="lc-submission__test-count">
                    {passedCount} / {totalCount} testcases passed
                  </span>
                </div>
                <div className="lc-submission__user-row">
                  <div className="lc-submission__user-avatar">{userName.slice(0, 1).toUpperCase()}</div>
                  <span className="lc-submission__user-name">{userName}</span>
                  <span className="lc-submission__time">submitted at {timeStr}</span>
                </div>
                {/* Action buttons */}
                <div className="lc-submission__action-btns">
                  <button className="lc-submission__action-btn lc-submission__action-btn--editorial" onClick={() => { setShowSubmissionDialog(false); setActiveTab('editorial'); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                    Editorial
                  </button>
                  <button className="lc-submission__action-btn lc-submission__action-btn--solution" onClick={() => { setShowSubmissionDialog(false); setActiveTab('solutions'); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    Solution
                  </button>
                </div>
              </div>

              {submissionResult.passed && (
                <>
                  {/* ── Runtime + Memory Cards ──────────────────── */}
                  <div className="lc-submission__metrics">
                    {/* Runtime card */}
                    <div className="lc-submission__metric-card">
                      <div className="lc-submission__metric-header">
                        <span className="lc-submission__metric-icon">⏱</span>
                        <span className="lc-submission__metric-label">Runtime</span>
                        <span className="lc-submission__metric-info" title="Compared to other solutions">ⓘ</span>
                      </div>
                      <div className="lc-submission__metric-value-row">
                        <span className="lc-submission__metric-value">{rt.ms || submissionResult.complexity?.executionTime || 2}</span>
                        <span className="lc-submission__metric-unit">ms</span>
                        <span className="lc-submission__metric-separator">|</span>
                        <span className="lc-submission__metric-label2">Beats</span>
                        <span className="lc-submission__metric-beats">{rt.beats || 99}%</span>
                        <span className="lc-submission__metric-fire">🔥</span>
                      </div>
                      <div className="lc-submission__metric-sub">
                        <span className="lc-submission__analyze-link">✨ Analyze Complexity</span>
                      </div>
                    </div>

                    {/* Memory card */}
                    <div className="lc-submission__metric-card">
                      <div className="lc-submission__metric-header">
                        <span className="lc-submission__metric-icon">💾</span>
                        <span className="lc-submission__metric-label">Memory</span>
                      </div>
                      <div className="lc-submission__metric-value-row">
                        <span className="lc-submission__metric-value">{mem.mb || submissionResult.complexity?.memoryUsage || 47}</span>
                        <span className="lc-submission__metric-unit">MB</span>
                        <span className="lc-submission__metric-separator">|</span>
                        <span className="lc-submission__metric-label2">Beats</span>
                        <span className="lc-submission__metric-beats">{mem.beats || 84}%</span>
                        <span className="lc-submission__metric-fire">🔥</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Distribution Charts ─────────────────────── */}
                  <div className="lc-submission__charts">
                    <div className="lc-submission__chart-section">
                      <DistributionChart data={rt.distribution} unit="ms" userValue={rt.ms} label="Runtime" />
                      <div className="lc-submission__chart-tooltip">
                        {rt.beats ? `${(100 - rt.beats).toFixed(2)}% of solutions used ${rt.ms} ms of runtime` : ''}
                      </div>
                    </div>
                    <div className="lc-submission__chart-section">
                      <DistributionChart data={mem.distribution} unit="ms" userValue={mem.mb} label="Memory" />
                    </div>
                  </div>
                </>
              )}

              {/* ── Failed: error + test details ────────────── */}
              {!submissionResult.passed && (
                <div className="lc-submission__fail-details">
                  {submissionResult.error && (
                    <div className="lc-submission__error-block">
                      <div className="lc-submission__error-label">Error</div>
                      <pre className="lc-submission__error-msg">{submissionResult.error}</pre>
                    </div>
                  )}
                  {submissionResult.testResults && submissionResult.testResults.length > 0 && (
                    <div className="lc-submission__cases">
                      <div className="lc-submission__cases-grid">
                        {submissionResult.testResults.map((r, i) => (
                          <div key={i} className={`lc-submission__case ${r.passed ? 'lc-submission__case--pass' : 'lc-submission__case--fail'}`}>
                            <span>{r.passed ? '✓' : '✗'}</span>
                            <span>Case {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bottom bar ──────────────────────────────── */}
              <div className="lc-submission__footer">
                <button className="lc-submission__footer-btn" onClick={() => setShowSubmissionDialog(false)}>
                  ← Back to Problem
                </button>
                {submissionResult.passed && (
                  <button className="lc-submission__footer-btn lc-submission__footer-btn--next" onClick={() => { setShowSubmissionDialog(false); navigate('/'); }}>
                    Next Problem →
                  </button>
                )}
                {!submissionResult.passed && (
                  <button className="lc-submission__footer-btn lc-submission__footer-btn--retry" onClick={() => setShowSubmissionDialog(false)}>
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="assignment-attempt__container">
        {/* Left Panel - Problem Description */}
        <div
          className="assignment-attempt__left-panel"
        >
          <div className="problem-panel">
            {/* Tabs */}
            <div className="problem-panel__tabs">
              <button className={`problem-panel__tab ${activeTab === 'description' ? 'problem-panel__tab--active' : ''}`} onClick={() => setActiveTab('description')}>Description</button>
              <button className={`problem-panel__tab ${activeTab === 'editorial' ? 'problem-panel__tab--active' : ''}`} onClick={() => setActiveTab('editorial')}>Editorial</button>
              <button className={`problem-panel__tab ${activeTab === 'solutions' ? 'problem-panel__tab--active' : ''}`} onClick={() => setActiveTab('solutions')}>Solutions</button>
              <button className={`problem-panel__tab ${activeTab === 'discuss' ? 'problem-panel__tab--active' : ''}`} onClick={() => { setActiveTab('discuss'); loadDiscussions(); }}>Discuss</button>
              <button className={`problem-panel__tab ${activeTab === 'submissions' ? 'problem-panel__tab--active' : ''}`} onClick={() => setActiveTab('submissions')}>Submissions</button>
            </div>

            {/* Tab Content */}
            <div className="problem-panel__content">
              {activeTab === 'description' && (
                <div className="problem-panel__description">
                  {/* Scrollable content area only */}
                  <div className="problem-panel__description-scroll">
                    <div className="problem-panel__header">
                      <h2 className="problem-panel__title">{assignment.title}</h2>
                      <span className={`problem-panel__difficulty problem-panel__difficulty--${assignment.difficulty.toLowerCase()}`}>{assignment.difficulty}</span>
                    </div>
                    <div className="problem-panel__tags">
                      <button className="problem-panel__tag-btn">Topics</button>
                      <button className="problem-panel__tag-btn">Companies</button>
                    </div>
                    <div className="problem-panel__question">
                      <p>{assignment.question}</p>
                      {assignment.description && <p className="problem-panel__description-text">{assignment.description}</p>}
                    </div>
                    {/* Schema */}
                    <div className="problem-panel__schema">
                      <div className="problem-panel__schema-header">
                        <button className="problem-panel__schema-tab problem-panel__schema-tab--active">SQL Schema</button>
                      </div>
                      <SchemaViewer tables={assignment.sampleTables} />
                    </div>
                    {/* Engagement - Moved OUTSIDE scrollable area below */}
                  </div>
                  {/* Fixed bottom engagement bar */}
                  <div className="problem-panel__engagement">
                    <div className="problem-panel__engagement-item" title="Likes">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                      </svg>
                      <span>{engagementStats.likes > 999 ? (engagementStats.likes / 1000).toFixed(1) + 'K' : (engagementStats.likes || 0)}</span>
                    </div>
                    <div className="problem-panel__engagement-item" title="Discussions">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      <span>{engagementStats.discussions || 0}</span>
                    </div>
                  </div>
                </div>
              )}




              {activeTab === 'editorial' && (
                <div className="problem-panel__editorial">
                  <h3>Editorial</h3>
                  <div className="editorial-content">
                    <div className="editorial-section">
                      <h4>📌 Approach</h4>
                      <p>{assignment.editorialApproach || `This problem requires you to write a SQL query to ${(assignment.question || '').toLowerCase().replace(/write a sql query to /i, '').slice(0, 120) || 'retrieve data from the database'}.`}</p>
                    </div>
                    <div className="editorial-section">
                      <h4>💡 Key Concepts</h4>
                      <ul>
                        {getEditorialTips(assignment).map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    </div>
                    <div className="editorial-section">
                      <h4>⚡ Algorithm</h4>
                      <ol>
                        <li>Identify all required tables from the schema</li>
                        <li>Determine the columns you need to SELECT</li>
                        <li>Apply appropriate JOINs if multiple tables are involved</li>
                        <li>Add WHERE / HAVING clauses to filter results</li>
                        <li>Use ORDER BY / GROUP BY as needed</li>
                      </ol>
                    </div>
                    <div className="editorial-section editorial-section--complexity">
                      <h4>⏱ Complexity</h4>
                      <div className="complexity-badges">
                        <span className="complexity-badge complexity-badge--time">Time: O(n)</span>
                        <span className="complexity-badge complexity-badge--space">Space: O(n)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'solutions' && (
                <ChatPanel
                  posts={discussions.filter(p => p.type === 'solution')}
                  loading={discussLoading}
                  onPost={handlePostSolution}
                  postBody={solBody}
                  setPostBody={setSolBody}
                  posting={posting}
                  onLike={handleLike}
                  user={user}
                  type="solution"
                />
              )}

              {/* Discuss tab - chat style */}
              {activeTab === 'discuss' && (
                <ChatPanel
                  posts={discussions.filter(p => p.type !== 'solution')}
                  loading={discussLoading}
                  onPost={handlePostDiscussion}
                  postBody={postBody}
                  setPostBody={setPostBody}
                  posting={posting}
                  onLike={handleLike}
                  user={user}
                  type="discuss"
                />
              )}

              {activeTab === 'submissions' && (
                <div className="problem-panel__submissions">
                  <h3>Submissions</h3>
                  {submissions.length === 0 ? (
                    <p className="problem-panel__submissions-empty">No submissions yet. Run your query to see submissions here.</p>
                  ) : (
                    <div className="problem-panel__submissions-list">
                      {submissions.map((submission) => {
                        const isPassed = submission.passed || submission.success;
                        const testResults = submission.testResults || [];
                        const passedTests = testResults.filter(t => t.passed).length;
                        const totalTests = testResults.length;
                        return (
                          <div key={submission.id} className="problem-panel__submission-item">
                            <div className="problem-panel__submission-header">
                              <span className={`problem-panel__submission-status ${isPassed ? 'problem-panel__submission-status--success' : 'problem-panel__submission-status--error'}`}>
                                {isPassed ? '✓ Accepted' : '✗ Wrong Answer'}
                              </span>
                              <span className="problem-panel__submission-time">{new Date(submission.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="problem-panel__submission-query"><code>{submission.query}</code></div>
                            {testResults.length > 0 && (
                              <div className="problem-panel__submission-test-results">
                                <div className="problem-panel__submission-test-summary">
                                  <strong>Tests:</strong> {passedTests}/{totalTests} passed
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="assignment-attempt__resize-handle"
          onMouseDown={handleMouseDown}
        >
          <div className="assignment-attempt__resize-handle-line"></div>
        </div>

        {/* Right Panel - Code Editor */}
        <div
          className="assignment-attempt__right-panel"
        >
          {/* Hint is rendered at top level via portal-style fixed overlay — see bottom of component */}

          <div
            className="editor-panel"
            style={{
              height: isMobile ? '50%' : `${editorHeight}%`,
              flexShrink: 0
            }}
          >
            <div className="editor-panel__header">
              <div className="editor-panel__title">Code</div>
              <div className="editor-panel__header-right">
                <button
                  className="editor-panel__theme-toggle"
                  onClick={toggleEditorTheme}
                  title={editorTheme === 'vs' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    {editorTheme === 'vs' ? (
                      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
                    ) : (
                      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
                    )}
                  </svg>
                  <span>{editorTheme === 'vs' ? 'Dark' : 'Light'}</span>
                </button>
                <button
                  className="editor-panel__hint-btn"
                  onClick={handleGetHint}
                  disabled={hintLoading}
                  title="Get Hint"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-4H7V5h2v4z" />
                  </svg>
                  <span>{hintLoading ? 'Loading...' : 'Hint'}</span>
                </button>
                <button
                  className="editor-panel__fullscreen-btn"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isFullscreen ? (
                      <>
                        <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                        <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                        <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                        <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                      </>
                    ) : (
                      <>
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                      </>
                    )}
                  </svg>
                  <span>{isFullscreen ? 'Exit' : 'Full'}</span>
                </button>
                <div className="editor-panel__language">
                  <select className="editor-panel__language-select">
                    <option value="sql">MySQL</option>
                  </select>
                  <label className="editor-panel__auto-toggle">
                    <input type="checkbox" defaultChecked />
                    <span>Auto</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="editor-panel__editor">
              <Editor
                height="100%"
                defaultLanguage="sql"
                language="sql"
                value={query !== undefined ? query : '-- Write your SQL query here\nSELECT '}
                onChange={handleQueryChange}
                onMount={handleEditorDidMount}
                theme={editorTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: window.innerWidth < 768 ? 12 : 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  overviewRulerLanes: 0,
                  hideCursorInOverviewRuler: true,
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                  },
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  wordBasedSuggestions: 'allDocuments',
                  formatOnPaste: false,
                  formatOnType: false,
                  autoIndent: 'full',
                  bracketPairColorization: { enabled: true },
                  folding: true,
                  foldingStrategy: 'auto',
                  showFoldingControls: 'always',
                  renderWhitespace: 'selection',
                  renderLineHighlight: 'all',
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  suggestSelection: 'first',
                  snippetSuggestions: 'top'
                }}
                loading={<div style={{ padding: '20px', textAlign: 'center', color: '#8c8c8c' }}>Loading SQL Editor...</div>}
              />
            </div>

            <div className="editor-panel__status">
              <span className="editor-panel__status-text">MySQL · Saved</span>
              <span className="editor-panel__cursor-info">{cursorInfo}</span>
            </div>
          </div>

          {/* Vertical Resize Handle */}
          <div
            className="assignment-attempt__vertical-resize-handle"
            onMouseDown={handleVerticalMouseDown}
          >
            <div className="assignment-attempt__vertical-resize-handle-line"></div>
          </div>

          {/* Test Results Panel */}
          <div
            className="test-panel"
            style={{
              height: isMobile ? '50%' : `${100 - editorHeight}%`,
              flexShrink: 0
            }}
          >
            <div className="test-panel__tabs">
              <button
                className={`test-panel__tab ${testTab === 'testcase' ? 'test-panel__tab--active' : ''}`}
                onClick={() => setTestTab('testcase')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0L10 5h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z" />
                </svg>
                Testcase
              </button>
              <button
                className={`test-panel__tab ${testTab === 'testresult' ? 'test-panel__tab--active' : ''}`}
                onClick={() => setTestTab('testresult')}
              >
                Test Result
              </button>
            </div>

            <div className="test-panel__content">
              {testTab === 'testcase' && (
                <div className="test-panel__testcase">
                  {assignment && assignment.testCases && Array.isArray(assignment.testCases) && assignment.testCases.length > 0 ? (
                    <TestCaseViewer testCases={assignment.testCases} />
                  ) : (
                    <div className="test-panel__no-testcases">
                      <p className="test-panel__message">No test cases available. Write your query and click Run to test.</p>
                    </div>
                  )}
                </div>
              )}

              {testTab === 'testresult' && (
                <div className="test-panel__result">
                  {(loading || submitting) && (
                    <div className="test-panel__running">
                      <div className="test-panel__running-spinner" />
                      <span>{submitting ? 'Evaluating your solution…' : 'Running query…'}</span>
                    </div>
                  )}

                  {!loading && !submitting && error && (
                    <div className="test-panel__compile-error">
                      <div className="test-panel__compile-error-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                        </svg>
                        Compile / Runtime Error
                      </div>
                      <pre className="test-panel__compile-error-body">{error}</pre>
                    </div>
                  )}

                  {!loading && !submitting && !error && submissionResult && (
                    <div className="test-panel__verdict">
                      {submissionResult.passed ? (
                        <>
                          <div className="test-panel__verdict-header test-panel__verdict-header--accepted">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                            Accepted
                          </div>
                          <div className="test-panel__verdict-meta">
                            <div className="test-panel__verdict-stat">
                              <span>Runtime</span>
                              <strong>{submissionResult.complexity?.time || '< 1ms'}</strong>
                            </div>
                            <div className="test-panel__verdict-stat">
                              <span>Memory</span>
                              <strong>{submissionResult.complexity?.space || '< 1 MB'}</strong>
                            </div>
                            <div className="test-panel__verdict-stat">
                              <span>Test Cases</span>
                              <strong className="test-panel__verdict-stat--green">
                                {(submissionResult.testResults || []).length} / {(submissionResult.testResults || []).length} passed
                              </strong>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="test-panel__verdict-header test-panel__verdict-header--failed">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                            Wrong Answer
                          </div>
                          {submissionResult.error && (
                            <pre className="test-panel__compile-error-body">{submissionResult.error}</pre>
                          )}
                          {submissionResult.testResults && submissionResult.testResults.length > 0 && (
                            <div className="test-panel__failed-cases">
                              {submissionResult.testResults.filter(r => !r.passed).slice(0, 3).map((r, i) => (
                                <div key={i} className="test-panel__failed-case">
                                  <div className="test-panel__failed-case-label">Case {i + 1} — Failed</div>
                                  {r.expected && <pre>Expected: {JSON.stringify(r.expected)}</pre>}
                                  {r.actual && <pre>Got: {JSON.stringify(r.actual)}</pre>}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {!loading && !submitting && !error && !submissionResult && results && (
                    <ResultsPanel results={results} loading={false} />
                  )}

                  {!loading && !submitting && !error && !submissionResult && !results && (
                    <p className="test-panel__message">Click <strong>Run</strong> to execute your query, or <strong>Submit</strong> to evaluate against all test cases.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FULL-PAGE BLUR HINT MODAL ══════════════════════ */}
      {showHintModal && hint && (
        <div className="hint-overlay" onClick={() => setShowHintModal(false)}>
          <div className="hint-card" onClick={e => e.stopPropagation()}>
            <div className="hint-card__glow" />
            <div className="hint-card__header">
              <div className="hint-card__icon-wrap">
                <span className="hint-card__icon">💡</span>
              </div>
              <div>
                <h3 className="hint-card__title">Hint</h3>
                <p className="hint-card__subtitle">Here's a nudge in the right direction</p>
              </div>
              <button className="hint-card__close" onClick={() => setShowHintModal(false)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="hint-card__body">
              <p>{hint}</p>
            </div>
            <div className="hint-card__footer">
              <button className="hint-card__btn" onClick={() => setShowHintModal(false)}>
                Got it, thanks! 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignmentAttempt;

