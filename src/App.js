import { useEffect, useState } from "react";
import { getPublicKey } from '@noble/secp256k1';
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { Buffer } from 'buffer';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from "tweetnacl";
import * as bip39 from "bip39";
import './App.css';
import { keccak256 } from "@ethersproject/keccak256";
import { ethers } from "ethers";
import { HDNodeWallet, Mnemonic, computeAddress, computePublicKey } from 'ethers';
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { Alchemy, Network } = require("alchemy-sdk");




const bs58 = require('bs58');

global.Buffer = Buffer;

function App() {
  const [mnemonic, setMnemonic] = useState("");
  const [solIndex, setSolIndex] = useState(0);
  const [ethIndex, setEthIndex] = useState(0);
  const [generatedKeys, setGeneratedKeys] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const storedMnemonic = localStorage.getItem("mnemonic");
    if (storedMnemonic) {
      setMnemonic(storedMnemonic);
    } else {
      mnemonicgen();
    }
  }, []);

  const showStatus = (message, duration = 3000) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), duration);
  };



  const secretKeyShowerSol = (exp, i) => {
      const seed = mnemonicToSeedSync(exp);
      const path = `m/44'/501'/${i}'/0'`;
      const derivedSeed = derivePath(path, seed.toString("hex")).key;
      const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed);
      
      // Convert private key to Base58
      const privateKeyBase58 = bs58.encode(Buffer.from(keyPair.secretKey));
  
      console.log('Solana Private Key (Base58):', privateKeyBase58);
  }
  
  const secretKeyShowerEth = (mnemonic, j) => {
    if (!Mnemonic.isValidMnemonic(mnemonic)) {
        console.error("⚠️ Invalid mnemonic");
        return;
    }

    // Derive the root node from the mnemonic
    const rootNode = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic));

    // Correct path (no "m/" at the beginning)
    const path = `m/44'/60'/0'/0/${j}`;
    const childNode = rootNode.deriveChild(j);

    console.log("Ethereum Address:", childNode.address);
    console.log("Ethereum Private Key:", childNode.privateKey);
  };
  


  const solethSecretKeyDeriver = (keyData) => {
    try {
      if (!keyData?.chain || keyData.index === undefined) {
        throw new Error("Missing key information");
      }
  
      const key = generatedKeys.find(k => 
        k.chain === keyData.chain.toUpperCase() && 
        k.index === keyData.index
      );
  
      if (!key) {
        throw new Error("Key not found");
      }
  
      if (key.chain === 'SOL') {
        console.log('Solana Private Key:', key.privateKey);
        return key.privateKey;
      } else if (key.chain === 'ETH') {
        console.log('Ethereum Private Key:', key.privateKey);
        return key.privateKey;
      }
      
    } catch (error) {
      console.error("Private key retrieval failed:", error);
      showStatus("Failed to retrieve private key");
      return null;
    }
  };

  const mnemonicgen = () => {
    const newMnemonic = generateMnemonic(128);
    localStorage.setItem("mnemonic", newMnemonic);
    setMnemonic(newMnemonic);
    setGeneratedKeys([]); // Reset generated keys array
    setSolIndex(0); // Reset derivation indexes
    setEthIndex(0);
    showStatus("New mnemonic generated successfully!");
    showStatus("New mnemonic generated successfully!");
  };

  const insertor = () => {
    // Get user input with clear instructions
    const userInput = prompt("Enter your 12 or 24 word recovery phrase (separated by spaces):");
    
    // Early return if user cancels
    if (userInput === null) {
      showStatus("Mnemonic import cancelled", 2000);
      return;
    }
  
    // Validate input exists and is a string
    if (!userInput || typeof userInput !== 'string') {
      showStatus("Please enter a valid mnemonic phrase", 3000);
      return;
    }
  
    // Normalize the input (trim and clean extra spaces)
    const normalizedInput = userInput.trim().replace(/\s+/g, ' ');
    const words = normalizedInput.split(' ');
    const wordCount = words.length;
  
    // Validate word count
    if (wordCount !== 12 && wordCount !== 24) {
      showStatus(`Mnemonic must be exactly 12 or 24 words (you entered ${wordCount})`, 4000);
      return;
    }
  
    // Validate word characters (basic check)
    const invalidWords = words.filter(word => !/^[a-z]+$/.test(word));
    if (invalidWords.length > 0) {
      showStatus("Mnemonic contains invalid words (only lowercase letters allowed)", 4000);
      return;
    }
  
    try {
      // Cryptographic validation
      mnemonicToSeedSync(normalizedInput);
      
      // Store the validated mnemonic
      localStorage.setItem("mnemonic", normalizedInput);
      setMnemonic(normalizedInput);
      
      // Reset derived keys and indexes
      setGeneratedKeys([]);
      setSolIndex(0);
      setEthIndex(0);
      
      // Show success
      showStatus("✅ Mnemonic imported successfully!", 3000);
      
    } catch (error) {
      console.error("Mnemonic validation failed:", error);
      showStatus("⚠️ Invalid mnemonic phrase - verification failed", 4000);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showStatus("Copied to clipboard!");
  };

  const solkey = (exp, i) => {
    const seed = mnemonicToSeedSync(exp);
    const path = `m/44'/501'/${i}'/0'`;
    const derivedSeed = derivePath(path, seed.toString("hex")).key;
    const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed);
    const keypair = Keypair.fromSecretKey(keyPair.secretKey);
    
    setGeneratedKeys(prev => [...prev, { 
      chain: 'SOL',
      privateKey: bs58.encode(keyPair.secretKey), // Store full private key
      publicKey: keypair.publicKey.toBase58(),
      key: keypair.publicKey.toBase58(),
      address: keypair.publicKey.toBase58(),
      index: i,
      isImported: false,
      balance: null
    }]);
    showStatus(`Solana key generated!`);
  };


  

  const ethkey = (exp, j) => {
    try {
      // 1. Convert mnemonic to Mnemonic object with validation
      const mnemonicObj = ethers.Mnemonic.fromPhrase(exp);
      
      // 2. Derive wallet using standard Ethereum path
      const path = `m/44'/60'/0'/0/${j}`;
      const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj, path);
      
      // 3. Get checksum address directly from wallet (more reliable)
      const ethAddress = wallet.address;
      
      // 4. Store all key information in state
      setGeneratedKeys(prev => [...prev, { 
        chain: 'ETH',
        privateKey: wallet.privateKey, // Store the full private key
        publicKey: wallet.publicKey,   // Compressed public key
        key: ethAddress,               // Display address
        address: ethAddress,           // Actual address (with checksum)
        index: j,
        isImported: false,             // Mark as generated key
        balance: null
      }]);
      
      showStatus(`Ethereum address generated: ${ethAddress}`);
    } catch (error) {
      console.error("ETH Key Generation Error:", error);
      showStatus("Failed to generate Ethereum address");
    }
  };


  // Use a public RPC instead of an API key
  const config = {
    network: Network.ETH_MAINNET, // Ethereum Mainnet
    url: "https://ethereum.publicnode.com" // Public RPC (No API Key Required)
  };
  
  const alchemy = new Alchemy(config);
  
  let ethbalance = 0;
  
  const ethbal = async (address, chain, index) => {
    showStatus("Please wait");
    try {
      const provider = new ethers.JsonRpcProvider(config.url);
      const balance = await provider.getBalance(address);
      const ethBalance = (Number(balance) / 10 ** 18).toFixed(4);

      // Update specific key's balance
      setGeneratedKeys(prevKeys => 
        prevKeys.map(k => 
          k.chain === chain && k.index === index ? 
          { ...k, balance: `${ethBalance} ETH` } : 
          k
        )
      );
      showStatus("Refreshed");
    } catch (error) {
      console.error(`Error fetching ETH balance for ${address}:`, error);
    }
  };
  
  

  // Use a free public Solana RPC (No API Key Required)
  const SOLANA_RPC_URL = "https://solana.publicnode.com";
  const connection = new Connection(SOLANA_RPC_URL);
  
  const solBal = async (address, chain, index) => {
    showStatus("Please wait...");
    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      const solBalance = (balance / 10 ** 9).toFixed(4); // Convert from lamports to SOL

      // Update specific key's balance
      setGeneratedKeys(prevKeys => 
        prevKeys.map(k => 
          k.chain === chain && k.index === index ? 
          { ...k, balance: `${solBalance} SOL` } : 
          k
        )
      );
      showStatus("Refreshed");
    } catch (error) {
      console.error(`Error fetching SOL balance for ${address}:`, error);
    }
  };

  const hexToBytes = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i/2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };
  
  const bytesToHex = (bytes) => {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const keygen = () => {
    if (!mnemonic) return showStatus("Generate a mnemonic first!");
    
    const choice = prompt("Enter 'eth' for Ethereum or 'sol' for Solana:")?.toLowerCase();
    
    if (choice === "eth") {
      ethkey(mnemonic, ethIndex);
      setEthIndex(prev => prev + 1);
    } else if (choice === "sol") {
      solkey(mnemonic, solIndex);
      setSolIndex(prev => prev + 1);
    } else {
      showStatus("Invalid choice. Please enter 'eth' or 'sol'.");
    }
  };

  const ethpublickey = (privateKeyHex) => {
    try {
      // 1. Sanitize input
      privateKeyHex = privateKeyHex.replace(/^0x/, '');
      
      // 2. Validate hex format
      if (!/^[0-9a-fA-F]{64}$/.test(privateKeyHex)) {
        throw new Error("Invalid private key - must be 64 hex characters");
      }
  
      // 3. Convert to bytes
      const privateKeyBytes = hexToBytes(privateKeyHex);
      
      // 4. Get uncompressed public key (65 bytes)
      const publicKeyBytes = getPublicKey(privateKeyBytes, false);
      
      // 5. Validate public key structure
      if (publicKeyBytes[0] !== 0x04 || publicKeyBytes.length !== 65) {
        throw new Error("Invalid public key format");
      }
  
      // 6. Derive Ethereum address
      const pubKeyHash = keccak256(publicKeyBytes.slice(1)); // Remove 0x04 prefix
      const address = ethers.getAddress('0x' + pubKeyHash.slice(-40));
  
      return {
        publicKey: bytesToHex(publicKeyBytes),
        address: address,
        valid: true
      };
    } catch (error) {
      console.error("ETH Key Error:", error.message);
      return { publicKey: "Invalid", address: "Invalid", valid: false };
    }
  };
  
  const solpublickey = (privateKeyBase58) => {
    try {
      // Strict format validation
      if (!/^[1-9A-HJ-NP-Za-km-z]{88}$/.test(privateKeyBase58)) {
        throw new Error("Invalid Base58 format");
      }
  
      const decoded = bs58.decode(privateKeyBase58);
      
      if (decoded.length !== 64) {
        throw new Error(`Invalid key length: ${decoded.length} bytes (needs 64)`);
      }
  
      const keypair = Keypair.fromSecretKey(decoded);
      return {
        publicKey: keypair.publicKey.toBase58(),
        valid: true
      };
    } catch (error) {
      console.error("SOL Key Error:", error);
      return { publicKey: "Invalid", valid: false };
    }
  };
  
  const keyAdder = () => {
    if (!mnemonic) {
      return showStatus("Generate a mnemonic first!");
    }
  
    const choice = prompt("Enter 'eth' for Ethereum or 'sol' for Solana:")?.trim().toLowerCase();
    if (!['eth', 'sol'].includes(choice)) {
      return showStatus("Invalid choice. Please enter 'eth' or 'sol'.");
    }
  
    const privateKey = prompt("Enter Private Key")?.trim();
    if (!privateKey) {
      return showStatus("Private key cannot be empty.");
    }
  
    try {
      if (choice === "eth") {
        const ethResult = ethpublickey(privateKey);
        if (!ethResult.valid) {
          return showStatus(`Invalid Ethereum private key: ${ethResult.error || "Invalid format"}`);
        }
  
        setGeneratedKeys(keys => [...keys, {
          chain: "ETH",
          privateKey: `0x${privateKey.replace(/^0x/, '')}`, // Standardized format
          publicKey: ethResult.publicKey,
          key: ethResult.address, // Using address as display key
          address: ethResult.address,
          index: ethIndex,
          balance: null,
          isImported: true // Corrected to true for imported keys
        }]);
        setEthIndex(prev => prev + 1);
        showStatus(`Imported ETH Address: ${ethResult.address}`);
  
      } else if (choice === "sol") {
        const solResult = solpublickey(privateKey);
        if (!solResult.valid) {
          return showStatus(`Invalid Solana private key: ${solResult.error || "Invalid format"}`);
        }
  
        setGeneratedKeys(keys => [...keys, {
          chain: "SOL",
          privateKey: privateKey, // Store in original base58 format
          publicKey: solResult.publicKey,
          key: solResult.publicKey, // PublicKey = Address in Solana
          address: solResult.publicKey,
          index: solIndex,
          balance: null,
          isImported: true // Corrected to true for imported keys
        }]);
        setSolIndex(prev => prev + 1);
        showStatus(`Imported SOL Address: ${solResult.publicKey}`);
      }
    } catch (error) {
      console.error("Key addition failed:", error);
      showStatus(`Failed to process private key: ${error.message}`);
    }
  };
  

  

  return (
    <div className="wallet-container">
      <header className="wallet-header">
        <h1 className="wallet-title">WALLATION</h1>
      </header>
  
      {statusMessage && (
        <div className="status-toast">
          {statusMessage}
        </div>
      )}
  
      <main className="wallet-main">
        <section className="mnemonic-section">
          <div className="section-header">
            <h2>Recovery Phrase</h2>
            <button 
              onClick={mnemonicgen}
              className="btn-primary"
            >
              Generate New
            </button>
            <button onClick={insertor} className="btn-primary">Insert Phrase</button>
          </div>
          
          {mnemonic && (
            <div className="mnemonic-phrase">
              {mnemonic.split(' ').map((word, i) => (
                <div key={i} className="mnemonic-word">
                  <span className="word-number">{i + 1}.</span>
                  {word}
                </div>
              ))}
              <button 
                onClick={() => copyToClipboard(mnemonic)}
                className="copy-button"
              >
                Copy Phrase
              </button>
            </div>
          )}
        </section>

        <button onClick={keyAdder} className="btn-secondary">
              Import private key
        </button>
        {/* for adding privatekey */}
  
        <section className="key-generation">
          <div className="section-header">
            <h2>Key Management</h2>
            <button onClick={keygen} className="btn-secondary">
              Generate Keypair
            </button>

          </div>
  
          {generatedKeys.length > 0 && (
            <div className="key-list">
              {generatedKeys.map((key, i) => (
                <div key={i} className="key-item">
                  <div className="key-meta">
                  <span className={`key-chain ${(key.chain || '').toLowerCase()}`}>
                    {key.chain} #{key.index + 1}
                  </span>
                  </div>
                  <div className="key-content">
                    <code className="key-value">{key.key}</code>
                    <button 
                      onClick={() => copyToClipboard(key.key)}
                      className="copy-icon"
                    >
                      📋
                    </button>
                    <button
                      className="btn-primary"
                      id="private-key"
                      onClick={() => solethSecretKeyDeriver({
                        chain: key.chain,
                        index: key.index
                      })}
                    >
                      Show Private Key
                    </button>
                    <h1 className="balance">
                      {key.balance || 'Fetch'}
                    </h1>
                    <button 
                      className="refresh-button" 
                      onClick={() => {
                        if (key.chain.toLowerCase() === 'sol') {
                          solBal(key.key, key.chain, key.index);
                        } else {
                          ethbal(key.key, key.chain, key.index);
                        }
                      }}
                    >
                      ⟳
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;