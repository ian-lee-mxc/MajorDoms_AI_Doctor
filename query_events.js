"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackClaimedEvents = void 0;
const ethers_1 = require("ethers");
const zlib = __importStar(require("zlib"));
// Moonchain RPC endpoint
const moonchainRpcUrl = "https://geneva-rpc.moonchain.com";
const provider = new ethers_1.JsonRpcProvider(moonchainRpcUrl);
// Smart Contract address
const contractAddress = "0x457c1542a68550ab147aE2b183B31ed54e081560";
// ABI for the Claimed event
const abi = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
            { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "uid", "type": "string" },
            { "indexed": false, "internalType": "string", "name": "sncode", "type": "string" },
            { "indexed": false, "internalType": "address", "name": "to", "type": "address" },
            {
                "components": [
                    { "internalType": "address", "name": "token", "type": "address" },
                    { "internalType": "uint256", "name": "amount", "type": "uint256" }
                ],
                "indexed": false,
                "internalType": "struct DoitRingDevice.Reward[]",
                "name": "rewards",
                "type": "tuple[]"
            },
            { "indexed": false, "internalType": "string", "name": "memo", "type": "string" },
            { "indexed": false, "internalType": "int256", "name": "blockHeight", "type": "int256" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "Claimed",
        "type": "event"
    }
];
// Contract instance for decoding
const contract = new ethers_1.ethers.Contract(contractAddress, abi, provider);
// Function to decompress Brotli data
function decompressBrotli(content) {
    try {
        const compressedBuffer = Buffer.from(content, 'base64');
        const decompressedBuffer = zlib.brotliDecompressSync(compressedBuffer);
        return decompressedBuffer.toString('utf-8');
    }
    catch (error) {
        console.error("Error decompressing Brotli data:", error);
        return "Decompression failed";
    }
}
// Function to track Claimed events
function trackClaimedEvents(fromBlock, toBlock) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = {
            address: contractAddress,
            fromBlock: ethers_1.ethers.toBeHex(fromBlock),
            toBlock: toBlock ? ethers_1.ethers.toBeHex(toBlock) : 'latest',
        };
        const logs = yield provider.getLogs(filter);
        console.log(`Found ${logs.length} logs`);
        const transactions = [];
        logs.forEach((log, index) => {
            var _a, _b;
            try {
                const parsedLog = contract.interface.parseLog(log);
                const tokenId = parsedLog.args[1].toString(); // tokenId as string
                const memo = parsedLog.args[6];
                const timestamp = parsedLog.args[8].toString(); // timestamp as string
                // Parse the memo JSON
                let parsedMemo;
                try {
                    parsedMemo = JSON.parse(memo);
                }
                catch (e) {
                    console.log(`Error parsing memo: ${memo}`, e);
                    return;
                }
                const compressedContent = ((_b = (_a = parsedMemo.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) || "No content";
                const decompressedContent = decompressBrotli(compressedContent);
                transactions.push({
                    tokenId: tokenId,
                    content: decompressedContent,
                    timestamp: timestamp
                });
                console.log(`Log ${index + 1}: tokenId=${tokenId}, content=${decompressedContent}, timestamp=${timestamp}`);
            }
            catch (error) {
                console.log(`Error decoding log ${index + 1}`, error);
            }
        });
        return transactions;
    });
}
exports.trackClaimedEvents = trackClaimedEvents;
