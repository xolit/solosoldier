window.addEventListener("DOMContentLoaded", function () {
    const socket = io();
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const playerImage = new Image();
    playerImage.src = "/assets/player.png";

    const bulletImage = new Image();
    bulletImage.src = "/assets/bullet.png";
     
    playerImage.onload = () => {
        console.log("Player image loaded successfully");
    };
    playerImage.onerror = () => {
        console.error("Failed to load player image. Check the path.");
    };
    

    let players = {};
    let bullets = [];
    let localPlayer = { id: null, alive: true };

    // Initialize canvas
    function resizeCanvas() {
        canvas.width = Math.min(window.innerWidth, 900);
        canvas.height = Math.min(window.innerHeight, 600);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Handle initial data
    socket.on("currentPlayers", (currentPlayers) => {
        players = currentPlayers;
        localPlayer.id = socket.id;
    });

    socket.on("currentBullets", (currentBullets) => {
        bullets = currentBullets;
    });

    // Update player position
    socket.on("playerMoved", (data) => {
        if (players[data.id]) {
            players[data.id].x = data.x;
            players[data.id].y = data.y;
            players[data.id].facing = data.facing;
        }
    });

    // Add new player
    socket.on("newPlayer", (newPlayer) => {
        players[newPlayer.id] = newPlayer;
    });

    // Handle shooting
    socket.on("bulletFired", (bullet) => {
        bullets.push(bullet);
    });

// Remove dead players and show Game Over screen only when the local player dies
socket.on("playerDied", (playerId) => {
    if (players[playerId]) {
        players[playerId].alive = false;
    }

    if (playerId === localPlayer.id) {
        localPlayer.alive = false;
        showGameOverScreen(); // Show Game Over screen for the local player
    }
});

    // Remove disconnected players
    socket.on("playerDisconnected", (playerId) => {
        delete players[playerId];
    });

    // Reset player on play again
    socket.on("resetPlayer", (player) => {
        players[player.id] = player;
        localPlayer.alive = true;
    });

    // Game Over screen
function showGameOverScreen() {
    const gameOverScreen = document.getElementById("gameOver");
    if (gameOverScreen.style.display === "none") {
        gameOverScreen.style.display = "flex";
    }
}


    // Restart game
    document.getElementById("playAgain").addEventListener("click", () => {
        location.reload(); // Reload the page to reset the game
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
        
        // Apply gravity simulation to ensure the player falls back to the ground
function applyGravity() {
    for (let id in players) {
        const player = players[id];
        if (player.y < 500 && player.alive) { // Fall only if above ground
            player.y += 10; // Simulate gravity
            socket.emit("playerMoved", { id, x: player.x, y: player.y, facing: player.facing });
        }
    }
}

// Run gravity simulation at intervals
setInterval(applyGravity, 50);

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

    // Render loop
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
        }
    }

          // Draw bullets
    bullets.forEach((bullet) => {
        ctx.drawImage(bulletImage, bullet.x, bullet.y, 20, 10);
        bullet.x += bullet.direction === "right" ? 10 : -10;
    });
        
        

        socket.emit("checkCollision"); // Notify the server to check for collisions       
        requestAnimationFrame(render);
    }

    render();
});
