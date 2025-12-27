import React, { useState } from 'react';
import './SampleDataViewer.scss';

function SampleDataViewer({ tables }) {
  const [activeTable, setActiveTable] = useState(tables && tables.length > 0 ? 0 : null);

  if (!tables || tables.length === 0) {
    return (
      <div className="sample-data-viewer">
        <div className="sample-data-viewer__empty">No sample data available</div>
      </div>
    );
  }

  const currentTable = tables[activeTable];

  return (
    <div className="sample-data-viewer">
      <h3 className="sample-data-viewer__title">Sample Data</h3>
      
      {/* Table Selector */}
      <div className="sample-data-viewer__tabs">
        {tables.map((table, index) => (
          <button
            key={index}
            className={`sample-data-viewer__tab ${activeTable === index ? 'sample-data-viewer__tab--active' : ''}`}
            onClick={() => setActiveTable(index)}
          >
            {table.tableName}
          </button>
        ))}
      </div>

      {/* Table Schema */}
      <div className="sample-data-viewer__schema">
        <h4 className="sample-data-viewer__schema-title">Schema:</h4>
        <div className="sample-data-viewer__columns">
          {currentTable.columns.map((column, idx) => (
            <span key={idx} className="sample-data-viewer__column">
              <strong>{column.columnName}</strong> ({column.dataType})
            </span>
          ))}
        </div>
      </div>

      {/* Table Data */}
      <div className="sample-data-viewer__data">
        <div className="sample-data-viewer__table-wrapper">
          <table className="sample-data-viewer__table">
            <thead>
              <tr>
                {currentTable.columns.map((column, idx) => (
                  <th key={idx}>{column.columnName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.rows && currentTable.rows.length > 0 ? (
                currentTable.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {currentTable.columns.map((column, colIdx) => (
                      <td key={colIdx}>{row[column.columnName] ?? 'NULL'}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={currentTable.columns.length} className="sample-data-viewer__empty-row">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SampleDataViewer;




