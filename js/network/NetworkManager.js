export class NetworkManager {
    constructor() {
        this.socket = null;
        this.callbacks = {};
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    connect() {
        if (this.socket?.connected) return;
        const socketUrl = (typeof window !== 'undefined' && window.SOCKET_ORIGIN) ? window.SOCKET_ORIGIN : undefined;
        this.socket = io(socketUrl);

        this.socket.on('game-created', (data) => this.callbacks.gameCreated?.(data));
        this.socket.on('join-success', (data) => this.callbacks.joinSuccess?.(data));
        this.socket.on('opponent-joined', (data) => this.callbacks.opponentJoined?.(data));
        this.socket.on('game-state', (state) => this.callbacks.gameState?.(state));
        this.socket.on('join-error', (msg) => this.callbacks.joinError?.(msg));
        this.socket.on('opponent-left', () => this.callbacks.opponentLeft?.());
    }

    createGame(difficulties) {
        this.socket?.emit('create-game', difficulties);
    }

    joinGame(code) {
        this.socket?.emit('join-game', code);
    }

    emitStartGame(state) {
        this.socket?.emit('start-game', state);
    }

    emitMove(state) {
        this.socket?.emit('move', state);
    }

    isConnected() {
        return this.socket?.connected ?? false;
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}
