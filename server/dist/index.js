"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const activities_1 = __importDefault(require("./routes/activities"));
const auth_1 = __importDefault(require("./routes/auth"));
const seatgeek_1 = __importDefault(require("./routes/seatgeek"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5002;
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5002'],
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api/activities', activities_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/seatgeek', seatgeek_1.default);
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickmap')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
    // Continue even if MongoDB connection fails
    console.error('MongoDB connection error:', error);
    console.log('Continuing without MongoDB connection. SeatGeek API will still work.');
});
// Add a test endpoint to verify server is running
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running correctly!' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`SeatGeek API endpoint: http://localhost:${PORT}/api/seatgeek/events`);
});
