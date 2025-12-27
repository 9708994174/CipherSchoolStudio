import React from 'react';
import './ResultsPanel.scss';

function ResultsPanel({ results, loading }) {
  if (loading) {
    return (
      <div className="results-panel">
        <div className="results-panel__loading">Executing query...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-panel">
        <div className="results-panel__empty">
          Execute a query to see results here
        </div>
      </div>
    );
  }

  if (results.rows.length === 0) {
    return (
      <div className="results-panel">
        <div className="results-panel__header">
          <h3 className="results-panel__title">Query Results</h3>
          <span className="results-panel__count">0 rows</span>
        </div>
        <div className="results-panel__empty">Query executed successfully but returned no rows</div>
      </div>
    );
  }

  const columns = results.columns && results.columns.length > 0
    ? results.columns.map(col => col.name)
    : Object.keys(results.rows[0] || {});

  return (
    <div className="results-panel">
      <div className="results-panel__header">
        <h3 className="results-panel__title">Query Results</h3>
        <span className="results-panel__count">
          {results.rowCount || results.rows.length} row{results.rowCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="results-panel__table-wrapper">
        <table className="results-panel__table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx}>{row[col] ?? 'NULL'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResultsPanel;



