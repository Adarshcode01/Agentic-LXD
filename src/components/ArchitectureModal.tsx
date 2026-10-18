import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Cpu, Server, Database, Flame, Globe } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: {
    cloudRunRequests: number;
    cloudRunMonthlyLimit: number;
    geminiRpmUsed: number;
    geminiRpmLimit: number;
    bigQueryStorageBytes: number;
    bigQueryMonthlyStorageLimitBytes: number;
    firestoreStorageBytes: number;
    firestoreMonthlyLimitBytes: number;
  };
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  metrics
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const gcloudSetupScript = `# 1. Initialize Google Cloud Environment
gcloud config set project lms-ai-builder

# 2. Enable Required Always-Free Services
gcloud services enable \\
  run.googleapis.com \\
  bigquery.googleapis.com \\
  firestore.googleapis.com \\
  cloudbuild.googleapis.com

# 3. Create BigQuery xAPI Streaming Telemetry Dataset & JSON Table
bq mk --dataset --location=US lms-ai-builder:lms_telemetry
bq query --use_legacy_sql=false \\
  "CREATE TABLE \`lms-ai-builder.lms_telemetry.xapi_statements\` (statement JSON);"

# 4. Deploy Backend to Cloud Run (Always Free: 2M req/month)
gcloud run deploy lms-backend \\
  --source . \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --set-env-vars GEMINI_API_KEY=\${GEMINI_API_KEY}`;

  const bigQueryQuerySample = `# Analytical BigQuery JSON Query (Zero Schema Migrations)
SELECT
  JSON_VALUE(statement, '$.actor.name') AS trainee_name,
  JSON_VALUE(statement, '$.actor.mbox') AS email,
  JSON_VALUE(statement, '$.verb.display.en-US') AS action,
  CAST(JSON_VALUE(statement, '$.result.score.raw') AS INT64) AS score_pct,
  JSON_VALUE(statement, '$.result.response') AS friction_detail
FROM
  \`lms-ai-builder.lms_telemetry.xapi_statements\`
WHERE
  CAST(JSON_VALUE(statement, '$.result.score.raw') AS INT64) < 60
ORDER BY
  JSON_VALUE(statement, '$.timestamp') DESC;`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Google "Always Free" Stack Architecture</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero-cost enterprise LMS blueprint utilizing permanent Google Cloud Free Tier quotas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Stack Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Google AI Studio</span>
              </div>
              <div className="text-xs text-slate-600 mb-2">Gemini 3.8 Flash Engine</div>
              <div className="text-xs text-slate-500">Free Tier Limit:</div>
              <div className="font-mono text-xs font-semibold text-blue-700">15 RPM free</div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Server className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Cloud Run</span>
              </div>
              <div className="text-xs text-slate-600 mb-2">Node.js / Express API</div>
              <div className="text-xs text-slate-500">Free Tier Limit:</div>
              <div className="font-mono text-xs font-semibold text-emerald-700">2M reqs/month</div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Database className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">BigQuery</span>
              </div>
              <div className="text-xs text-slate-600 mb-2">xAPI JSON Telemetry Lake</div>
              <div className="text-xs text-slate-500">Free Tier Limit:</div>
              <div className="font-mono text-xs font-semibold text-indigo-700">10 GB + 1 TB queries</div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">Firestore</span>
              </div>
              <div className="text-xs text-slate-600 mb-2">State & Micro-Modules</div>
              <div className="text-xs text-slate-500">Free Tier Limit:</div>
              <div className="font-mono text-xs font-semibold text-amber-700">1 GB storage</div>
            </div>

            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-800">Firebase Hosting</span>
              </div>
              <div className="text-xs text-slate-600 mb-2">Vite Single-Page Web UI</div>
              <div className="text-xs text-slate-500">Free Tier Limit:</div>
              <div className="font-mono text-xs font-semibold text-sky-700">Spark Plan (Free)</div>
            </div>
          </div>

          {/* Setup Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Google Cloud Console Setup (gcloud CLI)</h3>
              <button
                onClick={() => copyToClipboard(gcloudSetupScript, 'gcloud')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {copiedSection === 'gcloud' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'gcloud' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
              {gcloudSetupScript}
            </pre>
          </div>

          {/* BigQuery JSON Logic */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">BigQuery Native JSON Telemetry Extraction</h3>
              <button
                onClick={() => copyToClipboard(bigQueryQuerySample, 'bq')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {copiedSection === 'bq' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'bq' ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              Notice the single-column schema: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">CREATE TABLE lms_telemetry.xapi_statements (statement JSON)</code>.
              This accepts nested actor-verb-object payloads without schema alterations or JSON serializing bottlenecks.
            </p>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
              {bigQueryQuerySample}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Current project target: <strong className="text-slate-800">lms-ai-builder</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
