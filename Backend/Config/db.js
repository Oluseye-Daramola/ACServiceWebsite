const mongoose = require("mongoose");
const dns = require("dns");

// Some networks' DNS can't resolve Atlas "mongodb+srv://" SRV records
// (querySrv ECONNREFUSED). Use Google DNS for every script that connects:
// the server and seedAdmin.js alike.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);

        process.exit(1);
    }
};


module.exports = connectDB;