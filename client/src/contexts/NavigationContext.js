import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [assignments, setAssignments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const setAssignmentsList = React.useCallback((list) => {
    setAssignments(list);
  }, []);

  const setCurrentAssignmentIndex = React.useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const getCurrentAssignmentId = React.useCallback(() => {
    if (currentIndex >= 0 && currentIndex < assignments.length) {
      return assignments[currentIndex]._id;
    }
    return null;
  }, [currentIndex, assignments]);

  const getNextAssignmentId = React.useCallback(() => {
    if (currentIndex >= 0 && currentIndex < assignments.length - 1) {
      return assignments[currentIndex + 1]._id;
    }
    return null;
  }, [currentIndex, assignments]);

  const getPreviousAssignmentId = React.useCallback(() => {
    if (currentIndex > 0 && currentIndex < assignments.length) {
      return assignments[currentIndex - 1]._id;
    }
    return null;
  }, [currentIndex, assignments]);

  const hasNext = React.useCallback(() => {
    return currentIndex >= 0 && currentIndex < assignments.length - 1;
  }, [currentIndex, assignments]);

  const hasPrevious = React.useCallback(() => {
    return currentIndex > 0;
  }, [currentIndex]);

  const value = React.useMemo(() => ({
    assignments,
    setAssignmentsList,
    currentIndex,
    setCurrentAssignmentIndex,
    getCurrentAssignmentId,
    getNextAssignmentId,
    getPreviousAssignmentId,
    hasNext,
    hasPrevious
  }), [assignments, setAssignmentsList, currentIndex, setCurrentAssignmentIndex, getCurrentAssignmentId, getNextAssignmentId, getPreviousAssignmentId, hasNext, hasPrevious]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};





