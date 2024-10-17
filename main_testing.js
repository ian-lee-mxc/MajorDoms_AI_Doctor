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
const query_events_1 = require("./query_events");
const readline = __importStar(require("readline"));
const ragflow_sender_test_1 = require("./ragflow_sender_test");
const ethers_1 = require("ethers");
const analyzkit_1 = require("@doitring/analyzkit");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const latestBlock = yield getCurrentBlockNumber();
        const fromBlock = 0;
        console.log(`Tracking from Block ${fromBlock} to ${latestBlock}`);
        const transactions = yield (0, query_events_1.trackClaimedEvents)(fromBlock, latestBlock);
        // Start the input prompt
        askForTokenId(transactions);
    });
}
// Function to ask for tokenId from the user and process data
function askForTokenId(transactions) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question("Please enter a tokenId: ", (inputTokenId) => __awaiter(this, void 0, void 0, function* () {
        const filteredTransactions = transactions.filter(transaction => transaction.tokenId === inputTokenId);
        if (filteredTransactions.length > 0) {
            console.log(`Found ${filteredTransactions.length} transactions for tokenId ${inputTokenId}.`);
            // Parse content field to JSON and merge data
            const parsedTransactions = filteredTransactions.map(transaction => {
                return Object.assign(Object.assign({}, transaction), { content: JSON.parse(transaction.content) });
            });
            //console.log("parsed_transactions: ", JSON.stringify(parsedTransactions, null, 2)); // Formatierung mit 2 Leerzeichen // ZU LANGE AUSGABE
            console.log("parsed_transactions: ", parsedTransactions);
            // Combine the data for sleeps, steps, heartRates, and oxygens
            const sleepData = parsedTransactions.flatMap(t => t.content.sleeps || []);
            //console.log("sleepdata: ", sleepData);
            const stepsData = parsedTransactions.flatMap(t => t.content.steps || []);
            const heartRateData = parsedTransactions.flatMap(t => t.content.heartRates || []);
            const oxygenData = parsedTransactions.flatMap(t => t.content.oxygens || []);
            //const yesterday = new Date().getTime() - 24 * 60 * 60 / 1000; // Current timestamp
            const today = new Date();
            const yesterday = Math.floor(today.getTime() / 1000); // In Sekunden statt Millisekunden
            console.log(yesterday);
            // Group the data by week
            const weeklyGroupedSleepData = analyzkit_1.groupings.week(yesterday, sleepData);
            const weeklyGroupedStepsData = analyzkit_1.groupings.week(yesterday, stepsData);
            const weeklyGroupedHeartRateData = analyzkit_1.groupings.week(yesterday, heartRateData);
            const weeklyGroupedOxygenData = analyzkit_1.groupings.week(yesterday, oxygenData);
            // Analyze health attributes for the entire week
            const sleepAnalysis = analyzkit_1.ratings.sleeps(weeklyGroupedSleepData);
            const stepsAnalysis = analyzkit_1.ratings.steps(weeklyGroupedStepsData, 10000); // Example target: 10,000 steps
            const heartRateAnalysis = analyzkit_1.ratings.rates(weeklyGroupedHeartRateData);
            const oxygenAnalysis = analyzkit_1.ratings.oxygens(weeklyGroupedOxygenData);
            // Combine all analyses into one data object to send to Ragflow
            const analysisData = {
                tokenId: inputTokenId,
                sleep: sleepAnalysis,
                steps: stepsAnalysis,
                heartRate: heartRateAnalysis,
                oxygen: oxygenAnalysis
            };
            //console.log("Here is the analysis data:", JSON.stringify(analysisData, null, 2)); ZU LANGE AUSGABE
            console.log("Here is the analysis data:", analysisData);
            // Send the analyzed data to Ragflow
            yield (0, ragflow_sender_test_1.sendToRagflow)(analysisData);
        }
        else {
            console.log(`tokenId ${inputTokenId} was not found.`);
        }
        rl.close(); // Close the current readline interface before calling it again
        askForTokenId(transactions); // Ask again for a tokenId
    }));
}
// Helper function to get the current block number
function getCurrentBlockNumber() {
    return __awaiter(this, void 0, void 0, function* () {
        const moonchainRpcUrl = "https://geneva-rpc.moonchain.com";
        const provider = new ethers_1.ethers.JsonRpcProvider(moonchainRpcUrl);
        return provider.getBlockNumber();
    });
}
main().catch(console.error);
