"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load test environment variables
dotenv_1.default.config({ path: '.env.test' });
// Mock AWS SDK
jest.mock('@aws-sdk/client-kms', () => ({
    KMSClient: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    SignCommand: jest.fn(),
    GetPublicKeyCommand: jest.fn(),
}));
// Mock ethers
jest.mock('ethers', () => ({
    ethers: {
        JsonRpcProvider: jest.fn(),
        Wallet: jest.fn(),
        Contract: jest.fn(),
        TypedDataEncoder: {
            hash: jest.fn(),
        },
        getBytes: jest.fn(),
    },
}));
// Mock Redis
jest.mock('ioredis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        ping: jest.fn().mockResolvedValue('PONG'),
        disconnect: jest.fn(),
    })),
}));
// Mock BullMQ
jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({}),
        close: jest.fn(),
        getWaiting: jest.fn().mockResolvedValue([]),
        getActive: jest.fn().mockResolvedValue([]),
        getCompleted: jest.fn().mockResolvedValue([]),
        getFailed: jest.fn().mockResolvedValue([]),
    })),
    Worker: jest.fn().mockImplementation(() => ({
        close: jest.fn(),
        on: jest.fn(),
    })),
}));
// Mock WebSocket
jest.mock('ws', () => ({
    WebSocket: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        close: jest.fn(),
        readyState: 1, // OPEN
    })),
}));
// Mock axios
jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: [] }),
}));
// Global test timeout
jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map