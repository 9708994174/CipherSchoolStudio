import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useQuery } from '../contexts/QueryContext';
import { useNavigation } from '../contexts/NavigationContext';
import { 
  getAssignment, 
  getAssignments,
  getAssignmentProgress, 
  saveAssignmentProgress,
  executeQuery,
  getHint,
  submitQuery
} from '../services/api';
import SchemaViewer from './SchemaViewer';
import ResultsPanel from './ResultsPanel';
import ComplexityGraph from './ComplexityGraph';
import './AssignmentAttempt.scss';

function AssignmentAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const { registerExecute, registerSubmit } = useQuery();
  const { setAssignmentsList, setCurrentAssignmentIndex } = useNavigation();
  const [userId] = useState(() => {
    return localStorage.getItem('userId') || `user_${Date.now()}`;
  });
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    // On mobile, use full width; on desktop, use saved or default
    if (window.innerWidth < 1024) {
      return 100; // Full width on mobile
    }
    const saved = localStorage.getItem('leftPanelWidth');
    return saved ? parseFloat(saved) : 50; // Default 50%
  });
  const [isResizing, setIsResizing] = useState(false);
  const [editorHeight, setEditorHeight] = useState(() => {
    const saved = localStorage.getItem('editorHeight');
    return saved ? parseFloat(saved) : 60; // Default 60%
  });
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAllAssignments();
    fetchAssignment();
    fetchProgress();
    fetchSubmissions();
  }, [id]);

  useEffect(() => {
    registerExecute(handleExecute);
    registerSubmit(handleSubmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, id, userId, registerExecute, registerSubmit]);

  const fetchAllAssignments = async () => {
    try {
      const response = await getAssignments();
      const assignmentsList = response.data;
      setAssignmentsList(assignmentsList);
      const currentIdx = assignmentsList.findIndex(a => a._id === id);
      if (currentIdx >= 0) {
        setCurrentAssignmentIndex(currentIdx);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await getAssignmentProgress(id, userId);
      // Store submissions in localStorage for now (can be enhanced with backend)
      const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${id}_${userId}`) || '[]');
      setSubmissions(allSubmissions);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

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

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await getAssignment(id);
      const assignmentData = response.data;
      console.log('Assignment loaded:', assignmentData?.title);
      console.log('Test cases array:', assignmentData?.testCases);
      console.log('Test cases length:', assignmentData?.testCases?.length);
      console.log('Is array?', Array.isArray(assignmentData?.testCases));
      setAssignment(assignmentData);
      setError(null);
    } catch (err) {
      setError('Failed to load assignment. Please try again later.');
      console.error('Error fetching assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await getAssignmentProgress(id, userId);
      if (response.data.sqlQuery) {
        setQuery(response.data.sqlQuery);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const handleExecute = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      setTestTab('testcase');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults(null);
      setTestTab('testcase');

      const response = await executeQuery(id, query);
      
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

      await saveAssignmentProgress(id, { sqlQuery: query }, userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
      setTestTab('testresult');
      console.error('Error executing query:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetHint = async () => {
    try {
      setHintLoading(true);
      setHint(null);
      setError(null); // Clear any previous errors
      const response = await getHint(id, query);
      if (response.data && response.data.hint) {
        setHint(response.data.hint);
      } else {
        setError('No hint available. Please try again.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to get hint. Please try again.';
      setError(errorMessage);
      setHint(null);
      console.error('Error getting hint:', err);
    } finally {
      setHintLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSubmissionResult(null);
      setResults(null);

      const response = await submitQuery(id, query, userId);
      
      // Handle both success and failure responses
      const submissionData = response.data || {};
      setSubmissionResult({
        passed: submissionData.passed || false,
        testResults: submissionData.testResults || [],
        complexity: submissionData.complexity || {},
        result: submissionData.result,
        rowCount: submissionData.rowCount,
        error: submissionData.error
      });
      // Show submission dialog with complexity graph
      if (submissionData.passed && submissionData.complexity) {
        setShowSubmissionDialog(true);
        setActiveTab('description');
      }
      setTestTab('testresult');
      
      // Save submission to local storage
      const submission = {
        id: Date.now(),
        query: query,
        timestamp: new Date().toISOString(),
        passed: submissionData.passed || false,
        testResults: submissionData.testResults || [],
        complexity: submissionData.complexity || {}
      };
      const allSubmissions = JSON.parse(localStorage.getItem(`submissions_${id}_${userId}`) || '[]');
      allSubmissions.unshift(submission);
      if (allSubmissions.length > 50) allSubmissions.pop();
      localStorage.setItem(`submissions_${id}_${userId}`, JSON.stringify(allSubmissions));
      setSubmissions(allSubmissions);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.errors?.[0]?.msg || 
                          err.message || 
                          'Failed to submit query';
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
    setQuery(value || '');
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleVerticalMouseDown = (e) => {
    setIsResizingVertical(true);
    e.preventDefault();
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
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newWidth));
      setLeftPanelWidth(constrainedWidth);
      localStorage.setItem('leftPanelWidth', constrainedWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
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
      const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      
      // Constrain between 30% and 80%
      const constrainedHeight = Math.max(30, Math.min(80, newHeight));
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
      <div className="assignment-attempt__container">
        {/* Left Panel - Problem Description */}
        <div 
          className="assignment-attempt__left-panel"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="problem-panel">
            {/* Tabs */}
            <div className="problem-panel__tabs">
              <button 
                className={`problem-panel__tab ${activeTab === 'description' ? 'problem-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button 
                className={`problem-panel__tab ${activeTab === 'editorial' ? 'problem-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('editorial')}
              >
                Editorial
              </button>
              <button 
                className={`problem-panel__tab ${activeTab === 'solutions' ? 'problem-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('solutions')}
              >
                Solutions
              </button>
              <button 
                className={`problem-panel__tab ${activeTab === 'submissions' ? 'problem-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('submissions')}
              >
                Submissions
              </button>
            </div>

            {/* Tab Content */}
            <div className="problem-panel__content">
              {activeTab === 'description' && (
                <div className="problem-panel__description">
                  <div className="problem-panel__header">
                    <h2 className="problem-panel__title">{assignment.title}</h2>
                    <span className={`problem-panel__difficulty problem-panel__difficulty--${assignment.difficulty.toLowerCase()}`}>
                      {assignment.difficulty}
                    </span>
                  </div>
                  
                  <div className="problem-panel__tags">
                    <button className="problem-panel__tag-btn">Topics</button>
                    <button className="problem-panel__tag-btn">Companies</button>
                  </div>

                  <div className="problem-panel__question">
                    <p>{assignment.question}</p>
                    {assignment.description && (
                      <p className="problem-panel__description-text">{assignment.description}</p>
                    )}
                  </div>

                  {/* Schema Display */}
                  <div className="problem-panel__schema">
                    <div className="problem-panel__schema-header">
                      <button className="problem-panel__schema-tab problem-panel__schema-tab--active">
                        SQL Schema
                      </button>
                      <button className="problem-panel__schema-tab">
                        Pandas Schema
                      </button>
                    </div>
                    <SchemaViewer tables={assignment.sampleTables} />
                  </div>

                  <div className="problem-panel__engagement">
                    <div className="problem-panel__engagement-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1l2.5 5.5L16 7.5l-4.5 4L13 16l-5-2.5L3 16l1.5-4.5L0 7.5l5.5-1L8 1z"/>
                      </svg>
                      <span>4.1K</span>
                    </div>
                    <div className="problem-panel__engagement-item">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      <span>156</span>
                    </div>
                    <div className="problem-panel__engagement-item">
                      <span>118 Online</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission Analysis Dialog - Shows as prompt after submission */}
              {showSubmissionDialog && submissionResult && submissionResult.passed && (
                <div className="problem-panel__submission-dialog">
                  <div className="problem-panel__submission-dialog-overlay" onClick={() => setShowSubmissionDialog(false)}></div>
                  <div className="problem-panel__submission-dialog-content">
                    <div className="problem-panel__submission-dialog-header">
                      <h3 className="problem-panel__submission-dialog-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Submission Analysis
                      </h3>
                      <button 
                        className="problem-panel__submission-dialog-close"
                        onClick={() => setShowSubmissionDialog(false)}
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                    <div className="problem-panel__submission-dialog-body">
                      <div className="problem-panel__submission-success-message">
                        <strong>All Tests Passed!</strong>
                        <p>Your solution has been accepted.</p>
                      </div>
                      {submissionResult.complexity && (
                        <div className="problem-panel__submission-complexity">
                          <ComplexityGraph 
                            complexity={submissionResult.complexity} 
                            testResults={submissionResult.testResults} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'editorial' && (
                <div className="problem-panel__editorial">
                  <h3>Editorial</h3>
                  <p>Editorial content will be available here.</p>
                </div>
              )}

              {activeTab === 'solutions' && (
                <div className="problem-panel__solutions">
                  <h3>Solutions</h3>
                  <p>Solutions will be available here.</p>
                </div>
              )}

              {activeTab === 'submissions' && (
                <div className="problem-panel__submissions">
                  <h3>Submissions</h3>
                  {submissions.length === 0 ? (
                    <p className="problem-panel__submissions-empty">No submissions yet. Run your query to see submissions here.</p>
                  ) : (
                    <div className="problem-panel__submissions-list">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="problem-panel__submission-item">
                          <div className="problem-panel__submission-header">
                            <span className={`problem-panel__submission-status ${submission.success ? 'problem-panel__submission-status--success' : 'problem-panel__submission-status--error'}`}>
                              {submission.success ? '✓ Accepted' : '✗ Error'}
                            </span>
                            <span className="problem-panel__submission-time">
                              {new Date(submission.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="problem-panel__submission-query">
                            <code>{submission.query}</code>
                          </div>
                          {submission.success && (
                            <div className="problem-panel__submission-info">
                              Rows returned: {submission.rowCount}
                            </div>
                          )}
                        </div>
                      ))}
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
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {/* Hint Banner at Top */}
          {hint && (
            <div className="assignment-attempt__hint-banner">
              <div className="assignment-attempt__hint-content">
                <div className="assignment-attempt__hint-icon">💡</div>
                <div className="assignment-attempt__hint-text">
                  <strong>Hint:</strong> {hint}
                </div>
              </div>
              <button 
                className="assignment-attempt__hint-close"
                onClick={() => setHint(null)}
                title="Close hint"
              >
                ×
              </button>
            </div>
          )}

          <div 
            className="editor-panel"
            style={{ 
              height: isMobile ? '50%' : `${editorHeight}%`
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
                      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                    ) : (
                      <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
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
                    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-4H7V5h2v4z"/>
                  </svg>
                  <span>{hintLoading ? 'Loading...' : 'Hint'}</span>
                </button>
                <button
                  className="editor-panel__fullscreen-btn"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    {isFullscreen ? (
                      <path d="M5.5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-3.146 3.147a.5.5 0 0 1-.708-.708L4.293 1H1.5a.5.5 0 0 1 0-1h4zm6.5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-3.146 3.147a.5.5 0 1 1-.708-.708L10.293 1H7.5a.5.5 0 0 1 0-1h4zm-10 6.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H1.707l3.146 3.146a.5.5 0 0 1-.708.708L1 8.707V11.5a.5.5 0 0 1-1 0v-4zm14 0a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-2.793l3.146 3.146a.5.5 0 0 1-.708.708L15 8.707V11.5a.5.5 0 0 1-1 0v-4z"/>
                    ) : (
                      <path d="M1.5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-3.146 3.147a.5.5 0 1 1-.708-.708L.293 1H.5a.5.5 0 0 1 0-1h-4zm14 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V1.707l-3.146 3.147a.5.5 0 1 1-.708-.708L14.293 1H14.5a.5.5 0 0 1 0-1h-4zm-14 14a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H1.707l3.146 3.146a.5.5 0 0 1-.708.708L1 14.293V11.5a.5.5 0 0 1-1 0v4zm14 0a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-2.793l3.146 3.146a.5.5 0 0 1-.708.708L15 14.293V11.5a.5.5 0 0 1-1 0v4z"/>
                    )}
                  </svg>
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
                value={query || '# Write your MySQL query statement below\n'}
                onChange={handleQueryChange}
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
                  hideCursorInOverviewRuler: true
                }}
              />
            </div>

            <div className="editor-panel__status">
              <span className="editor-panel__status-text">Saved</span>
              <span className="editor-panel__cursor-info">Ln 1, Col 1</span>
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
            style={{ height: `${100 - editorHeight}%` }}
          >
            <div className="test-panel__tabs">
              <button 
                className={`test-panel__tab ${testTab === 'testcase' ? 'test-panel__tab--active' : ''}`}
                onClick={() => setTestTab('testcase')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0L10 5h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z"/>
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
                    <div className="test-panel__testcases-list">
                      <h4 className="test-panel__testcases-title">
                        Test Cases ({assignment.testCases.length})
                        <span className="test-panel__testcases-preview">Showing first 3</span>
                      </h4>
                      <div className="test-panel__testcases-scroll">
                        {assignment.testCases.slice(0, 3).map((testCase, idx) => (
                        <div key={idx} className="test-panel__testcase-item">
                          <div className="test-panel__testcase-header">
                            <span className="test-panel__testcase-number">Test Case {idx + 1}</span>
                            <span className="test-panel__testcase-name">{testCase.name || `Test Case ${idx + 1}`}</span>
                          </div>
                          {testCase.description && (
                            <div className="test-panel__testcase-description">
                              <strong>Description:</strong> {testCase.description}
                            </div>
                          )}
                          <div className="test-panel__testcase-input">
                            <strong>Input:</strong>
                            {testCase.input && testCase.input.trim() ? (
                              <pre>{typeof testCase.input === 'string' ? testCase.input : JSON.stringify(testCase.input, null, 2)}</pre>
                            ) : (
                              <pre className="test-panel__testcase-empty">No specific input required - uses default table data</pre>
                            )}
                          </div>
                          {testCase.expectedOutput && (
                            <div className="test-panel__testcase-expected">
                              <strong>Expected Output:</strong>
                              <div className="test-panel__testcase-output-type">Type: {testCase.expectedOutput.type}</div>
                              {testCase.expectedOutput.value && (
                                <pre>{typeof testCase.expectedOutput.value === 'object' 
                                  ? JSON.stringify(testCase.expectedOutput.value, null, 2)
                                  : String(testCase.expectedOutput.value)}</pre>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {assignment.testCases.length > 3 && (
                        <div className="test-panel__testcases-more">
                          <p>+ {assignment.testCases.length - 3} more test cases (hidden until submission)</p>
                        </div>
                      )}
                      </div>
                    </div>
                  ) : (
                    <div className="test-panel__no-testcases">
                      <p className="test-panel__message">No test cases available for this assignment.</p>
                      <p className="test-panel__message">Run your query to see results, or submit to validate against expected output.</p>
                    </div>
                  )}
                </div>
              )}

              {testTab === 'testresult' && (
                <div className="test-panel__result">
                  {loading && (
                    <div className="test-panel__loading">Executing query...</div>
                  )}
                  {submitting && (
                    <div className="test-panel__loading">Submitting and validating...</div>
                  )}
                  {error && (
                    <div className="test-panel__error">
                      <strong>Error:</strong> {error}
                    </div>
                  )}
                  {submissionResult && (
                    <div className={`test-panel__submission-status ${submissionResult.passed ? 'test-panel__submission-status--passed' : 'test-panel__submission-status--failed'}`}>
                      <div className="test-panel__submission-message">
                        {submissionResult.passed ? (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <div>
                              <strong>All Tests Passed!</strong>
                              <p>Your solution has been accepted.</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            <div>
                              <strong>Some Tests Failed</strong>
                              <p>{submissionResult.error || 'Please review your solution and try again.'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {results && !error && !submissionResult && (
                    <ResultsPanel results={results} loading={false} />
                  )}
                  {!results && !error && !loading && !submissionResult && (
                    <p className="test-panel__message">No results yet. Run your query to see results.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssignmentAttempt;
