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
        origin: ['https://frontend-u30c.onrender.com', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
global.io = io;

app.use(cors({
    origin: ['https://frontend-u30c.onrender.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Add a root route for API documentation
app.get('/', (req, res) => {
    res.json({
        message: 'Product Service API is running',
        version: '1.0.0',
        documentation: {
            endpoints: {
                products: '/api/products',
                productById: '/api/products/:id',
                reviews: '/api/products/:id/reviews',
                addReview: '/api/products/:id/review',
                categories: '/api/categories',
                bestSellers: '/api/products/best-sellers'
            }
        }
    });
});

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