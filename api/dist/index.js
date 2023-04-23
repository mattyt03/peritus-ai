"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const main = async () => {
    const app = (0, express_1.default)();
    app.get('/', (_req, res) => {
        res.send('Hello World!');
    });
    app.listen(3002, () => {
        console.log('Server started on port 3002');
    });
};
main();
//# sourceMappingURL=index.js.map