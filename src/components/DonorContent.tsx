"use client";
import { useState } from "react";
import { ethers } from "ethers";
import BountyRegistryABI from "../abis/BountyRegistry.json";
import BountyEscrowABI from "../abis/BountyEscrow.json";
import HakiTokenABI from "../abis/HakiToken.json";

// Declare window.ethereum for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Bounty {
  id: string;
  active: boolean;
  lawyerSelected: boolean;
}

export default function DonorContent() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [registry, setRegistry] = useState<ethers.Contract | null>(null);
  const [escrow, setEscrow] = useState<ethers.Contract | null>(null);
  const [token, setToken] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [donorId, setDonorId] = useState<string>("");
  const [cid, setCid] = useState<string>("");
  const [bountyId, setBountyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [donorContributions, setDonorContributions] = useState<Record<string, string>>({});
  const [escrowBalances, setEscrowBalances] = useState<Record<string, string>>({});
  const [allBounties, setAllBounties] = useState<Bounty[]>([]);

  const SEPOLIA_CHAIN_ID = "0xaa36a7";

  /*** NETWORK & WALLET ***/
  const switchToSepolia = async () => {
    try {
      console.log("Switching to Sepolia network...");
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      console.log("Successfully switched to Sepolia.");
    } catch (err: any) {
      console.error("switchToSepolia error:", err);
      if (err.code === 4902) {
        try {
          await window.ethereum?.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://sepolia.infura.io/v3/<YOUR_INFURA_KEY>"],
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          console.log("Sepolia network added.");
        } catch (addErr) {
          console.error("Failed to add Sepolia network:", addErr);
          alert("⚠️ Failed to add Sepolia network.");
        }
      } else {
        alert("⚠️ Failed to switch to Sepolia.");
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not found");

    try {
      setIsConnecting(true);
      console.log("Connecting wallet...");
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();
      console.log("Wallet connected:", addr);

      const network = await prov.getNetwork();
      console.log("Network info:", network);
      if (Number(network.chainId) !== 11155111) await switchToSepolia();

      const tokenContract = new ethers.Contract(
        import.meta.env.VITE_TOKEN_ADDRESS,
        HakiTokenABI.abi,
        sign
      );
      const registryContract = new ethers.Contract(
        import.meta.env.VITE_REGISTRY_ADDRESS,
        BountyRegistryABI.abi,
        sign
      );
      const escrowContract = new ethers.Contract(
        import.meta.env.VITE_ESCROW_ADDRESS,
        BountyEscrowABI.abi,
        sign
      );

      setSigner(sign);
      setAccount(addr);
      setToken(tokenContract);
      setRegistry(registryContract);
      setEscrow(escrowContract);

      console.log("Contracts initialized:", {
        token: tokenContract.address,
        registry: registryContract.address,
        escrow: escrowContract.address,
      });

      await fetchDonorData(registryContract, escrowContract, addr);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        setAccount(accounts.length ? accounts[0] : "");
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      alert("Wallet connection failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  /*** DONOR FUNCTIONS ***/
  const registerDonor = async () => {
    if (!donorId || !registry || !signer) return alert("Enter Donor ID & connect wallet");

    setLoading(true);
    try {
      console.log("Registering donor:", donorId);
      const payload = { donorId };
      const res = await fetch("/api/pin-lsk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Pinning failed");
      const { cid: pinnedCid } = await res.json();
      console.log("CID pinned:", pinnedCid);
      setCid(pinnedCid);

      const gateway = import.meta.env.VITE_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";
      const verifyRes = await fetch(`${gateway}/${pinnedCid}`);
      const parsed = await verifyRes.json();
      console.log("Parsed IPFS data:", parsed);
      const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(parsed)));

      console.log("Registering donor on-chain...");
      await registry!.registerDonor(pinnedCid, payloadHash);
      console.log("Donor registered on-chain successfully.");
      alert(`✅ Donor registered on-chain.\nCID: ${pinnedCid}`);
      await fetchDonorData(registry!, escrow!, account);
    } catch (err: any) {
      console.error("Donor registration failed:", err);
      alert(`Donor registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fundBounty = async () => {
    if (!bountyId || !amount || !escrow || !token || !account) return alert("Enter bountyId & amount");

    try {
      console.log(`Funding bounty ${bountyId} with ${amount} HAKI`);
      const weiAmount = ethers.parseUnits(amount, 18);
      await token!.approve(import.meta.env.VITE_ESCROW_ADDRESS, weiAmount);
      const tx = await escrow!.deposit(bountyId, account, weiAmount);
      console.log("Deposit transaction:", tx);
      alert(`✅ Donor funded bounty ${bountyId} with ${amount} HAKI`);
      await fetchDonorData(registry!, escrow!, account);
    } catch (err: any) {
      console.error("Funding failed:", err);
      alert("Funding failed: " + err.message);
    }
  };

  const fetchDonorData = async (
    registryContract: ethers.Contract,
    escrowContract: ethers.Contract,
    donorAddress: string
  ) => {
    try {
      console.log("Fetching all bounties...");
      const rawBounties: any[] = await registryContract.getAllBounties();
      console.log("Raw bounties:", rawBounties);

      // Convert BigInt IDs to strings
      const bounties: Bounty[] = rawBounties.map((b) => ({
        id: b.id.toString(),
        active: b.active,
        lawyerSelected: b.lawyerSelected,
      }));

      console.log("Processed bounties:", bounties);
      setAllBounties(bounties);

      const contribs: Record<string, string> = {};
      const balances: Record<string, string> = {};

      for (const b of bounties) {
        console.log("Processing bounty:", b.id);
        const c = await escrowContract.getDonorContribution(b.id, donorAddress);
        console.log(`Contribution for bounty ${b.id}:`, c.toString());
        contribs[b.id] = ethers.formatUnits(c, 18);

        const balance = await escrowContract.getBountyBalance(b.id);
        console.log(`Escrow balance for bounty ${b.id}:`, balance.toString());
        balances[b.id] = ethers.formatUnits(balance, 18);
      }

      setDonorContributions(contribs);
      setEscrowBalances(balances);

      console.log("Donor contributions:", contribs);
      console.log("Escrow balances:", balances);
    } catch (err) {
      console.error("fetchDonorData error:", err);
    }
  };

  return (
    <div className="container">
      <style>{`
        .container { max-width: 900px; margin:0 auto; padding:1.5rem; background:#fff; color:#000; font-family:sans-serif; }
        h1 { font-size:1.8rem; margin-bottom:1rem; }
        h2 { font-size:1.2rem; margin-top:1rem; font-weight:bold; }
        label { display:block; margin-top:12px; }
        input { display:block; width:100%; padding:0.5rem; margin-top:6px; border:1px solid #000; border-radius:4px; }
        button { cursor:pointer; border:none; border-radius:4px; padding:0.4rem 0.8rem; margin-top:6px; font-size:0.9rem; }
        .btn-accent { background:#0070f3; color:#fff; }
        .bounty-card { border:1px solid #ccc; border-radius:4px; padding:12px; margin-top:12px; }
        a { color:#0070f3; text-decoration:underline; }
      `}</style>

      <h1>Donor Dashboard</h1>

      {!account ? (
        <button className="btn-accent" onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <p>Connected: <b>{account}</b></p>
      )}

      <div style={{ marginTop: 12, maxWidth: 600 }}>
        <label>Donor ID / Name:</label>
        <input type="text" value={donorId} onChange={(e) => setDonorId(e.target.value)} />
        <button onClick={registerDonor} disabled={loading || !signer} className="btn-accent">
          {loading ? "Registering..." : "Register Donor On-Chain"}
        </button>
      </div>

      {cid && (
        <p style={{ marginTop: 12 }}>
          Pinned CID:{" "}
          <a href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer">
            {cid}
          </a>
        </p>
      )}

      <h2>Fund a Bounty</h2>
      <input
        type="text"
        placeholder="Bounty ID"
        value={bountyId}
        onChange={(e) => setBountyId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Amount (HAKI)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={fundBounty} className="btn-accent">
        Fund Bounty
      </button>

      <h2>Your Contributions & Bounty Balances</h2>
      {allBounties.length === 0 && <p>No bounties available yet.</p>}
      {allBounties.map((b) => (
        <div key={b.id} className="bounty-card">
          <p>Bounty ID: {b.id}</p>
          <p>Active: {b.active ? "Yes" : "No"}</p>
          <p>Lawyer Selected: {b.lawyerSelected ? "Yes" : "No"}</p>
          <p>Total Escrow Balance: {escrowBalances[b.id] ?? "0"} HAKI</p>
          <p>Your Contribution: {donorContributions[b.id] ?? "0"} HAKI</p>
        </div>
      ))}
    </div>
  );
}
