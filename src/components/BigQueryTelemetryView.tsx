import React, { useState } from 'react';
import { Database, Search, Play, Code, Copy, Check, Filter, Terminal, RefreshCw, Eye } from 'lucide-react';
import { XAPIStatement } from '../types/lms';

interface BigQueryTelemetryViewProps {
  statements: { statement: XAPIStatement }[];
  onRefresh: () => void;
}

const PRESET_QUERIES = [
  {
    name: 'All Recent Statements',
    sql: 'SELECT * FROM `lms_telemetry.xapi_statements` ORDER BY timestamp DESC LIMIT 50;'
  },
  {
    name: 'Failing Scores (< 60%) for Remediation',
    sql: `SELECT 
  JSON_VALUE(statement, '$.actor.name') AS trainee_name,
  CAST(JSON_VALUE(statement, '$.result.score.raw') AS INT64) AS score,
  JSON_VALUE(statement, '$.object.definition.name.en-US') AS activity
FROM \`lms_telemetry.xapi_statements\`
WHERE CAST(JSON_VALUE(statement, '$.result.score.raw') AS INT64) < 60;`
  },
  {
    name: 'Average Performance by Trainee',
    sql: `SELECT 
  JSON_VALUE(statement, '$.actor.name') AS trainee_name,
  AVG(CAST(JSON_VALUE(statement, '$.result.score.raw') AS INT64)) AS avg_score,
  COUNT(1) AS assessments_count
FROM \`lms_telemetry.xapi_statements\`
GROUP BY trainee_name;`
  }
];

export const BigQueryTelemetryView: React.FC<BigQueryTelemetryViewProps> = ({
  statements,
  onRefresh
}) => {
  const [activeQuery, setActiveQuery] = useState<string>(PRESET_QUERIES[0].sql);
  const [isRunningQuery, setIsRunningQuery] = useState<boolean>(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<XAPIStatement | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const handleRunQuery = async () => {
    setIsRunningQuery(true);
    try {
      const res = await fetch('/api/query-bigquery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: activeQuery })
      });
      const data = await res.json();
      setQueryResults(data.results);
    } catch (err: any) {
      alert('BigQuery error: ' + err.message);
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(activeQuery);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BigQuery xAPI Telemetry Lake
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Unstructured xAPI JSON statements streamed directly into BigQuery table <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">lms_telemetry.xapi_statements</code>. Query deeply nested learning telemetry using <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">JSON_VALUE</code> without schema migrations.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry Stream</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive SQL Console (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  BigQuery SQL Console
                </h2>
              </div>
              <button
                onClick={handleCopySql}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Preset Queries:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveQuery(q.sql);
                      setQueryResults(null);
                    }}
                    className={`text-xs px-2.5 py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                      activeQuery === q.sql
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Editor */}
            <div>
              <textarea
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                rows={7}
                className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Processed via Cloud Run API
              </span>
              <button
                onClick={handleRunQuery}
                disabled={isRunningQuery}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isRunningQuery ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Run Query</span>
              </button>
            </div>
          </div>

          {/* DDL Architecture Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span>BigQuery Free Tier Telemetry Schema</span>
            </div>
            <p>
              By specifying a single column <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">statement JSON</code>, standard xAPI payloads dump into BigQuery instantly. The Always-Free quota includes <strong>10 GB storage and 1 TB query execution per month</strong>.
            </p>
          </div>
        </div>

        {/* Right Column: Statements Lake Stream / Query Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {queryResults ? 'Query Execution Results' : `Streaming Telemetry Statements (${statements.length})`}
                </h3>
              </div>
              {queryResults && (
                <button
                  onClick={() => setQueryResults(null)}
                  className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                >
                  Return to Live Stream
                </button>
              )}
            </div>

            {/* Statements Table */}
            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Trainee / Actor</th>
                    <th className="py-2.5 px-4">Action (Verb)</th>
                    <th className="py-2.5 px-4">Activity Object</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                    <th className="py-2.5 px-4 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queryResults ? (
                    queryResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {row.traineeName || row.statement?.actor?.name || 'Unknown'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-slate-600">
                            {row.action || row.verb || row.statement?.verb?.display?.['en-US'] || 'interacted'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                          {row.activity || row.statement?.object?.definition?.name?.['en-US'] || 'Activity'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                          {row.score !== undefined ? `${row.score}%` : row.averageScore !== undefined ? `${row.averageScore}%` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {row.statement ? (
                            <button
                              onClick={() => setSelectedStatement(row.statement)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4 inline" />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : statements.length > 0 ? (
                    statements.map(({ statement }) => {
                      const verbName = statement.verb.display?.['en-US'] || statement.verb.id.split('/').pop() || 'verb';
                      const scoreRaw = statement.result?.score?.raw;
                      const isFailing = typeof scoreRaw === 'number' && scoreRaw < 60;

                      return (
                        <tr key={statement.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900">{statement.actor.name}</div>
                            <div className="text-slate-500 font-mono text-2xs truncate">
                              {statement.actor.mbox.replace('mailto:', '')}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`font-mono font-medium ${
                              verbName === 'passed' ? 'text-emerald-700' :
                              verbName === 'failed' ? 'text-red-700' : 'text-slate-700'
                            }`}>
                              {verbName}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 max-w-xs">
                            <div className="font-medium text-slate-800 truncate">
                              {statement.object.definition.name['en-US']}
                            </div>
                            <div className="text-2xs text-slate-400">
                              {new Date(statement.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {typeof scoreRaw === 'number' ? (
                              <span className={`font-mono font-bold tabular-nums ${isFailing ? 'text-red-600' : 'text-emerald-600'}`}>
                                {scoreRaw}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedStatement(statement)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Inspect IEEE 9274.1.1 raw JSON"
                            >
                              <Eye className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No telemetry statements recorded yet. Take a quiz or complete a roleplay session to emit events.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON Inspector Modal */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Raw IEEE 9274.1.1 xAPI Statement Inspector
                </h3>
                <span className="text-xs font-mono text-slate-500">ID: {selectedStatement.id}</span>
              </div>
              <button
                onClick={() => setSelectedStatement(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedStatement, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">BigQuery Storage Format: native JSON column</span>
              <button
                onClick={() => setSelectedStatement(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded text-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
