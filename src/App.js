import { useEffect, useState } from "react";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { Buffer } from 'buffer';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from "tweetnacl";
import './App.css';
import { keccak256 } from "@ethersproject/keccak256";
import { ethers } from "ethers";
import { HDNodeWallet, Mnemonic, computeAddress } from "ethers";


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
  
  const secretKeyShowerEth = (exp, j) => {
      const seed = mnemonicToSeedSync(exp);
      const path = `m/44'/60'/${j}'/0'`;
      const derivedSeed = derivePath(path, seed.toString("hex")).key;
      const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed);
      
      // Convert private key to Base58
      const privateKeyBase58 = bs58.encode(Buffer.from(keyPair.secretKey));
  
      console.log('Ethereum Private Key (Base58):', privateKeyBase58);
  }
  


const solethSecretKeyDeriver = (exp, val, k) => {
  if (val.toLowerCase() === 'sol') {
      secretKeyShowerSol(exp, k);
  } else {
      secretKeyShowerEth(exp, k);
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
    const secret = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
    const publicKey = Keypair.fromSecretKey(secret).publicKey.toBase58();
    setGeneratedKeys(prev => [...prev, { chain: 'SOL', key: publicKey, index: i }]);
    showStatus(`Solana key #${i + 1} generated!`);
  };






  const ethkey = (exp, j) => {
      // Convert mnemonic to Mnemonic object (Ethers v6 fix)
      const mnemonic = Mnemonic.fromPhrase(exp);
  
      // Generate wallet using Ethereum derivation path
      const wallet = HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${j}`);
  
      // Extract private and public keys
      const privateKey = wallet.privateKey;
      const publicKey = wallet.publicKey;
  
      // Derive Ethereum address (last 20 bytes of Keccak256 hash of public key)
      const address = computeAddress(publicKey);
  
      setGeneratedKeys(prev => [...prev, { chain: 'ETH', key: address, index: j }]);
      showStatus(`Ethereum address #${j + 1} generated: ${address}`);
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
            <button onClick={insertor} className="btn-primary">insert phrase</button>
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
                    <span className={`key-chain ${key.chain.toLowerCase()}`}>
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
                      onClick={() => solethSecretKeyDeriver(mnemonic, key.chain.toLowerCase(), key.index)}
                    >
                      Show Private Key
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