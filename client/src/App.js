import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { QueryProvider, useQuery } from './contexts/QueryContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AssignmentList from './components/AssignmentList';
import AssignmentAttempt from './components/AssignmentAttempt';
import Login from './components/Login';
import Signup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import './App.scss';

function AssignmentRouteWrapper() {
  const location = useLocation();
  const assignmentId = location.pathname.split('/assignment/')[1];
  
  return (
    <>
      <TopNavBarContent />
      <main className="app__main">
        <ProtectedRoute>
          <AssignmentAttempt key={assignmentId} />
        </ProtectedRoute>
      </main>
    </>
  );
}

function TopNavBarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [timer, setTimer] = useState(0);
  const [questionPaletteOpen, setQuestionPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAssignmentPage = location.pathname.includes('/assignment/');
  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const { execute, submit } = useQuery();
  const { assignments, currentIndex, setCurrentAssignmentIndex, getNextAssignmentId, getPreviousAssignmentId, hasNext, hasPrevious } = useNavigation();
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAssignmentPage) {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimer(0);
    }
  }, [isAssignmentPage]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    // Close question palette and user menu when clicking outside
    const handleClickOutside = (event) => {
      if (questionPaletteOpen && !event.target.closest('.app__question-palette')) {
        setQuestionPaletteOpen(false);
      }
      if (userMenuOpen && !event.target.closest('.app__user-menu')) {
        setUserMenuOpen(false);
      }
    };

    if (questionPaletteOpen || userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [questionPaletteOpen, userMenuOpen]);

  return (
    <header className={`app__header ${isHomePage ? 'app__header--home' : ''}`}>
      <div className="app__header-left">
        {(isHomePage || isAssignmentPage) && (
          <>
            <div className="app__question-palette">
              <button 
                className="app__question-palette-btn"
                onClick={() => setQuestionPaletteOpen(!questionPaletteOpen)}
                title="Question Palette"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {questionPaletteOpen && (
              <>
                <div 
                  className="app__question-palette-overlay"
                  onClick={() => setQuestionPaletteOpen(false)}
                />
                <div className={`app__question-palette-sidebar ${questionPaletteOpen ? 'app__question-palette-sidebar--open' : ''}`}>
                  <div className="app__question-palette-header">
                    <h3>Questions</h3>
                    <button 
                      className="app__question-palette-close"
                      onClick={() => setQuestionPaletteOpen(false)}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  {assignments.length > 0 ? (
                    <div className="app__question-palette-list">
                      {assignments.map((assignment, index) => {
                        // Check if this is the current/active assignment
                        const currentId = location.pathname.split('/assignment/')[1];
                        const isActive = currentIndex === index || assignment._id === currentId;
                        return (
                          <button
                            key={assignment._id}
                            className={`app__question-palette-item ${isActive ? 'app__question-palette-item--active' : ''}`}
                            onClick={async () => {
                              if (isAuthenticated) {
                                // Update current index before navigation
                                setCurrentAssignmentIndex(index);
                                // Close sidebar first
                                setQuestionPaletteOpen(false);
                                // Navigate to the assignment
                                navigate(`/assignment/${assignment._id}`);
                              } else {
                                navigate(`/login?redirect=/assignment/${assignment._id}`);
                                setQuestionPaletteOpen(false);
                              }
                            }}
                          >
                            <span className="app__question-palette-number">{index + 1}</span>
                            <div className="app__question-palette-content">
                              <span className="app__question-palette-title">{assignment.title}</span>
                              <span className={`app__question-palette-difficulty app__question-palette-difficulty--${assignment.difficulty.toLowerCase()}`}>
                                {assignment.difficulty}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="app__question-palette-empty">No questions available</div>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {!isHomePage && (
          <h1 className="app__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            CipherSQLStudio
          </h1>
        )}
        {isAssignmentPage && (
          <div className="app__nav-arrows app__nav-arrows--mobile-hidden">
            <button 
              className="app__nav-btn" 
              title="Previous"
              onClick={() => {
                const prevId = getPreviousAssignmentId();
                if (prevId) navigate(`/assignment/${prevId}`);
              }}
              disabled={!hasPrevious()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className="app__nav-btn" 
              title="Next"
              onClick={() => {
                const nextId = getNextAssignmentId();
                if (nextId) navigate(`/assignment/${nextId}`);
              }}
              disabled={!hasNext()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="app__nav-btn" title="Shuffle">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 2L15 3.5L13.5 5M2 13.5L3.5 15L5 13.5M13.5 13.5L15 12L13.5 10.5M2 2L3.5 3.5L5 2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      {isHomePage && (
        <div className="app__header-center">
          <h1 className="app__logo app__logo--home" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            CipherSQLStudio
          </h1>
        </div>
      )}
      {isAssignmentPage && (
        <div className="app__header-center">
          <button 
            className="app__action-btn app__action-btn--run" 
            title="Run Query"
            onClick={() => execute && execute()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM6.5 4.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V5a.5.5 0 0 0-.5-.5h-6z" fill="currentColor"/>
            </svg>
            <span>Run</span>
          </button>
          <button 
            className="app__action-btn app__action-btn--submit" 
            title="Submit Solution"
            onClick={() => submit && submit()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0L6.5 1.5L9.5 4.5H2v2h7.5L6.5 9.5L8 11l6-6L8 0z" fill="currentColor"/>
            </svg>
            <span>Submit</span>
          </button>
        </div>
      )}
      <div className="app__header-right">
        {isAssignmentPage && (
          <div className="app__timer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
            <span>{formatTime(timer)}</span>
          </div>
        )}
        <div className="app__header-actions">
          {!isAuthPage && (
            <>
              {isAuthenticated ? (
                <div className="app__user-menu">
                  <button 
                    className="app__user-btn" 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    title={user?.username || 'User'}
                  >
                    <div className="app__user-avatar">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="app__user-name">{user?.username || 'User'}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                      <path fillRule="evenodd" d="M1.38 8.6a1 1 0 011.13.6c.4.15.84.25 1.3.3.46.05.92.05 1.38 0 .46-.05.9-.15 1.3-.3a1 1 0 011.13-.6c.5.2.9.6 1.1 1.1a1 1 0 01-.6 1.13c-.15.4-.25.84-.3 1.3-.05.46-.05.92 0 1.38.05.46.15.9.3 1.3a1 1 0 01-.6 1.13c-.5.2-1 .2-1.5 0a1 1 0 01-1.13-.6c-.4-.15-.84-.25-1.3-.3-.46-.05-.92-.05-1.38 0-.46.05-.9.15-1.3.3a1 1 0 01-1.13.6c-.5-.2-1-.2-1.5 0a1 1 0 01-.6-1.13c.15-.4.25-.84.3-1.3.05-.46.05-.92 0-1.38-.05-.46-.15-.9-.3-1.3a1 1 0 01.6-1.13c.5-.2 1-.2 1.5 0z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  {userMenuOpen && (
                    <div className="app__user-dropdown">
                      <div className="app__user-info">
                        <div className="app__user-email">{user?.email}</div>
                      </div>
                      <button 
                        className="app__user-menu-item"
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate('/');
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  className="app__auth-btn"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
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
                      <TopNavBarContent />
                      <main className="app__main">
                        <AssignmentList />
                      </main>
                    </>
                  } 
                />
                <Route 
                  path="/assignment/:id" 
                  element={
                    <AssignmentRouteWrapper />
                  } 
                />
              </Routes>
            </div>
          </Router>
        </NavigationProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

export default App;


