import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { QueryProvider, useQuery } from './contexts/QueryContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import AssignmentList from './components/AssignmentList';
import AssignmentAttempt from './components/AssignmentAttempt';
import './App.scss';

function TopNavBarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [timer, setTimer] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const isAssignmentPage = location.pathname.includes('/assignment/');
  const isHomePage = location.pathname === '/';
  const { execute, submit } = useQuery();
  const { getNextAssignmentId, getPreviousAssignmentId, hasNext, hasPrevious } = useNavigation();

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

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setFilterMenuOpen(false);
    // Store filter in localStorage
    localStorage.setItem('assignmentFilter', filter);
    // Dispatch custom event to notify AssignmentList
    window.dispatchEvent(new CustomEvent('filterChanged', { detail: { filter } }));
  };

  useEffect(() => {
    // Load saved filter preference
    const savedFilter = localStorage.getItem('assignmentFilter') || 'all';
    setSelectedFilter(savedFilter);
  }, []);

  useEffect(() => {
    // Close filter menu when clicking outside
    const handleClickOutside = (event) => {
      if (filterMenuOpen && !event.target.closest('.app__filter-menu')) {
        setFilterMenuOpen(false);
      }
    };

    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  return (
    <header className={`app__header ${isHomePage ? 'app__header--home' : ''}`}>
      <div className="app__header-left">
        {isHomePage && (
          <div className="app__filter-menu">
            <button 
              className="app__filter-btn"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              title="Filter by Difficulty"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 5.707A1 1 0 013 5V3z"/>
              </svg>
              <span className="app__filter-label">Filter</span>
            </button>
            {filterMenuOpen && (
              <div className="app__filter-dropdown">
                <button 
                  className={`app__filter-option ${selectedFilter === 'all' ? 'app__filter-option--active' : ''}`}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </button>
                <button 
                  className={`app__filter-option ${selectedFilter === 'Easy' ? 'app__filter-option--active' : ''}`}
                  onClick={() => handleFilterChange('Easy')}
                >
                  Easy
                </button>
                <button 
                  className={`app__filter-option ${selectedFilter === 'Medium' ? 'app__filter-option--active' : ''}`}
                  onClick={() => handleFilterChange('Medium')}
                >
                  Medium
                </button>
                <button 
                  className={`app__filter-option ${selectedFilter === 'Hard' ? 'app__filter-option--active' : ''}`}
                  onClick={() => handleFilterChange('Hard')}
                >
                  Hard
                </button>
              </div>
            )}
          </div>
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
          <button className="app__icon-btn app__icon-btn--desktop-only" title="Settings" onClick={() => console.log('Settings clicked')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 018.4 1.867c1.147.514 2.135.99 2.6 1.186a1.651 1.651 0 011.186 0c.465-.196 1.453-.672 2.6-1.186a10.004 10.004 0 017.736 7.537 1.651 1.651 0 010 1.186 10.004 10.004 0 01-7.736 7.537c-1.147-.514-2.135-.99-2.6-1.186a1.651 1.651 0 01-1.186 0c-.465.196-1.453.672-2.6 1.186A10.004 10.004 0 01.664 10.59zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
          </button>
          <button className="app__icon-btn app__icon-btn--desktop-only" title="Notifications" onClick={() => console.log('Notifications clicked')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            <span className="app__badge">0</span>
          </button>
          <button className="app__icon-btn app__icon-btn--profile app__icon-btn--desktop-only" title="Profile" onClick={() => console.log('Profile clicked')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <QueryProvider>
      <NavigationProvider>
        <Router>
          <div className="app">
            <TopNavBarContent />
            <main className="app__main">
              <Routes>
                <Route path="/" element={<AssignmentList />} />
                <Route path="/assignment/:id" element={<AssignmentAttempt />} />
              </Routes>
            </main>
          </div>
        </Router>
      </NavigationProvider>
    </QueryProvider>
  );
}

export default App;


