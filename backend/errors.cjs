class OrderError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = 'OrderError';
        this.status = status;
    }
}

module.exports = { OrderError };
