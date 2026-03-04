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

  const registerExecute = React.useCallback((handler) => {
    setExecuteHandler(() => handler);
  }, []);

  const registerSubmit = React.useCallback((handler) => {
    setSubmitHandler(() => handler);
  }, []);

  const execute = React.useCallback(() => {
    if (executeHandler) {
      executeHandler();
    }
  }, [executeHandler]);

  const submit = React.useCallback(() => {
    if (submitHandler) {
      submitHandler();
    }
  }, [submitHandler]);

  const value = React.useMemo(() => ({
    execute, submit, registerExecute, registerSubmit
  }), [execute, submit, registerExecute, registerSubmit]);

  return (
    <QueryContext.Provider value={value}>
      {children}
    </QueryContext.Provider>
  );
};


