const { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } = require("@solana/web3.js");
const bs58 = require("bs58");

// Solana RPC URL (Using Devnet)
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function transferSOL(pvtKey, address, amount) {
    try {
        // Convert inputs
        const senderKeypair = Keypair.fromSecretKey(bs58.decode(pvtKey.trim()));
        const receiverPublicKey = new PublicKey(address.trim());
        const lamports = Math.floor(amount * 10 ** 9); // Convert SOL to lamports

        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: receiverPublicKey,
                lamports: lamports, 
            })
        );

        console.log("🚀 Sending transaction...");
        const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
        
        console.log("✅ Transaction Successful!");
        console.log("🔗 Transaction Signature:", signature);
        console.log(`🔍 Check transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
        console.error("❌ Transaction Failed:", error.message);
    }
}

// Export function
module.exports = transferSOL;
