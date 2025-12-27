import React, { createContext, useContext, useState } from 'react';

const QueryContext = createContext();

export const useQuery = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within QueryProvider');
  }
  return context;
};

export const QueryProvider = ({ children }) => {
  const [executeHandler, setExecuteHandler] = useState(null);
  const [submitHandler, setSubmitHandler] = useState(null);

  const registerExecute = (handler) => {
    setExecuteHandler(() => handler);
  };

  const registerSubmit = (handler) => {
    setSubmitHandler(() => handler);
  };

  const execute = () => {
    if (executeHandler) {
      executeHandler();
    }
  };

  const submit = () => {
    if (submitHandler) {
      submitHandler();
    }
  };

  return (
    <QueryContext.Provider value={{ execute, submit, registerExecute, registerSubmit }}>
      {children}
    </QueryContext.Provider>
  );
};


