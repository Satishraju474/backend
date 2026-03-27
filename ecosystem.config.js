module.exports = {
    apps: [
        {
            name: "edupay-backend",
            script: "./index.js",
            instances: "max", // Scale to all available CPUs
            exec_mode: "cluster", // Enable clustering
            env: {
                NODE_ENV: "development",
                PORT: 5000
            },
            env_production: {
                NODE_ENV: "production",
                PORT: 5000
            },
            watch: false, // Don't watch in production
            max_memory_restart: '1G' // Restart if memory exceeds 1G
        }
    ]
};
