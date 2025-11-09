"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  Zap,
  Clock,
  Layers,
  Maximize2,
  Database,
  FileText,
  ShieldCheck,
} from "lucide-react";

// --- 1. TYPE DEFINITIONS ---

interface DocumentMemo {
  document_id: number;
  title: string;
  hash: string;
  ipfs_cid: string;
  metadata: {};
}

interface Parent {
  hash: string;
  ordinal: number;
}
interface Proof {
  id: string;
  signature: string;
}
interface TransactionOriginalValue {
  fee: number;
  salt: number;
  amount: number;
  parent: Parent;
  source: string;
  destination: string;
}
interface TransactionOriginal {
  value: TransactionOriginalValue;
  proofs: Proof[];
}
interface DAGTransaction {
  hash: string;
  ordinal: number;
  amount: number;
  source: string;
  destination: string;
  fee: number;
  parent?: Parent;
  salt?: number;
  blockHash?: string;
  snapshotHash?: string;
  snapshotOrdinal?: number;
  transactionOriginal?: TransactionOriginal;
  timestamp: string;
  globalSnapshotHash?: string;
  globalSnapshotOrdinal?: number;
  auxiliaryData?: string;
}

interface EnrichedTransaction extends DAGTransaction {
  document?: DocumentMemo;
}

// --- 2. UTILITIES & COMPONENTS ---
const shortenHash = (hash: string, startLength = 8, endLength = 6) => {
  if (!hash || hash.length < startLength + endLength) return hash || "N/A";
  const cleanHash = hash.replace(/\[\.\.\.|\.\.\.\]/g, "");
  return `${cleanHash.substring(0, startLength)}...${cleanHash.substring(
    cleanHash.length - endLength
  )}`;
};

const formatAmount = (amount: number, fee: number) => {
  const amountInDag = amount / 100000000;
  return amountInDag.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
};

const DetailRow: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({ label, value, color = "text-gray-300" }) => (
  <div className="flex justify-between py-2 border-b border-gray-700 last:border-b-0">
    <span className="text-sm text-gray-400 font-medium">{label}</span>
    <span className={`text-sm ${color} font-mono break-all text-right`}>
      {value}
    </span>
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtext: string;
}> = ({ icon, title, value, subtext }) => (
  <div className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700/50 flex flex-col justify-between h-full">
    <div className="flex items-center space-x-3 mb-2">
      <div className="p-2 bg-blue-600/20 text-blue-400 rounded-full">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
    </div>
    <p className="text-3xl font-bold text-white mb-1 truncate">{value}</p>
    <p className="text-xs text-gray-400 truncate">{subtext}</p>
  </div>
);

// --- 3. MAIN COMPONENT (Live Fetch) ---
export const DAGData: React.FC = () => {
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = "http://localhost:5001/dag-data";

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(API_URL);

        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();

        let dataArray: EnrichedTransaction[] = [];

        if (json && Array.isArray(json.transactions)) {
          dataArray = json.transactions;
        }

        if (dataArray.length === 0) {
          setError(
            "The backend responded successfully, but no transactions were found containing enriched data."
          );
        }

        setTransactions(dataArray);
        break;
      } catch (err) {
        if (attempt === maxRetries - 1) {
          setTransactions([]);
          setError(
            `Failed to connect to backend at ${API_URL}. Details: ${
              (err as Error).message
            }`
          );
        } else {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const latestTx = useMemo(() => {
    return transactions.length > 0 ? transactions[0] : null;
  }, [transactions]);

  // --- 4. CONDITIONAL RENDERS ---
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">
        <p className="text-xl flex items-center">
          <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
          Connecting to backend and fetching transactions...
        </p>
      </div>
    );
  }

  if (!latestTx) {
    return (
      <div className="flex items-center justify-center h-screen p-8 bg-gray-900">
        <div className="text-center bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-lg">
          <Database className="w-10 h-10 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-white mb-2">
            No Live Transaction Data
          </h1>
          {error ? (
            <div className="mt-4 p-3 bg-red-900/50 text-red-300 rounded text-sm">
              <p className="font-semibold">Connection Error / Warning:</p>
              <p className="font-mono break-words">{error}</p>
            </div>
          ) : (
            <p className="text-gray-400">
              Awaiting transactions from the DAG node.
            </p>
          )}
          <button
            onClick={fetchData}
            className="mt-6 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const proofId = latestTx.transactionOriginal?.proofs?.[0]?.id || "N/A";
  const signature = latestTx.transactionOriginal?.proofs?.[0]?.signature || "N/A";
  const hasDocument = !!latestTx.document;

  // --- 5. MAIN RENDER ---
  return (
    <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-extrabold text-green-400 tracking-tight flex items-center">
          <Database className="w-6 h-6 mr-3" />
          DAG Transaction Explorer
        </h1>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 mt-3 sm:mt-0 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 shadow-md hover:shadow-lg"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh Live Data"}</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-900/50 text-red-300 p-4 mb-6 rounded-xl border border-red-700">
          <p className="font-semibold">Live Data Warning:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Summary Metrics */}
        <h2 className="text-2xl font-semibold text-gray-200">Core Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Zap className="w-5 h-5" />}
            title="Transaction Ordinal"
            value={latestTx.ordinal?.toLocaleString() || "N/A"}
            subtext={`Hash: ${shortenHash(latestTx.hash, 4, 4)}`}
          />
          <MetricCard
            icon={<Maximize2 className="w-5 h-5" />}
            title="Amount Transferred"
            value={`${formatAmount(latestTx.amount, latestTx.fee)} DAG`}
            subtext={`Fee: ${formatAmount(latestTx.fee, 0)} DAG`}
          />
          <MetricCard
            icon={<Layers className="w-5 h-5" />}
            title="Snapshot Ordinal"
            value={latestTx.snapshotOrdinal?.toLocaleString() || "N/A"}
            subtext={`Global Ordinal: ${
              latestTx.globalSnapshotOrdinal?.toLocaleString() || "N/A"
            }`}
          />
          <MetricCard
            icon={<Clock className="w-5 h-5" />}
            title="Timestamp"
            value={new Date(latestTx.timestamp).toLocaleTimeString()}
            subtext={new Date(latestTx.timestamp).toLocaleDateString()}
          />
        </div>

        {/* Document Memo */}
        {hasDocument && latestTx.document && (
          <div className="bg-yellow-900/20 p-6 rounded-xl shadow-lg border border-yellow-700/50">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              Embedded Document Memo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              <DetailRow
                label="Document ID"
                value={latestTx.document.document_id}
                color="text-yellow-200"
              />
              <DetailRow
                label="Title"
                value={latestTx.document.title}
                color="text-yellow-200"
              />
              <DetailRow
                label="Document Hash (SHA-256)"
                value={latestTx.document.hash}
                color="text-yellow-200"
              />
              <DetailRow
                label="IPFS CID"
                value={latestTx.document.ipfs_cid}
                color="text-yellow-200"
              />
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <h2 className="text-2xl font-semibold text-gray-200 pt-4">
          Full Transaction Details
        </h2>
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 border-b border-blue-400/30 pb-2">
                Core Data & Movement
              </h3>
              <DetailRow
                label="Transaction Hash"
                value={latestTx.hash}
                color="text-yellow-400"
              />
              <DetailRow
                label="Source Address"
                value={latestTx.source}
                color="text-green-400"
              />
              <DetailRow
                label="Destination Address"
                value={latestTx.destination}
                color="text-red-400"
              />
              <DetailRow
                label="Salt"
                value={latestTx.salt?.toString() || "N/A"}
              />
              <DetailRow
                label="Block Hash"
                value={latestTx.blockHash || "N/A"}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-400 border-b border-blue-400/30 pb-2">
                Network Proof & State
              </h3>
              <DetailRow
                label="Parent Hash"
                value={latestTx.parent?.hash || "N/A"}
              />
              <DetailRow
                label="Parent Ordinal"
                value={latestTx.parent?.ordinal.toLocaleString() || "N/A"}
              />
              <DetailRow
                label="Snapshot Hash"
                value={latestTx.snapshotHash || "N/A"}
              />
              <DetailRow
                label="Proof ID"
                value={proofId}
                color="text-purple-400"
              />
              <DetailRow
                label="Signature (Partial)"
                value={shortenHash(signature, 15)}
                color="text-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Raw JSON */}
        <h2 className="text-xl font-semibold text-gray-200 pt-4 flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 text-yellow-500" />
          Raw JSON Data (Source)
        </h2>
        <pre className="bg-gray-800 p-4 rounded-xl text-xs sm:text-sm overflow-x-auto text-green-300 border border-gray-700">
          {JSON.stringify(latestTx, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DAGData;
