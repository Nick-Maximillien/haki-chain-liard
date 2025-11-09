import { useEffect, useState } from "react";
import { ethers } from "ethers";
import HakiTokenABI from "../abis/HakiToken.json";
import BountyRegistryABI from "../abis/BountyRegistry.json";

// Declare window.ethereum for TypeScript compatibility
declare global {
  interface Window {
    ethereum?: any;
  }
}

const ROLES = {
  ADMIN_ROLE:
    "0xf23a6e3e6a9d3ff4e9f1d4fba2bbfe5edac2ffb87d3caaabcb246df9e4cb52f2",
  CASE_STEWARD_ROLE:
    "0xb52a0e93c274e53d5840a22ac681e47abf90d7f3b7850e7ba1c6641ecb5b40ad",
  NGO_ROLE:
    "0x1b4e2bcad84346b7f412505cbecf9f08ae814a25560718182c9b3f56847bfb3e",
  DONOR_ROLE:
    "0x756b0334d911da1e4c1a010bf7cb2ac2273a6dc5d2a5524f33a3eb18dc8d2b47",
  LAWYER_ROLE:
    "0xe46f1b29c7c4ff1df2a8c6b6c179e52f1d9b93a99a26c592e564af8a963a8b2b",
};

export default function LawyerContent() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [registry, setRegistry] = useState<any>(null);
  const [token, setToken] = useState<any>(null);
  const [balance, setBalance] = useState("0");
  const [lsk, setLsk] = useState("");
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [allBounties, setAllBounties] = useState<any[]>([]);
  const [appliedBounties, setAppliedBounties] = useState<any[]>([]);
  const [selectedBounties, setSelectedBounties] = useState<any[]>([]);

  const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
  const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
  const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

  /*** NETWORK & WALLET ***/
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://sepolia.infura.io/v3/YOUR_INFURA_KEY"],
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch {
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
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();

      const network = await prov.getNetwork();
      if (network.chainId !== BigInt(11155111)) await switchToSepolia();

      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, HakiTokenABI.abi, sign);
      const registryContract = new ethers.Contract(CONTRACT_ADDRESS, BountyRegistryABI.abi, sign);

      setProvider(prov);
      setSigner(sign);
      setAccount(addr);
      setToken(tokenContract);
      setRegistry(registryContract);

      const bal = await tokenContract.balanceOf(addr);
      setBalance(ethers.formatEther(bal));

      const roles: string[] = [];
      for (const [name, hash] of Object.entries(ROLES)) {
        if (await registryContract.hasRole(hash, addr)) roles.push(name);
      }
      setUserRoles(roles);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) setAccount("");
        else setAccount(accounts[0]);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err: any) {
      alert("Wallet connection failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const uploadLSK = async () => {
    if (!lsk || !registry || !signer) return alert("Enter LSK and connect wallet first");
    setLoading(true);
    try {
      const payload = { lsk };
      const res = await fetch("/api/pin-lsk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Pinning failed");
      const { cid } = await res.json();

      const verifyRes = await fetch(`${PINATA_GATEWAY}/${cid}`);
      const parsed = await verifyRes.json();
      const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(parsed)));

      const tx = await registry.registerLawyer(cid, payloadHash);
      await tx.wait();
      alert("✅ LSK pinned & registered on-chain");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBounties = async () => {
    if (!registry) return;
    const bounties = await registry.getAllBounties();
    setAllBounties(bounties);
  };

  const fetchAppliedBounties = async () => {
    if (!registry || !account) return;
    const bounties = await registry.getAllBounties();
    const applied: any[] = [];
    for (const b of bounties) {
      const apps = await registry.getApplications(b.id);
      if (apps.some((a: any) => a.lawyer.toLowerCase() === account.toLowerCase()))
        applied.push(b);
    }
    setAppliedBounties(applied);
  };

  const fetchSelectedBounties = async () => {
    if (!registry || !account) return;
    const bounties = await registry.getAllBounties();
    const selected = bounties.filter(
      (b: any) => b.assignedLawyer && b.assignedLawyer.toLowerCase() === account.toLowerCase()
    );
    setSelectedBounties(selected);
  };

  const applyForBounty = async (bountyId: any) => {
    if (!registry || !signer) return;
    const [cid, payloadHash] = await registry.getLawyerIdentity(account);
    if (!cid || payloadHash === ethers.ZeroHash) return alert("LSK not registered");

    const proposal = { summary: "I accept this bounty", timestamp: Date.now() };
    const proposalJSON = JSON.stringify(proposal);
    const proposalDocHash = ethers.keccak256(ethers.toUtf8Bytes(proposalJSON));

    const tx = await registry.applyForBounty(bountyId, cid, proposalDocHash);
    await tx.wait();
    alert("✅ Successfully applied for bounty");
    fetchAppliedBounties();
  };

  useEffect(() => {
    if (registry && account) {
      fetchBounties();
      fetchAppliedBounties();
      fetchSelectedBounties();
    }
  }, [registry, account]);

  return (
    <div className="container">
      <style>{`
        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 1.5rem;
          background: #fff;
          color: #000;
          font-family: sans-serif;
        }
        h1 { font-size: 1.8rem; margin-bottom: 1rem; }
        h2 { font-size: 1.2rem; margin-top: 1rem; font-weight: bold; }
        label { display: block; margin-top: 12px; }
        input { display: block; width: 100%; padding: 0.5rem; margin-top: 6px; border: 1px solid #000; border-radius: 4px; }
        button { cursor: pointer; border: none; border-radius: 4px; padding: 0.4rem 0.8rem; margin-top: 6px; font-size: 0.9rem; }
        .btn-accent { background: #0070f3; color: #fff; }
        ul { list-style: none; padding-left: 0; }
        li { margin-bottom: 6px; }
      `}</style>

      <h2>Store LSK No. on chain and apply for bounties</h2>

      {!account ? (
        <button className="btn-accent" onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <p>Connected: <b style={{ color: "green" }}>{account}</b></p>
      )}
      <p>Balance: {balance} HAKI</p>

      <div style={{ marginTop: 12, maxWidth: 600 }}>
        <label>Enter your LSK:</label>
        <input
          type="text"
          value={lsk}
          onChange={(e) => setLsk(e.target.value)}
          placeholder="LSK number"
        />
        <button onClick={uploadLSK} disabled={loading || !signer} className="btn-accent">
          {loading ? "Uploading..." : "Pin LSK & Register On-Chain"}
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Available Bounties</h2>
        <ul>
          {allBounties.map((b: any) => (
            <li key={b.id.toString()}>
              <strong>Bounty #{b.id.toString()}</strong> | Active: {b.active ? "Yes" : "No"}{" "}
              <button className="btn-accent" onClick={() => applyForBounty(b.id)}>
                Apply
              </button>
            </li>
          ))}
        </ul>

        <h2>Bounties You Applied For</h2>
        <ul>
          {appliedBounties.map((b: any) => (
            <li key={b.id.toString()}>
              <strong>Bounty #{b.id.toString()}</strong>
            </li>
          ))}
        </ul>

        <h2>Bounties You Were Selected For</h2>
        <ul>
          {selectedBounties.map((b: any) => (
            <li key={b.id.toString()}>
              <strong>Bounty #{b.id.toString()}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
