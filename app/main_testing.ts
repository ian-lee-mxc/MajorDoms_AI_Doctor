import { trackClaimedEvents } from './query_events';
import * as readline from 'readline';
import { sendToRagflow } from './ragflow_sender_test';
import { ethers, JsonRpcProvider } from "ethers";
import { groupings, ratings } from '@doitring/analyzkit';

async function main() {
    const latestBlock = await getCurrentBlockNumber();
    const fromBlock = 0;
    console.log(`Tracking from Block ${fromBlock} to ${latestBlock}`);

    const transactions = await trackClaimedEvents(fromBlock, latestBlock);

    // Start the input prompt
    askForTokenId(transactions);
}

// Function to ask for tokenId from the user and process data
function askForTokenId(transactions: Array<{ tokenId: string, content: string, timestamp: string }>) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Please enter a tokenId: ", async (inputTokenId) => {
        const filteredTransactions = transactions.filter(transaction => transaction.tokenId === inputTokenId);

        if (filteredTransactions.length > 0) {
            console.log(`Found ${filteredTransactions.length} transactions for tokenId ${inputTokenId}.`);

            // Parse content field to JSON and merge data
            const parsedTransactions = filteredTransactions.map(transaction => {
                return {
                    ...transaction,
                    content: JSON.parse(transaction.content)
                };
            });
            //console.log("parsed_transactions: ", JSON.stringify(parsedTransactions, null, 2)); // Formatierung mit 2 Leerzeichen // ZU LANGE AUSGABE
            console.log("parsed_transactions: ", parsedTransactions)
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
            const weeklyGroupedSleepData = groupings.week(yesterday, sleepData);
            const weeklyGroupedStepsData = groupings.week(yesterday, stepsData);
            const weeklyGroupedHeartRateData = groupings.week(yesterday, heartRateData);
            const weeklyGroupedOxygenData = groupings.week(yesterday, oxygenData);

            // Analyze health attributes for the entire week
            const sleepAnalysis = ratings.sleeps(weeklyGroupedSleepData);
            const stepsAnalysis = ratings.steps(weeklyGroupedStepsData, 10000);  // Example target: 10,000 steps
            const heartRateAnalysis = ratings.rates(weeklyGroupedHeartRateData);
            const oxygenAnalysis = ratings.oxygens(weeklyGroupedOxygenData);

            // Combine analyses for RAGFlow
            let health_data = '';
            if (stepsAnalysis.total > 0) {
                health_data += `Walked ${stepsAnalysis.total} steps and ${stepsAnalysis.km} km. Burned ${stepsAnalysis.kcal} kcal by walking.\n`;
            }
            if (heartRateAnalysis.average > 0) {
                health_data += `Average Heartrate is ${heartRateAnalysis.average} BPM.\n`;
            }
            if (oxygenAnalysis.average > 0) {
                health_data += `Average blood oxygen level is ${oxygenAnalysis.average.toFixed(2)}%.`;
            }

            console.log("Here is the analysis data:", health_data);
            // Send the analyzed data to Ragflow
            await sendToRagflow(inputTokenId, health_data);
        } else {
            console.log(`tokenId ${inputTokenId} was not found.`);
        }
        rl.close();  // Close the current readline interface before calling it again
        askForTokenId(transactions);  // Ask again for a tokenId
    });
}

// Helper function to get the current block number
async function getCurrentBlockNumber(): Promise<number> {
    const moonchainRpcUrl = "https://geneva-rpc.moonchain.com";
    const provider = new ethers.JsonRpcProvider(moonchainRpcUrl);
    return provider.getBlockNumber();
}

main().catch(console.error);
