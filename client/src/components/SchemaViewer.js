import React from 'react';
import './SchemaViewer.scss';

function SchemaViewer({ tables }) {
  if (!tables || tables.length === 0) {
    return (
      <div className="schema-viewer">
        <div className="schema-viewer__empty">No schema available</div>
      </div>
    );
  }

  return (
    <div className="schema-viewer">
      {tables.map((table, tableIndex) => (
        <div key={tableIndex} className="schema-viewer__table">
          <div className="schema-viewer__table-header">
            <strong>Table: {table.tableName}</strong>
          </div>
          <div className="schema-viewer__table-content">
            <table className="schema-viewer__schema-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((column, colIdx) => (
                  <tr key={colIdx}>
                    <td>
                      <code className="schema-viewer__column-name">{column.columnName}</code>
                    </td>
                    <td>
                      <code className="schema-viewer__column-type">{column.dataType}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {table.columns.length > 0 && (
              <p className="schema-viewer__description">
                {table.columns[0].columnName} is the primary key (column with unique values) for this table. 
                This table contains information about the {table.tableName} data.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SchemaViewer;


