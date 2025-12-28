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

  const setAssignmentsList = (list) => {
    setAssignments(list);
  };

  const setCurrentAssignmentIndex = (index) => {
    setCurrentIndex(index);
  };

  const getCurrentAssignmentId = () => {
    if (currentIndex >= 0 && currentIndex < assignments.length) {
      return assignments[currentIndex]._id;
    }
    return null;
  };

  const getNextAssignmentId = () => {
    if (currentIndex >= 0 && currentIndex < assignments.length - 1) {
      return assignments[currentIndex + 1]._id;
    }
    return null;
  };

  const getPreviousAssignmentId = () => {
    if (currentIndex > 0 && currentIndex < assignments.length) {
      return assignments[currentIndex - 1]._id;
    }
    return null;
  };

  const hasNext = () => {
    return currentIndex >= 0 && currentIndex < assignments.length - 1;
  };

  const hasPrevious = () => {
    return currentIndex > 0;
  };

  return (
    <NavigationContext.Provider value={{
      assignments,
      setAssignmentsList,
      currentIndex,
      setCurrentAssignmentIndex,
      getCurrentAssignmentId,
      getNextAssignmentId,
      getPreviousAssignmentId,
      hasNext,
      hasPrevious
    }}>
      {children}
    </NavigationContext.Provider>
  );
};





