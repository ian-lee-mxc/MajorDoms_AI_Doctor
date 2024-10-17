"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToRagflow = void 0;
const axios_1 = __importDefault(require("axios"));
const gRagApiUrl = "http://demo.ragflow.io/v1/api/";
const gRagUserId = "YourUserIdHere";
const gRagApiToken = "ragflow-Q1N2EwYzdlODdkODExZWZhOTAxNDIwMT";
// Function to send data to Ragflow
function sendToRagflow(data) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const question = `You are an AI analyzing health data. The data for tokenId ${data.tokenId} is "${data.content}". Please provide suggestions based on this data.`;
        try {
            // Create a new conversation
            const url_new = `${gRagApiUrl}/new_conversation?user_id=${gRagUserId}`;
            const headers = { Authorization: `Bearer ${gRagApiToken}` };
            const newConversationResponse = yield axios_1.default.get(url_new, { headers });
            const conversationId = (_b = (_a = newConversationResponse.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.id;
            if (!conversationId) {
                console.error("Failed to create a new conversation:", newConversationResponse.data);
                return;
            }
            // Post the message to the conversation
            const url_completion = `${gRagApiUrl}/completion`;
            const postData = {
                conversation_id: conversationId,
                messages: [
                    {
                        role: 'user',
                        content: question // Send the content as part of the "messages"
                    }
                ],
                quote: false,
                stream: false
            };
            const completionResponse = yield axios_1.default.post(url_completion, postData, { headers });
            // Check for errors
            if (completionResponse.data.retcode !== 0) {
                console.error("Error from Ragflow:", completionResponse.data.retmsg);
            }
            else {
                const answer = (_d = (_c = completionResponse.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.answer;
                console.log("Ragflow Response:", answer);
            }
        }
        catch (error) {
            console.error("Error sending to Ragflow:", error);
        }
    });
}
exports.sendToRagflow = sendToRagflow;
