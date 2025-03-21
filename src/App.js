import { useState } from "react";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { Buffer } from 'buffer';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from "tweetnacl";

// Add Buffer to the global scope for browser compatibility
global.Buffer = Buffer;

function App() {
  const [mnemonic, setMnemonic] = useState("");

  function handleGenerate() {
    // Generate a 12-word mnemonic (128 bits of entropy)
    const newMnemonic = generateMnemonic(128);
    setMnemonic(newMnemonic);
    seedmaker(newMnemonic)
  }


  function seedmaker(exp) {
      const seed = mnemonicToSeedSync(exp); // Generate 512-bit seed
      console.log(seed.toString("hex")); // Convert Buffer to Hex String

      for (let i = 0; i < 4; i++) {
        const path = `m/44'/501'/${i}'/0'`; // This is the derivation path
        const derivedSeed = derivePath(path, seed.toString("hex")).key;
        const secret = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
        console.log(Keypair.fromSecretKey(secret).publicKey.toBase58());
      }
  }
  
  return (
    <div>
      <h1>Mnemonic Generator</h1>
      <button onClick={handleGenerate}>Generate Mnemonic</button>
      <div>
        <h2>Your Mnemonic:</h2>
        <p>{mnemonic}</p>
      </div>
    </div>
  );
}

export default App;