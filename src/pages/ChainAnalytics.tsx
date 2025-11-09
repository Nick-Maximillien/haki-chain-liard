import React, { useEffect, useState } from "react";
import { Shield, Search } from "lucide-react";
import { BrowserProvider, Contract } from "ethers";
import StoryIPRegisterABI from "../abis/StoryIPRegister.json";

const ORG_CONTRACT_ADDRESS = "0x2afce5b30DFD0d53a98e65d23E7D620701023f3C";
const USER_CONTRACT_ADDRESS = "0x7466cfc967C4FfF0907eD5BEe8DB067459ad25Fc";
const RPC_URL = "https://aeneid.storyrpc.io/";
const CHAIN_ID = 1315;

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface Asset {
  id: number;
  title: string;
  contentHash: string;
  metadataJSON: string;
  owner: string;
  timestamp: number;
}

export interface ICPRecord {
  id: number;
  metadataHash: string;
  owner: string;
  registeredAt: string;
}

export const ChainAnalytics: React.FC = () => {
  const [wallet, setWallet] = useState<string>("");
  const [orgAssets, setOrgAssets] = useState<Asset[]>([]);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [icpRecords, setIcpRecords] = useState<ICPRecord[]>([]);
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpError, setIcpError] = useState("");

  // -------------------------
  // Wallet Connection
  // -------------------------
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask not installed");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x523",
              chainName: "Story Aeneid",
              rpcUrls: [RPC_URL],
              nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
            },
          ],
        });
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      setWallet(accounts[0]);
      console.log("[Wallet] Connected:", accounts[0]);
    } catch (err) {
      console.error("[Wallet] Connection failed:", err);
      setError("Failed to connect wallet");
    }
  };

  useEffect(() => {
    if (window.ethereum && !wallet) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setWallet(accounts[0] || "");
      });
    }
  }, [wallet]);

  // -------------------------
  // Fetch Story Assets
  // -------------------------
  const fetchAssets = async (
    contractAddress: string,
    setState: React.Dispatch<React.SetStateAction<Asset[]>>
  ) => {
    if (!wallet) {
      console.log(`[DEBUG] fetchAssets bypassed for ${contractAddress}: wallet is empty or not yet connected.`);
      return;
    }
    console.log(`[DEBUG] Starting fetchAssets for contract: ${contractAddress}. Wallet: ${wallet}`);

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(contractAddress, StoryIPRegisterABI, provider);

      console.log(`[DEBUG] Calling getAssetsByOwner(${wallet}) on contract: ${contractAddress}`);
      const ids: bigint[] = await contract.getAssetsByOwner(wallet);
      console.log(`[DEBUG] Contract ${contractAddress} returned ${ids.length} asset IDs: ${ids.map(id => id.toString())}`);

      const fetched: Asset[] = [];

      for (const id of ids) {
        const a = await contract.getAsset(id);
        fetched.push({
          id: Number(a.id),
          title: a.title,
          contentHash: a.contentHash,
          metadataJSON: a.metadataJSON,
          owner: a.owner,
          timestamp: Number(a.timestamp),
        });
      }

      setState(fetched.reverse());
      console.log(`[DEBUG] Successfully set ${fetched.length} assets for contract: ${contractAddress}.`);
    } catch (err) {
      console.error(`[Load] Error fetching assets for ${contractAddress}:`, err);
      setError("Failed to load assets from contract");
    } finally {
      setLoading(false);
      console.log(`[DEBUG] Fetch process finished for contract: ${contractAddress}`);
    }
  };

  useEffect(() => {
    if (wallet) {
      console.log("[DEBUG] Wallet state changed/connected. Triggering asset fetches.");
      fetchAssets(ORG_CONTRACT_ADDRESS, setOrgAssets);
      fetchAssets(USER_CONTRACT_ADDRESS, setUserAssets);
    } else {
      console.log("[DEBUG] Wallet is disconnected. Asset fetches skipped.");
    }
  }, [wallet]);

  // -------------------------
  // Fetch ICP metadata directly from Django
  // -------------------------
const fetchICPRecords = async () => {
  try {
    setIcpLoading(true);
    setIcpError("");
    const response = await fetch("http://192.168.137.179:8000/documents/icp/records/");
    if (!response.ok) throw new Error("Failed to fetch ICP records");

    const data = await response.json();
    console.log("Data:", data)

    const recordsArray: ICPRecord[] = Array.isArray(data) ? data : data.results ?? [];

    setIcpRecords(recordsArray);
  } catch (err: any) {
    console.error("[ICP] Error fetching metadata:", err);
    setIcpError(err.message || "Failed to fetch ICP records");
    setIcpRecords([]);
  } finally {
    setIcpLoading(false);
  }
};

// ✅ Call it once on mount
useEffect(() => {
  fetchICPRecords();
}, []);



  const filteredOrgAssets = orgAssets.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contentHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUserAssets = userAssets.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contentHash.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredICPRecords = icpRecords.filter(
  (r) => {
    // Treat null/undefined/'' values as an empty string for safety
    const metadataHash = r.metadataHash ?? "";
    const owner = r.owner ?? "";

    return (
        metadataHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.toLowerCase().includes(searchTerm.toLowerCase())
    );
}
);

  // -------------------------
  // Render
  // -------------------------
  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white border rounded-lg">
        <p className="text-gray-600 mb-4 text-center">
          Connect your wallet to view your Story IP assets.
        </p>
        <button
          onClick={connectWallet}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          Connect Wallet
        </button>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (loading || icpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Chain Analytics Dashboard</h1>
        <span className="text-sm text-gray-500 truncate">Wallet: {wallet}</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by title, hash, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Story Organization Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Organization IP Assets on Story</h2>
        {filteredOrgAssets.length === 0 ? (
          <EmptyMessage message="No organization IP assets found." />
        ) : (
          <AssetTable assets={filteredOrgAssets} />
        )}
      </div>

      {/* Story User Assets */}
      <div>
        <h2 className="text-xl font-semibold mb-2">User IP Assets on Story</h2>
        {filteredUserAssets.length === 0 ? (
          <EmptyMessage message="No user IP assets found." />
        ) : (
          <AssetTable assets={filteredUserAssets} />
        )}
      </div>

      {/* ICP Records */}
      <div>
        <h2 className="text-xl font-semibold mb-2">ICP Metadata Registry</h2>
        {icpError ? (
          <p className="text-red-600">{icpError}</p>
        ) : filteredICPRecords.length === 0 ? (
          <EmptyMessage message="No ICP records found." />
        ) : (
          <ICPTable records={filteredICPRecords} />
        )}
      </div>
    </div>
  );
};

// -------------------------
// Generic Empty Message
// -------------------------
const EmptyMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500 text-base">{message}</p>
  </div>
);

// -------------------------
// Story Asset Table
// -------------------------
const AssetTable: React.FC<{ assets: Asset[] }> = ({ assets }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50 border-b border-gray-200">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Title</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Hash</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Registered</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {assets.map((asset) => (
            <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                    {asset.title[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{asset.title}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{asset.contentHash}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{new Date(asset.timestamp * 1000).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
);

// -------------------------
// ICP Table (Corrected)
// -------------------------
const ICPTable: React.FC<{ records: ICPRecord[] }> = ({ records }) => {

  // 1. Define the utility function inside the component for easy access.
  // This function converts the large nanosecond string to a standard millisecond timestamp number.
  const formatICPDate = (nanosString: string): string => {
    try {
      if (!nanosString || nanosString === "None") return "N/A";

      // Use BigInt to safely handle the very large number
      const nanos = BigInt(nanosString);

      // Divide by 1,000,000 (10^6) to convert nanoseconds to milliseconds
      const millis = Number(nanos / BigInt(1_000_000));
        
      // Format the standard millisecond timestamp
      return new Date(millis).toLocaleDateString();
    } catch (e) {
      // Fallback for any parsing errors
      console.error("Error converting ICP date:", e);
      return "Invalid Date Format";
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Metadata Hash</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Registered At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((rec) => (
            <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-900">{rec.id}</td>
              <td className="px-6 py-4 text-sm text-gray-600 truncate">{rec.metadataHash ?? '—'}</td>
              <td className="px-6 py-4 text-sm text-gray-600 truncate">{rec.owner ?? 'Unassigned'}</td>
              {/* 2. Apply the utility function here! */}
              <td className="px-6 py-4 text-sm text-gray-600">{formatICPDate(rec.registeredAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
