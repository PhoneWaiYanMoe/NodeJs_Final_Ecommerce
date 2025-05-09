import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const HOST = '0.0.0.0';

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://frontend-u30c.onrender.com', // Allow UI Service running locally
        methods: ['GET', 'POST']
    }
});
global.io = io;

app.use(cors({
    origin: 'https://frontend-u30c.onrender.com' // Allow UI Service running locally
}));
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

connectDB()
    .then(() => {
        server.listen(port, HOST, () => {
            console.log(`Server running on ${HOST}:${port}`);
        });
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });

// Handle OPTIONS preflight requests for CORS
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
        return res.status(200).end();
    }
    next();
});

// Replace or add the CORS middleware
app.use(cors({
    origin: '*', // Allow all origins
    credentials: false, // Don't require credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));