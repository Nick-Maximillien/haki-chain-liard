"use client";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import HakiTokenABI from "../abis/HakiToken.json";
import BountyRegistryABI from "../abis/BountyRegistry.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Bounties() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState("");
  const [registry, setRegistry] = useState<any>(null);
  const [allBounties, setAllBounties] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;
  const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
  const PINATA_GATEWAY =
    import.meta.env.VITE_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

  /*** NETWORK & WALLET ***/
  const switchToSepolia = async () => {
    console.log("switchToSepolia: Attempting to switch network...");
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
      console.log("switchToSepolia: Successfully switched network");
    } catch (err: any) {
      console.error("switchToSepolia: Error switching network", err);
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
          console.log("switchToSepolia: Added Sepolia network successfully");
        } catch (addErr) {
          console.error("switchToSepolia: Failed to add Sepolia:", addErr);
          alert("⚠️ Failed to add Sepolia network.");
        }
      } else {
        alert("⚠️ Failed to switch to Sepolia.");
      }
    }
  };

  const connectWallet = async () => {
    console.log("connectWallet: Connecting...");
    if (!window.ethereum) return alert("MetaMask not found");
    try {
      setIsConnecting(true);
      const prov = new ethers.BrowserProvider(window.ethereum);
      console.log("connectWallet: Provider initialized", prov);

      await prov.send("eth_requestAccounts", []);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();
      console.log("connectWallet: Connected account", addr);

      const network = await prov.getNetwork();
      console.log("connectWallet: Current network", network);
      if (Number(network.chainId) !== 11155111) await switchToSepolia();

      const registryContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        BountyRegistryABI.abi,
        sign
      );
      console.log("connectWallet: Registry contract initialized", registryContract);

      setProvider(prov);
      setSigner(sign);
      setAccount(addr);
      setRegistry(registryContract);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        console.log("connectWallet: accountsChanged", accounts);
        if (accounts.length === 0) setAccount("");
        else setAccount(accounts[0]);
      });
      window.ethereum.on("chainChanged", () => {
        console.log("connectWallet: chainChanged event detected, reloading page...");
        window.location.reload();
      });
    } catch (err: any) {
      console.error("connectWallet: Error connecting wallet", err);
      alert("Wallet connection failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  /*** FETCH BOUNTIES + DETAILS ***/
  const fetchBounties = async () => {
    if (!registry) {
      console.warn("fetchBounties: Registry not initialized");
      return;
    }

    try {
      setLoading(true);
      console.log("fetchBounties: Fetching all bounties...");
      const bounties = await registry.getAllBounties();
      console.log("fetchBounties: Raw bounties fetched", bounties);

      const formatted = await Promise.all(
        bounties.map(async (b: any) => {
          console.log("fetchBounties: Processing bounty", b.id);
          let milestones: any[] = [];
          let totalContributions = "0";

          try {
            const rawMilestones = await registry.getAllMilestones(b.id);
            milestones = rawMilestones.map((m: any, idx: number) => ({
              id: m.id ?? idx + 1,
              amount: m.amount ?? m[0],
              completed: m.completed ?? m[1],
            }));
            console.log(`fetchBounties: Milestones for bounty ${b.id}`, milestones);

            const total = await registry.getTotalContributions(b.id);
            totalContributions = ethers.formatEther(total);
            console.log(`fetchBounties: Total contributions for bounty ${b.id}`, totalContributions);
          } catch (err) {
            console.warn(`fetchBounties: Could not fetch milestones or contributions for bounty ${b.id}`, err);
          }

          return {
            id: Number(b.id),
            ngo: b.ngo,
            active: b.active,
            lawyerSelected: b.lawyerSelected,
            assignedLawyer: b.assignedLawyer,
            milestones,
            totalContributions,
          };
        })
      );

      console.log("fetchBounties: Formatted bounties", formatted);
      setAllBounties(formatted);
    } catch (err) {
      console.error("fetchBounties: Error fetching bounties", err);
    } finally {
      setLoading(false);
    }
  };

  /*** APPLY FOR A BOUNTY ***/
  const applyForBounty = async (bountyId: number) => {
    console.log("applyForBounty: Applying for bounty", bountyId);
    if (!registry || !signer || !account) return alert("Connect wallet first");

    try {
      const [cid, payloadHash] = await registry.getLawyerIdentity(account);
      console.log("applyForBounty: Lawyer identity", { cid, payloadHash });

      if (!cid || payloadHash === ethers.ZeroHash)
        return alert("⚠️ You must register your LSK first in Lawyer Dashboard.");

      const proposal = {
        summary: "I would like to take this bounty",
        timestamp: Date.now(),
      };
      const proposalJSON = JSON.stringify(proposal);
      const proposalDocHash = ethers.keccak256(
        ethers.toUtf8Bytes(proposalJSON)
      );
      console.log("applyForBounty: Proposal doc hash", proposalDocHash);

      const tx = await registry.applyForBounty(
        bountyId,
        cid,
        proposalDocHash
      );
      console.log("applyForBounty: Transaction sent", tx);
      await tx.wait();
      console.log("applyForBounty: Transaction confirmed", tx);
      alert("✅ Successfully applied for bounty #" + bountyId);
      fetchBounties();
    } catch (err: any) {
      console.error("applyForBounty: Error", err);
      alert(err.message);
    }
  };

  useEffect(() => {
    if (registry) {
      console.log("useEffect: Registry ready, fetching bounties...");
      fetchBounties();
    } else {
      console.log("useEffect: Registry not ready yet");
    }
  }, [registry]);

  return (
    <div className="container">
      <style>{`
        .container {
          max-width: 950px;
          margin: 0 auto;
          padding: 1.5rem;
          background: #fff;
          color: #000;
          font-family: sans-serif;
        }
        h1 { font-size: 1.8rem; margin-bottom: 1rem; }
        h2 { font-size: 1.3rem; margin-top: 1rem; font-weight: bold; }
        button {
          cursor: pointer;
          border: none;
          border-radius: 4px;
          padding: 0.4rem 0.8rem;
          margin-top: 6px;
          font-size: 0.9rem;
        }
        .btn-accent { background: #0070f3; color: #fff; }
        ul { list-style: none; padding-left: 0; }
        li {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .milestone {
          background: #f9f9f9;
          border-radius: 6px;
          padding: 6px 10px;
          margin: 4px 0;
          font-size: 0.85rem;
        }
      `}</style>

      <h1>All Bounties on HakiChain</h1>

      {!account ? (
        <button
          className="btn-accent"
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <p>
          Connected: <b style={{ color: "green" }}>{account}</b>
        </p>
      )}

      {loading ? (
        <p>Loading bounties...</p>
      ) : (
        <>
          {allBounties.length === 0 && <p>No bounties found.</p>}
          <ul>
            {allBounties.map((b: any) => (
              <li key={b.id}>
                <strong>Bounty #{b.id}</strong> <br />
                NGO: {b.ngo} <br />
                Active: {b.active ? "✅ Active" : "❌ Closed"} <br />
                Total Funding:{" "}
                <b>{parseFloat(b.totalContributions).toFixed(4)} ETH</b>
                <br />
                {b.lawyerSelected ? (
                  <p>Assigned Lawyer: {b.assignedLawyer}</p>
                ) : (
                  <button
                    className="btn-accent"
                    onClick={() => applyForBounty(b.id)}
                  >
                    Apply
                  </button>
                )}
                {b.milestones && b.milestones.length > 0 && (
                  <>
                    <h4 style={{ marginTop: "0.8rem" }}>Milestones:</h4>
                    <ul>
                      {b.milestones.map((m: any, idx: number) => {
                        const amount = m.amount ?? m[0];
                        const completed = m.completed ?? m[1];
                        const milestoneId = m.id ?? idx + 1;

                        return (
                          <li key={idx} className="milestone">
                            ID: {milestoneId} | Amount: {ethers.formatEther(amount)} ETH |{" "}
                            {completed ? "✅ Completed" : "⏳ Pending"}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
