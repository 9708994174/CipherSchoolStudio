import React from 'react';
import './ComplexityGraph.scss';

function ComplexityGraph({ complexity, testResults }) {
  if (!complexity) {
    return null;
  }

  const metrics = [
    { name: 'Query Length', value: complexity.queryLength, max: 1000, color: '#3b82f6' },
    { name: 'Row Count', value: complexity.rowCount, max: 100, color: '#22c55e' },
    { name: 'Has Joins', value: complexity.hasJoins ? 100 : 0, max: 100, color: '#f59e0b' },
    { name: 'Has Subqueries', value: complexity.hasSubqueries ? 100 : 0, max: 100, color: '#ef4444' },
    { name: 'Has Aggregates', value: complexity.hasAggregates ? 100 : 0, max: 100, color: '#8b5cf6' }
  ];

  const passedTests = testResults?.filter(t => t.passed).length || 0;
  const totalTests = testResults?.length || 0;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="complexity-graph">
      <h3 className="complexity-graph__title">Submission Analysis</h3>
      
      <div className="complexity-graph__test-summary">
        <div className="complexity-graph__test-stat">
          <span className="complexity-graph__test-label">Tests Passed</span>
          <span className="complexity-graph__test-value">
            {passedTests} / {totalTests}
          </span>
        </div>
        <div className="complexity-graph__pass-rate">
          <div className="complexity-graph__pass-rate-bar">
            <div 
              className="complexity-graph__pass-rate-fill"
              style={{ width: `${passRate}%` }}
            />
          </div>
          <span className="complexity-graph__pass-rate-text">{passRate.toFixed(0)}%</span>
        </div>
      </div>

      <div className="complexity-graph__metrics">
        {metrics.map((metric, index) => {
          const percentage = Math.min((metric.value / metric.max) * 100, 100);
          const displayValue = typeof metric.value === 'boolean' 
            ? (metric.value ? 'Yes' : 'No') 
            : (typeof metric.value === 'number' ? metric.value : 0);
          return (
            <div key={index} className="complexity-graph__metric">
              <div className="complexity-graph__metric-header">
                <span className="complexity-graph__metric-name">{metric.name}</span>
                <span className="complexity-graph__metric-value">{displayValue}</span>
              </div>
              <div className="complexity-graph__metric-bar">
                <div 
                  className="complexity-graph__metric-fill"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: metric.color
                  }}
                />
                <span className="complexity-graph__metric-percentage">{percentage.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="complexity-graph__complexity-score">
        <div className="complexity-graph__score-label">Complexity Score</div>
        <div className="complexity-graph__score-value">
          {calculateComplexityScore(complexity)}
        </div>
      </div>
    </div>
  );
}

function calculateComplexityScore(complexity) {
  let score = 0;
  
  // Base score from query length
  if (complexity.queryLength < 100) score += 10;
  else if (complexity.queryLength < 300) score += 20;
  else score += 30;
  
  // Add points for features
  if (complexity.hasJoins) score += 20;
  if (complexity.hasSubqueries) score += 25;
  if (complexity.hasAggregates) score += 15;
  
  // Row count factor
  if (complexity.rowCount > 50) score += 10;
  
  return Math.min(score, 100);
}

export default ComplexityGraph;


