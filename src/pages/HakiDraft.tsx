import { useState, useEffect } from "react";
// Assuming these components exist and are correctly imported in the actual environment
// import LawyerSidebar from "../components/LawyerSidebar";
// import TourGuide from "../components/TourGuide";
import { Wand2, FileText } from "lucide-react";

// Mock imports for runnable single-file component (replace with your actual imports)
const LawyerSidebar = ({ onTourStart }: { onTourStart: () => void }) => (
  <div className="w-[280px] fixed h-full bg-gray-800 text-white p-4">
    <h3 className="text-xl font-bold mb-6">HakiDraft Menu</h3>
    <button onClick={onTourStart} className="text-blue-300 hover:text-blue-100">Start Tour</button>
  </div>
);
const TourGuide = ({ onComplete }: { onComplete: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-2xl">
      <p>Welcome to the Tour Guide!</p>
      <button onClick={onComplete} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded">End Tour</button>
    </div>
  </div>
);
// --- End Mock Imports ---


const documentCategories = [
  "General Documents",
  "Litigation",
  "Corporate / Business",
  "Real Estate / Property",
  "Family Law",
  "Succession / Estate",
  "Employment / Labor",
  "Intellectual Property",
  "Immigration",
  "Regulatory / Compliance",
  "Academic / Legal Research",
];

const documentTypesByCategory: Record<string, string[]> = {
  "General Documents": ["Letter of Demand", "Affidavit", "Power of Attorney", "Statutory Declaration"],
  Litigation: ["Statement of Claim", "Statement of Defense", "Notice of Motion", "Submissions"],
  "Corporate / Business": ["Memorandum of Association", "Articles of Association", "Shareholders Agreement", "Board Resolution"],
  "Real Estate / Property": ["Sale Agreement", "Lease Agreement", "Transfer Documents", "Charge Documents"],
  "Family Law": ["Divorce Petition", "Custody Agreement", "Maintenance Order", "Prenuptial Agreement"],
  "Succession / Estate": ["Will", "Grant of Probate", "Letters of Administration", "Succession Cause"],
  "Employment / Labor": ["Employment Contract", "Termination Letter", "Non-Disclosure Agreement", "Non-Compete Agreement"],
  "Intellectual Property": ["Trademark Application", "Patent Application", "Copyright Assignment", "License Agreement"],
  Immigration: ["Work Permit Application", "Visa Application", "Citizenship Application", "Appeal Letter"],
  "Regulatory / Compliance": ["Compliance Certificate", "Regulatory Submission", "Audit Report", "Complaint Response"],
  "Academic / Legal Research": ["Legal Opinion", "Research Memorandum", "Case Summary", "Legislative Brief"],
};

// Django Backend URLs
const DJANGO_URL = "http://localhost:8000/documents/documents/";
const WALLET_REGISTER_URL = "http://localhost:8000/documents/wallet/register/";

export default function HakiDraft({ caseData }: { caseData?: any }) {
  const [showTour, setShowTour] = useState(false);
  const [category, setCategory] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [clientName, setClientName] = useState("");
  const [caseType, setCaseType] = useState("");
  const [description, setDescription] = useState(
    caseData
      ? `Suspect URL: ${caseData.metadata?.url}\n\nExcerpt:\n${caseData.metadata?.excerpt || "N/A"}`
      : ""
  );
  const [jurisdiction, setJurisdiction] = useState("Kenya");
  const [requirements, setRequirements] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    if (caseData) {
      console.log(" Case data loaded:", caseData);
      // NOTE: Replaced standard alert() with a console warning as alert() is discouraged in iframes
      console.warn(
        'Case data imported from Cases — review details and click "Generate AI Draft" to proceed.'
      );

      const caseCategory = caseData.metadata?.case_type || "";
      const caseDocType = caseData.metadata?.document_type || "";

      if (documentCategories.includes(caseCategory)) {
        console.log(" Setting category:", caseCategory);
        setCategory(caseCategory);

        if (documentTypesByCategory[caseCategory]?.includes(caseDocType)) {
          console.log(" Setting documentType:", caseDocType);
          setDocumentType(caseDocType);
        }
      }
    }
  }, [caseData]);

  const handleJurisdictionToggle = (country: string) => {
    console.log(" Toggling jurisdiction:", country);
    setJurisdiction((prev) =>
      prev.includes(country) ? prev.replace(country, "") : prev + (prev ? ", " : "") + country
    );
  };

  const connectWallet = async () => {
    console.log(" Connecting wallet...");
    if (!(window as any).ethereum) {
      console.warn(" MetaMask not detected");
      // NOTE: Replaced standard alert() with a console warning
      console.warn("Please install MetaMask.");
      return;
    }
    try {
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const wallet = accounts[0];
      console.log(" Wallet connected:", wallet);
      setWalletAddress(wallet);
      await fetchDrafts(wallet);
    } catch (err) {
      console.error("❌ Wallet connection failed:", err);
    }
  };

  const fetchDrafts = async (wallet: string) => {
  try {
    const res = await fetch(`${DJANGO_URL}?doc_type=draft&wallet=${wallet}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Error fetching drafts: ${res.status}`);
    const data = await res.json();
    setDocuments(data);

    // Set AI output to most recent draft
    if (data.length > 0) {
      const latestDraft = data[0]; // assuming API returns newest first
      setAiOutput(latestDraft.generated_text || "");
      setGeneratedDoc(latestDraft.generated_text || "");
    } else {
      setAiOutput("");
      setGeneratedDoc("");
    }
  } catch (err) {
    console.error("fetchDrafts error:", err);
  }
};


  const signFile = async (file: File) => {
    console.log("🖋️ Signing file:", file.name);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hex = "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    console.log("🔑 File hex prepared for signing");
    return await (window as any).ethereum.request({ method: "personal_sign", params: [hex, walletAddress] });
  };

  const registerWalletDocument = async (file: File | null) => {
    console.log("📎 Registering wallet document...");
    if (!walletAddress || !file) {
      console.warn("⚠️ Missing wallet or file");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("wallet", walletAddress);
      formData.append("signature", await signFile(file));
      formData.append("title", clientName || "Untitled");
      formData.append("description", description);
      formData.append("file", file);

      const res = await fetch(WALLET_REGISTER_URL, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      console.log("⬅️ Wallet register response status:", res.status);
      if (!res.ok) throw new Error(`Wallet registration failed: ${res.status}`);
      const data = await res.json();
      console.log("✅ Wallet document registered:", data);
      return data;
    } catch (err) {
      console.error("❌ registerWalletDocument error:", err);
    }
  };

  const generateAIDraft = async () => {
    console.log("⚙️ Generating AI draft...");
    if (!walletAddress || !clientName || !category || !documentType) {
      console.warn("⚠️ Missing required fields for AI draft");
      // NOTE: Replaced standard alert()
      console.warn("Please fill all required fields: Client Name, Category, Document Type.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: documentType,
        description,
        doc_type: "draft",
        category,
        jurisdiction,
        requirements: requirements ? JSON.parse(requirements) : {},
        client_name: clientName,
        wallet: walletAddress,
        ...(caseData ? { case_id: caseData.id } : {}),
      };
      console.log("📤 AI draft payload:", payload);

      const res = await fetch(DJANGO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      console.log("⬅ AI draft response status:", res.status);

      if (!res.ok) throw new Error(`AI generation failed: ${res.status}`);
      const data = await res.json();
      console.log(" AI draft generated:", data);

      const generated = data.generated_text || data.output || "AI generation complete (no text returned).";
      setAiOutput(generated);
      setGeneratedDoc(generated);
      setShowAI(true);
      await fetchDrafts(walletAddress);
    } catch (err) {
      console.error("❌ Error generating AI draft:", err);
      // NOTE: Replaced standard alert()
      console.warn("Error generating AI draft. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    console.log("💾 Saving draft...");
    if (!walletAddress || !clientName) {
      console.warn("⚠️ Wallet or clientName missing for saveDraft");
      // NOTE: Replaced standard alert()
      console.warn("Please connect wallet and fill client name.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: documentType,
        description: aiOutput || description,
        doc_type: "draft",
        category,
        jurisdiction,
        requirements: requirements ? JSON.parse(requirements) : {},
        client_name: clientName,
        wallet: walletAddress,
        ...(caseData ? { case_id: caseData.id } : {}),
      };
      console.log("📤 Save draft payload:", payload);

      const res = await fetch(DJANGO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      console.log("⬅️ Save draft response status:", res.status);

      if (!res.ok) throw new Error(`Failed to save draft: ${res.status}`);
      await fetchDrafts(walletAddress);
      console.log("✅ Draft saved successfully");
      // NOTE: Replaced standard alert()
      console.log("Draft saved successfully!");
    } catch (err) {
      console.error("❌ Error saving draft:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {showTour && <TourGuide onComplete={() => setShowTour(false)} />}
      {/* Assuming LawyerSidebar exists */}
      {/* <LawyerSidebar onTourStart={() => setShowTour(true)} /> */}
      <div className="flex-1 ml-[280px] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">HakiDraft AI Generator</h1>
          </div>

          {!walletAddress ? (
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-md transition duration-150 ease-in-out mb-4"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-green-600 mb-4 font-medium">
              ✅ Wallet Connected: <span className="font-mono text-sm">{walletAddress}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
              <h2 className="text-xl font-semibold border-b pb-2 mb-2">Document Details</h2>
              <div>
                <label className="block mb-1 font-medium">
                  Document Category <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setDocumentType("");
                  }}
                >
                  <option value="">Select category</option>
                  {documentCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {category && (
                <div>
                  <label className="block mb-1 font-medium">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    {documentTypesByCategory[category]?.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block mb-1 font-medium">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Case Type (Optional)</label>
                <input
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  type="text"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  placeholder="e.g., Civil, Family Law"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Description (Key facts and instructions)</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="e.g., Parties involved, core dispute, relief sought..."
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">Jurisdiction</label>
                <div className="flex flex-wrap gap-4">
                  {["Kenya", "Uganda", "Nigeria", "Ghana"].map((c) => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={jurisdiction.includes(c)}
                        onChange={() => handleJurisdictionToggle(c)}
                        className="form-checkbox text-blue-600 rounded"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Requirements JSON (optional, advanced)</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                  placeholder='e.g., {"clause_type": "indemnity"}'
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
                  onClick={generateAIDraft}
                  disabled={loading || !walletAddress}
                >
                  {loading ? "Generating..." : "Generate AI Draft"}
                </button>
                <button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold transition"
                  onClick={saveDraft}
                  disabled={loading || !walletAddress}
                >
                  Save Draft
                </button>
                <button
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold transition"
                  onClick={() => setShowDrafts(!showDrafts)}
                >
                  {showDrafts ? "Hide Drafts" : "Show Drafts"}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 h-[600px] overflow-y-auto">
              <h2 className="text-xl font-semibold border-b pb-2 mb-4 text-purple-600">Your AI Draft</h2>
              {aiOutput ? (
                <div className="flex flex-col h-full">
                  <pre className="text-sm whitespace-pre-wrap font-mono p-3 bg-gray-50 border rounded flex-grow overflow-auto mb-4">
                    {aiOutput}
                  </pre>
                  <div className="flex gap-2 mt-auto">
                    <button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded font-semibold transition">
                      Download PDF
                    </button>
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition">
                      Download DOCX
                    </button>
                    <button
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold transition"
                      onClick={() => {
                        setAiOutput(null);
                        setGeneratedDoc("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 h-full">
                  <FileText className="w-16 h-16 mb-4 text-gray-400" />
                  <p className="text-lg">Your generated legal draft will appear here.</p>
                  <p className="text-sm mt-2">
                    Fill the form, ensure your wallet is connected, and click "Generate AI Draft".
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showDrafts && documents.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              📁 Your Drafts ({documents.length})
            </h2>
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id} className="py-4 hover:bg-purple-50 rounded-lg transition duration-150 ease-in-out px-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-purple-700">{doc.title}</span>
                      <p className="text-sm text-gray-600 mt-1 italic line-clamp-2">
                        {/* Shortened description for clean list view */}
                        {doc.description ? doc.description.substring(0, 150) + (doc.description.length > 150 ? "..." : "") : "No detailed description."}
                      </p>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm ml-4 flex-shrink-0"
                    >
                      View Document
                    </a>
                  </div>

                  {/* Display Key Metadata Fields - Showing all key fields cleanly */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs text-gray-500">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Story ID:</span>
                      <span className="font-mono">{doc.id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Agent Status</span>
                      <span className={`font-mono font-semibold ${doc.agent_status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {doc.agent_status || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Created At</span>
                      <span className="font-mono">
                        {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Document Type</span>
                      <span className="font-mono">{doc.doc_type || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">User Wallet</span>
                      <span className="font-mono overflow-hidden whitespace-nowrap text-ellipsis" title={doc.user}>
                        {doc.user ? doc.user.split('@')[0] : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">ICP ID</span>
                      <span className="font-mono">{doc.icp_id || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">IPFS CID</span>
                      <span className="font-mono overflow-hidden whitespace-nowrap text-ellipsis" title={doc.ipfs_cid}>
                        {doc.ipfs_cid || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Tags</span>
                      <span className="font-mono">{doc.tags && doc.tags.length > 0 ? doc.tags.join(', ') : 'None'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700">Constellation Hash:</span>
                      <span className="font-mono">{doc.dag_tx || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Detailed, Raw Data Display - fulfills requirement to show ALL data */}
                  <details className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded-lg shadow-inner">
                    <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-purple-600 transition">
                      Show Draft (Click to expand)
                    </summary>
                    <pre className="text-[10px] whitespace-pre-wrap font-mono mt-2 p-1 max-h-40 overflow-y-auto bg-white border border-dashed border-gray-200 rounded">
                    {doc.generated_text}
                    </pre>
                  </details>
                  
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}