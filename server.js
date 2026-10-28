import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import * as B from "./bank.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.static(path.join(__dirname, "dist")));
const srv = http.createServer(app), io = new Server(srv);
const games = {};
const AV = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🦄", "🐙", "🐧", "🦉", "🐲", "🤖", "👾", "🐢", "🦋", "🐬"];

const sorted = (g) => Object.values(g.players).sort((a, b) => b.sc - a.sc);
const board = (g, n = 5) => sorted(g).slice(0, n).map((p) => ({ n: p.name, a: p.av, sc: p.sc }));

// Tanlangan fanlardan savollar to‘plami (qo‘lda yozilgan + avtomatik yaratiladigan)
function makeDeck(subs, count) {
    const deck = [], seen = new Set();
    for (let k = 0; deck.length < count && k < count * 25; k++) {
        const si = B.pick(subs);
        const q = B.GEN[si] && Math.random() < 0.5 ? B.GEN[si]() : B.pick(B.Q[si]);
        if (seen.has(q[0][0])) continue;
        seen.add(q[0][0]);
        const correct = q[1][q[2]], o = B.shuffle(q[1]);
        deck.push({ si, s: q[0], o, c: o.indexOf(correct) });
    }
    return deck;
}

function nextQ(g) {
    clearTimeout(g.timer);
    g.n++;
    if (g.n >= g.deck.length) return end(g);
    g.phase = "q"; g.ans = {}; g.t0 = Date.now();
    const d = g.deck[g.n];
    io.to(g.pin).emit("q", { n: g.n, total: g.deck.length, s: d.s, o: d.o, si: d.si, time: g.time });
    g.timer = setTimeout(() => reveal(g), g.time * 1000 + 400);
}

function reveal(g) {
    if (g.phase !== "q") return;
    clearTimeout(g.timer);
    g.phase = "r";
    const d = g.deck[g.n], counts = [0, 0, 0, 0], lim = g.time * 1000;
    for (const [id, p] of Object.entries(g.players)) {
        const a = g.ans[id];
        if (a) counts[a.i]++;
        const good = !!a && a.i === d.c;
        p.st = good ? p.st + 1 : 0;
        let gain = 0;
        // Klassik: tezroq javob = ko‘proq ball + seriya bonusi
        if (good && g.mode === "classic") gain = Math.round(1000 * (1 - Math.min(a.t, lim) / lim / 2)) + Math.min(p.st - 1, 4) * 50;
        p.sc += gain; p.gain = gain; p.good = good;
        p.chest = good && g.mode === "gold"; // Oltin rejimi: to‘g‘ri javob = sandiq
    }
    io.to(g.host).emit("reveal", { c: d.c, counts, board: board(g), last: g.n + 1 >= g.deck.length });
    const all = sorted(g);
    for (const [id, p] of Object.entries(g.players)) {
        io.to(id).emit("res", { good: p.good, gain: p.gain, sc: p.sc, rank: all.indexOf(p) + 1, st: p.st, chest: p.chest, a: g.ans[id] ? g.ans[id].i : -1, c: d.c });
    }
    g.timer = setTimeout(() => nextQ(g), g.mode === "gold" ? 10000 : 7000);
}

function end(g) {
    g.phase = "end";
    const all = sorted(g), bd = board(g, 10);
    io.to(g.host).emit("end", { board: bd });
    for (const [id, p] of Object.entries(g.players)) io.to(id).emit("end", { board: bd.slice(0, 5), rank: all.indexOf(p) + 1, sc: p.sc });
    setTimeout(() => delete games[g.pin], 30 * 60 * 1000);
}

io.on("connection", (socket) => {
    socket.on("host:create", ({ subs, count, time, mode }, cb) => {
        subs = (Array.isArray(subs) ? subs : []).filter((i) => B.Q[i]);
        if (!subs.length) subs = B.Q.map((_, i) => i);
        let pin;
        do pin = String(B.rnd(100000, 999999)); while (games[pin]);
        games[pin] = { pin, host: socket.id, subs, count: Math.min(30, Math.max(3, +count || 10)), time: [10, 20, 30].includes(+time) ? +time : 20, mode: mode === "gold" ? "gold" : "classic", players: {}, ans: {}, n: -1, phase: "lobby" };
        socket.data = { pin, role: "h" };
        socket.join(pin);
        cb({ pin });
    });

    socket.on("join", ({ pin, name }, cb) => {
        const g = games[String(pin).trim()];
        name = String(name || "").trim().slice(0, 14);
        if (!g) return cb({ err: 1 });
        if (g.phase !== "lobby") return cb({ err: 2 });
        if (!name || Object.values(g.players).some((p) => p.name.toLowerCase() === name.toLowerCase())) return cb({ err: 3 });
        const av = AV[Object.keys(g.players).length % AV.length];
        g.players[socket.id] = { name, av, sc: 0, st: 0 };
        socket.data = { pin: g.pin, role: "p" };
        socket.join(g.pin);
        io.to(g.host).emit("plist", Object.values(g.players).map((p) => ({ n: p.name, a: p.av })));
        cb({ ok: 1, av, mode: g.mode });
    });

    socket.on("host:start", () => {
        const g = games[socket.data?.pin];
        if (!g || g.host !== socket.id || g.phase !== "lobby" || !Object.keys(g.players).length) return;
        g.deck = makeDeck(g.subs, g.count);
        nextQ(g);
    });

    socket.on("host:next", () => {
        const g = games[socket.data?.pin];
        if (!g || g.host !== socket.id) return;
        if (g.phase === "q") reveal(g);
        else if (g.phase === "r") nextQ(g);
    });

    socket.on("answer", ({ i }) => {
        const g = games[socket.data?.pin];
        if (!g || g.phase !== "q" || !g.players[socket.id] || g.ans[socket.id] || !(i >= 0 && i < 4)) return;
        g.ans[socket.id] = { i, t: Date.now() - g.t0 };
        const a = Object.keys(g.ans).length, of = Object.keys(g.players).length;
        io.to(g.host).emit("ac", { a, of });
        if (a >= of) setTimeout(() => reveal(g), 250);
    });

    // Oltin rejimi: sandiq tanlash (oltin, katta xazina, o‘g‘irlash, bomba)
    socket.on("chest", () => {
        const g = games[socket.data?.pin], p = g && g.players[socket.id];
        if (!p || !p.chest || g.phase !== "r") return;
        p.chest = false;
        const others = Object.entries(g.players).filter(([id, v]) => id !== socket.id && v.sc > 0);
        const r = Math.random();
        let type = "g", amt = B.rnd(80, 150);
        if (r > 0.8) { type = "x"; amt = Math.min(p.sc, B.rnd(40, 90)); p.sc -= amt; }
        else if (r > 0.55 && others.length) {
            type = "s";
            const [vid, v] = B.pick(others);
            amt = Math.min(v.sc, B.rnd(60, 150)); v.sc -= amt; p.sc += amt;
            io.to(vid).emit("stolen", { n: p.name, amt, sc: v.sc });
        } else if (r > 0.4) { type = "b"; amt = B.rnd(250, 400); p.sc += amt; }
        else p.sc += amt;
        socket.emit("chestres", { type, amt, sc: p.sc });
        io.to(g.host).emit("board", board(g));
    });

    socket.on("disconnect", () => {
        const g = games[socket.data?.pin];
        if (!g) return;
        if (g.host === socket.id) { io.to(g.pin).emit("closed"); clearTimeout(g.timer); delete games[g.pin]; }
        else if (g.players[socket.id]) {
            delete g.players[socket.id];
            io.to(g.host).emit("plist", Object.values(g.players).map((p) => ({ n: p.name, a: p.av })));
            if (g.phase === "q" && Object.keys(g.ans).length >= Object.keys(g.players).length && Object.keys(g.players).length) reveal(g);
        }
    });
});

const PORT = process.env.PORT || 3001;
srv.listen(PORT, () => console.log(`BilimOrbit Live: http://localhost:${PORT}`));