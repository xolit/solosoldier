const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

app.use(express.static("public"));

app.get("/game", (req, res) =>{
    res.sendFile(__dirname + "/public/game.html");
});

let players = {};
let bullets = [];

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // Initialize the new player
    players[socket.id] = { id: socket.id, x: 100, y: 500, facing: "right", alive: true };

    // Send all players and bullets to the new player
    socket.emit("currentPlayers", players);
    socket.emit("currentBullets", bullets);

    // Notify others of the new player
    socket.broadcast.emit("newPlayer", players[socket.id]);

    // Handle movement
    socket.on("move", (data) => {
        if (players[socket.id] && players[socket.id].alive) {
            const player = players[socket.id];
            if (data.direction === "left") {
                player.x -= 10;
                player.facing = "left";
            } else if (data.direction === "right") {
                player.x += 10;
                player.facing = "right";
            } else if (data.direction === "jump") {
                player.y -= 150; // Simple jump logic
                setTimeout(() => {
                    player.y += 150;
                }, 500);
            }
            io.emit("playerMoved", { id: socket.id, x: player.x, y: player.y, facing: player.facing });
        }
    });

    // Handle shooting
    socket.on("bulletFired", (bullet) => {
        bullets.push(bullet);
        io.emit("bulletFired", bullet);
    });

    // Handle bullet collision
    socket.on("checkCollision", () => {
        bullets.forEach((bullet, bulletIndex) => {
            for (let id in players) {
                const player = players[id];
                if (id !== bullet.owner && player.alive) {
                    // Collision detection logic
                    if (
                        bullet.x < player.x + 50 && // Bullet's right side intersects player
                        bullet.x + 20 > player.x && // Bullet's left side intersects player
                        bullet.y < player.y && // Bullet's bottom is above player's top
                        bullet.y + 10 > player.y - 50 // Bullet's top is below player's bottom
                    ) {
                        // Mark player as dead
                        player.alive = false;
    
                        // Notify all players of the collision
                        io.emit("playerDied", id);
    
                        // Remove the bullet
                        bullets.splice(bulletIndex, 1);
    
                        console.log(`Player ${id} was killed by bullet from ${bullet.owner}`);
                        return; // Exit loop after handling one collision
                    }
                }
            }
        });
    });
    
    

    // Handle play again
    socket.on("playAgain", () => {
        if (players[socket.id]) {
            players[socket.id] = { id: socket.id, x: 100, y: 500, facing: "right", alive: true };
            socket.emit("resetPlayer", players[socket.id]);
            socket.broadcast.emit("newPlayer", players[socket.id]);
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
