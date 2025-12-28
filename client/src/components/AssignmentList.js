import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getAssignments } from '../services/api';
import './AssignmentList.scss';

function AssignmentList() {
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(() => {
    return localStorage.getItem('assignmentFilter') || 'all';
  });
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setAssignmentsList } = useNavigation();

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    // Filter assignments based on selected difficulty
    if (filter === 'all') {
      setFilteredAssignments(assignments);
    } else {
      setFilteredAssignments(assignments.filter(a => a.difficulty === filter));
    }
  }, [assignments, filter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignments();
      const assignmentsData = response.data;
      setAssignments(assignmentsData);
      // Update navigation context with assignments list
      setAssignmentsList(assignmentsData);
      setError(null);
    } catch (err) {
      setError('Failed to load assignments. Please try again later.');
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyClass = (difficulty) => {
    return `assignment-card__difficulty assignment-card__difficulty--${difficulty.toLowerCase()}`;
  };

  const handleAssignmentClick = (id) => {
    // Check if user is authenticated before allowing access to assignment
    if (!isAuthenticated) {
      // Redirect to login, and save the assignment ID to redirect after login
      navigate(`/login?redirect=/assignment/${id}`);
    } else {
      navigate(`/assignment/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="assignment-list">
        <div className="assignment-list__loading">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="assignment-list">
        <div className="assignment-list__error">{error}</div>
        <button 
          className="assignment-list__retry-btn"
          onClick={fetchAssignments}
        >
          Retry
        </button>
      </div>
    );
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    localStorage.setItem('assignmentFilter', newFilter);
  };

  return (
    <div className="assignment-list">
      <div className="assignment-list__header">
        <h2 className="assignment-list__title">Available Assignments</h2>
        <div className="assignment-list__filter">
          <button 
            className={`assignment-list__filter-btn ${filter === 'all' ? 'assignment-list__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`assignment-list__filter-btn ${filter === 'Easy' ? 'assignment-list__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('Easy')}
          >
            Easy
          </button>
          <button 
            className={`assignment-list__filter-btn ${filter === 'Medium' ? 'assignment-list__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('Medium')}
          >
            Medium
          </button>
          <button 
            className={`assignment-list__filter-btn ${filter === 'Hard' ? 'assignment-list__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('Hard')}
          >
            Hard
          </button>
        </div>
      </div>
      {filteredAssignments.length === 0 ? (
        <div className="assignment-list__empty">
          {assignments.length === 0 
            ? 'No assignments available. Please check back later.'
            : `No ${filter === 'all' ? '' : filter} assignments found.`}
        </div>
      ) : (
        <div className="assignment-list__grid">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment._id}
              className="assignment-card"
              onClick={() => handleAssignmentClick(assignment._id)}
            >
              <div className="assignment-card__header">
                <h3 className="assignment-card__title">{assignment.title}</h3>
                <span className={getDifficultyClass(assignment.difficulty)}>
                  {assignment.difficulty}
                </span>
              </div>
              <p className="assignment-card__description">{assignment.description}</p>
              <div className="assignment-card__footer">
                <span className="assignment-card__action">Start Assignment →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssignmentList;



