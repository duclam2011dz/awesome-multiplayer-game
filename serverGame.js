const { Server } = require('socket.io');

class GameServer {
    constructor(httpServer) {
        this.io = new Server(httpServer);
        this.players = {};
        this.setupEvents();
        console.log('✅ [Game] Game Server đã sẵn sàng');
    }

    setupEvents() {
        this.io.on('connection', (socket) => {
            console.log(`[Game] Player connected: ${socket.id}`);

            socket.on('join-game', (name) => {
                this.players[socket.id] = { name, x: 100, y: 100, score: 0 };
                socket.emit('init-players', this.players);
                socket.broadcast.emit('player-joined', { id: socket.id, name, x: 100, y: 100 });
                const top = this.getLeaderboard();
                this.io.emit('leaderboard-update', top);
            });

            socket.on('move', (pos) => {
                if (this.players[socket.id]) {
                    this.players[socket.id].x = pos.x;
                    this.players[socket.id].y = pos.y;
                    this.io.emit('update-players', this.players);
                }
            });

            socket.on('shoot', ({ x, y, angle }) => {
                const bulletData = { x, y, angle, ownerId: socket.id };
                this.io.emit('bullet-fired', bulletData);
            });

            socket.on('player-dead', (pos) => {
                console.log(`[Game] Player dead: ${socket.id}`);
                const killerId = pos.killerId;

                if (killerId && this.players[killerId]) {
                    this.players[killerId].score += 1;
                }

                delete this.players[socket.id];
                this.io.emit('player-killed', { id: socket.id, x: pos.x, y: pos.y });

                const top = this.getLeaderboard();
                this.io.emit('leaderboard-update', top);
            });

            socket.on('disconnect', () => {
                console.log(`[Game] Player disconnected: ${socket.id}`);
                delete this.players[socket.id];
                this.io.emit('player-left', socket.id);
            });
        });
    }

    getLeaderboard() {
        const list = Object.entries(this.players)
            .map(([id, data]) => ({ id, name: data.name, score: data.score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        return list;
    }
}

module.exports = function setupGameServer(httpServer) {
    new GameServer(httpServer);
}