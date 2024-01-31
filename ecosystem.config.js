module.exports = {
    apps: [
        {
            name: "cargame",
            cwd: "server",
            script: "./dist/index.js",
            env: {
                PORT: 3006,
            },
        },
    ],

    deploy: {
        production: {
            user: process.env.SSH_USER,
            host: process.env.DEPLOY_HOST,
            key: "~/.ssh/github_rsa",
            ref: "origin/master",
            repo: "https://github.com/h4ctar/car-game.git",
            path: "/opt/cargame",
            "post-deploy": "./post-deploy.sh",
        },
    },
};
