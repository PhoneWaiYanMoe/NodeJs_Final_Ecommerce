import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for requests from http://localhost:3000
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Parse JSON bodies
app.use(express.json());

// Define routes after CORS middleware
app.use("/api/products", productRoutes);

connectDB()
  .then(() => {
    app.listen(port);
    console.log(`Server running on port ${port}`);
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });