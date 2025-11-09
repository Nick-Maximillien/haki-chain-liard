'use client';
import { useState, useCallback, useMemo } from 'react';
import { keccak256 } from 'js-sha3';
import {
  FileText,
  Upload,
  Search,
  LogIn,
  HardHat,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DJANGO_URL = 'https://haki-backend-yy0c.onrender.com/documents/documents/';
const WALLET_REGISTER_URL = 'https://haki-backend-yy0c.onrender.com/documents/wallet/register/';

// -------------------------
// PLACEHOLDER COMPONENTS
// -------------------------
const LawyerSidebar = ({ onTourStart }: { onTourStart: () => void }) => (
  <div className="w-[280px] bg-white border-r border-gray-200 p-6 fixed h-full flex flex-col shadow-lg">
    <div className="flex items-center gap-3 mb-10 border-b pb-4">
      <HardHat className="w-6 h-6 text-indigo-600" />
      <h3 className="text-xl font-semibold text-gray-900">HakiChain Portal</h3>
    </div>
    <nav className="flex flex-col gap-2">
      <div className="flex items-center gap-3 p-3 text-teal-600 font-semibold bg-teal-50 rounded-lg">
        <FileText className="w-5 h-5" />
        HakiDocs Repository
      </div>
    </nav>
    <button
      onClick={onTourStart}
      className="mt-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-150 shadow-md"
    >
      Start Guide Tour
    </button>
  </div>
);

const TourGuide = ({ onComplete }: { onComplete: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full">
      <h2 className="text-2xl font-bold mb-4 text-indigo-700">Guided Tour Placeholder</h2>
      <p className="text-gray-700 mb-6">
        This placeholder ensures the component is runnable. In the real application, this would launch the interactive tour.
      </p>
      <button
        onClick={onComplete}
        className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition duration-150"
      >
        Exit Tour
      </button>
    </div>
  </div>
);

// -------------------------
// MAIN COMPONENT
// -------------------------
export default function HakiDocs() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<{ [key: number]: boolean }>({});
  const [showTour, setShowTour] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  // -------------------------
  // FETCH DOCUMENTS
  // -------------------------
  const fetchDocs = useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`${DJANGO_URL}?doc_type=repository&wallet=${wallet}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error fetching docs: ${res.status}`);
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, []);

  // -------------------------
  // CONNECT WALLET
  // -------------------------
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert('Please install MetaMask to connect your wallet.');
      return;
    }
    setLoading(true);
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const wallet = accounts[0] as string;
      setWalletAddress(wallet);
      await fetchDocs(wallet);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // SIGN AND UPLOAD DOCUMENT
  // -------------------------
  const signFile = async (file: File) => {
    if (!walletAddress) throw new Error('Wallet not connected');
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hash = '0x' + keccak256(bytes);
    const signature = await (window as any).ethereum.request({
      method: 'personal_sign',
      params: [hash, walletAddress],
    });
    return signature;
  };

  const registerWalletDocument = async (file: File) => {
    if (!walletAddress || !file) {
      alert('Missing wallet address or file.');
      return;
    }
    setLoading(true);
    try {
      const signature = await signFile(file);
      const formData = new FormData();
      formData.append('wallet', walletAddress);
      formData.append('signature', signature);
      formData.append('doc_type', 'repository');
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('file', file);

      const registerRes = await fetch(WALLET_REGISTER_URL, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!registerRes.ok) throw new Error(`Wallet registration failed: ${registerRes.status}`);

      setSelectedFile(null);
      setUploadTitle('');
      setUploadDescription('');
      await fetchDocs(walletAddress);
    } catch (err) {
      console.error('Document submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const toggleAgentOutput = (id: number) => {
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(
      (doc) =>
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="flex min-h-screen bg-gray-50">
      {showTour && <TourGuide onComplete={() => setShowTour(false)} />}
      <LawyerSidebar onTourStart={() => setShowTour(true)} />

      <div className="flex-1 ml-[280px] p-8">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">HakiDocs Repository</h1>
              </div>
              <p className="text-lg text-gray-600">Secure, blockchain-registered document management for HakiChain.</p>
            </div>

            <div className="flex gap-3 items-center">
              {walletAddress ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl font-medium shadow-md border border-green-200 text-sm">
                  <LogIn className="w-5 h-5" />
                  <span className="truncate max-w-[150px]">{walletAddress}</span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md transition"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}

              <label className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl font-medium cursor-pointer transition duration-150 shadow-md ${walletAddress ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                <Upload className="w-4 h-4" />
                Upload Document
                <input
                  type="file"
                  onChange={handleFileSelection}
                  disabled={!walletAddress}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* UPLOAD FORM */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-teal-200">
              <h3 className="text-xl font-semibold text-teal-700 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Prepare Document for Registration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => selectedFile && registerWalletDocument(selectedFile)}
                  disabled={loading || !uploadTitle || !uploadDescription}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition duration-150 shadow-md disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Sign & Upload'}
                </button>
              </div>
            </div>
          )}

          {/* SEARCH */}
          <div className="flex items-center gap-3 mb-6">
            <Search className="text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* DOCUMENT LIST */}
          {filteredDocuments.length > 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                📄 Your Repository Documents ({filteredDocuments.length})
              </h2>
              <ul className="divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <li key={doc.id} className="py-4 hover:bg-indigo-50 rounded-lg transition px-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-indigo-700">{doc.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {doc.description?.substring(0, 150) || 'No description.'}
                        </p>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm ml-4"
                      >
                        View
                      </a>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs text-gray-500">
                      <div><b>Type:</b> {doc.doc_type}</div>
                      <div><b>Created:</b> {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'N/A'}</div>
                      <div className="flex flex-col">
                      <span className="font-bold text-gray-700">User Wallet</span>
                      <span className="font-mono overflow-hidden whitespace-nowrap text-ellipsis" title={doc.user}>
                        {doc.user ? doc.user.split('@')[0] : 'N/A'}
                      </span>
                    </div>
                      <div><b>IPFS CID:</b> {doc.ipfs_cid || 'N/A'}</div>
                      <div><b>Story ID:</b> {doc.id || 'N/A'}</div>
                      <div><b>Constellation TX:</b> {doc.dag_tx || 'N/A'}</div>
                    </div>

                    <button
                      onClick={() => toggleAgentOutput(doc.id)}
                      className="mt-3 text-sm text-indigo-600 hover:underline flex items-center"
                    >
                      {expandedDocs[doc.id] ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" /> Hide Generated Text
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" /> Show Generated Text
                        </>
                      )}
                    </button>

                    {expandedDocs[doc.id] && (
                      <pre className="text-[10px] whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-2 mt-2 max-h-48 overflow-y-auto">
                        {doc.generated_text || JSON.stringify(doc.agent_result, null, 2) || 'No generated text.'}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 text-center mt-20">
              {walletAddress
                ? 'No repository documents found.'
                : 'Connect your wallet to view documents.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
