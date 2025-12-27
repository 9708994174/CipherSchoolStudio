import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    fetchAssignments();
    
    // Listen for filter changes from navbar
    const handleFilterChange = (event) => {
      setFilter(event.detail.filter);
    };
    
    window.addEventListener('filterChanged', handleFilterChange);
    return () => window.removeEventListener('filterChanged', handleFilterChange);
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
      setAssignments(response.data);
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
    navigate(`/assignment/${id}`);
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

  return (
    <div className="assignment-list">
      <h2 className="assignment-list__title">Available Assignments</h2>
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



