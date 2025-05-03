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
        origin: 'https://62e0-171-250-182-137.ngrok-free.app', // Allow UI Service running locally
        methods: ['GET', 'POST']
    }
});
global.io = io;

app.use(cors({
    origin: 'https://62e0-171-250-182-137.ngrok-free.app' // Allow UI Service running locally
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