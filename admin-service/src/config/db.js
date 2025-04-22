const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Attempting to connect with URI:', process.env.MONGO_URI);
        
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables. Please check your .env file.');
        }
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;