window.addEventListener("DOMContentLoaded", function () {
    const socket = io();
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const playerImage = new Image();
    playerImage.src = "/assets/player.png";

    const bulletImage = new Image();
    bulletImage.src = "/assets/bullet.png";

    let players = {};
    let bullets = [];
    let localPlayer = { id: null, alive: true };
    let gameOverDisplayed = false; // Prevent multiple Game Over screens

    // Initialize canvas
    function resizeCanvas() {
        canvas.width = Math.min(window.innerWidth, 900);
        canvas.height = Math.min(window.innerHeight, 600);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Socket.io Event Handlers
    socket.on("currentPlayers", (currentPlayers) => {
        players = currentPlayers;
        localPlayer.id = socket.id;
    });

    socket.on("currentBullets", (currentBullets) => {
        bullets = currentBullets;
    });

    socket.on("playerMoved", (data) => {
        if (players[data.id]) {
            players[data.id].x = data.x;
            players[data.id].y = data.y;
            players[data.id].facing = data.facing;
        }
    });

    socket.on("newPlayer", (newPlayer) => {
        players[newPlayer.id] = newPlayer;
    });

    socket.on("bulletFired", (bullet) => {
        bullets.push(bullet);
    });

    socket.on("playerDied", (playerId) => {
        if (players[playerId]) {
            players[playerId].alive = false;
        }

        if (playerId === localPlayer.id && !gameOverDisplayed) {
            showGameOverScreen();
        }
    });

    socket.on("playerDisconnected", (playerId) => {
        delete players[playerId];
    });

    socket.on("resetPlayer", (player) => {
        players[player.id] = player;
        if (player.id === localPlayer.id) {
            localPlayer.alive = true;
            hideGameOverScreen();
        }
    });

    // Game Over Screen Functions
    function showGameOverScreen() {
        gameOverDisplayed = true;
        const gameOverScreen = document.getElementById("gameOver");
        gameOverScreen.style.display = "flex";
    }

    function hideGameOverScreen() {
        gameOverDisplayed = false;
        const gameOverScreen = document.getElementById("gameOver");
        gameOverScreen.style.display = "none";
    }

    // "Play Again" Button Handler
    document.getElementById("playAgain").addEventListener("click", () => {
        socket.emit("resetPlayer", { id: localPlayer.id });
    });

    // Controls
    document.getElementById("left").addEventListener("click", () => {
        socket.emit("move", { direction: "left" });
    });
    document.getElementById("right").addEventListener("click", () => {
        socket.emit("move", { direction: "right" });
    });
    document.getElementById("jump").addEventListener("click", () => {
        socket.emit("move", { direction: "jump" });
    });
    document.getElementById("shoot").addEventListener("click", () => {
        const player = players[socket.id];
        if (player) {
            const bullet = {
                owner: socket.id,
                x: player.facing === "right" ? player.x + 50 : player.x - 20,
                y: player.y - 25,
                direction: player.facing,
            };
            bullets.push(bullet);
            socket.emit("bulletFired", bullet);
        }
    });

    // Gravity Simulation
    function applyGravity() {
        const player = players[localPlayer.id];
        if (player && player.y < canvas.height - 100 && player.alive) {
            player.y += 5; // Simulate gravity
            socket.emit("playerMoved", { id: localPlayer.id, x: player.x, y: player.y, facing: player.facing });
        }
    }

    setInterval(applyGravity, 50);

    // Render Loop
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

        // Draw players
        for (let id in players) {
            const player = players[id];
            if (player.alive) {
                ctx.drawImage(playerImage, player.x, player.y - 50, 50, 50);
            } else {
                ctx.fillStyle = "gray";
                ctx.fillRect(player.x, player.y - 50, 50, 50); // Gray box for dead players
            }
        }

        // Draw bullets and remove off-screen bullets
        bullets = bullets.filter((bullet) => {
            const onScreen = bullet.x >= 0 && bullet.x <= canvas.width;
            if (onScreen) {
                ctx.drawImage(bulletImage, bullet.x, bullet.y, 20, 10);
                bullet.x += bullet.direction === "right" ? 10 : -10;
            }
            return onScreen;
        });

        socket.emit("checkCollision"); // Notify the server to check for collisions
        if (localPlayer.alive) {
            requestAnimationFrame(render);
        }
    }

    render();
});
                
