import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import SUBJ from "./subjects";
import "./App.css";

const LG=["uz","kg","kz","ru"],LN=["O‘zbek","Кыргыз","Қазақ","Русский"];
const I={
join:["Qo‘shilish","Кошулуу","Қосылу","Войти"],pin:["O‘yin PIN","Оюн PIN","Ойын PIN","PIN игры"],name:["Ismingiz","Атыңыз","Атыңыз","Ваше имя"],
host:["O‘yin yaratish","Оюн түзүү","Ойын құру","Создать игру"],
hd:["Fanlarni tanlang, PIN oling, o‘quvchilar telefondan qo‘shiladi.","Сабактарды тандаңыз, PIN алыңыз, окуучулар телефондон кошулат.","Пәндерді таңдаңыз, PIN алыңыз, оқушылар телефоннан қосылады.","Выберите предметы, получите PIN — игроки заходят с телефонов."],
subj:["Fanlar","Сабактар","Пәндер","Предметы"],cnt:["Savollar soni","Суроолор саны","Сұрақ саны","Число вопросов"],tm:["Vaqt (soniya)","Убакыт (сек)","Уақыт (сек)","Время (сек)"],
mode:["Rejim","Режим","Режим","Режим"],classic:["Klassik (tezlik = ball)","Классика (ылдамдык = упай)","Классика (жылдамдық = ұпай)","Классика (скорость = очки)"],
gold:["Oltin izlash (sandiqlar)","Алтын издөө (сандыктар)","Алтын іздеу (сандықтар)","Золотая лихорадка (сундуки)"],
create:["Yaratish","Түзүү","Құру","Создать"],lobby:["O‘yinchilar","Оюнчулар","Ойыншылар","Игроки"],open:["Telefondan oching:","Телефондон ачыңыз:","Телефоннан ашыңыз:","Откройте на телефоне:"],
start:["Boshlash","Баштоо","Бастау","Начать"],next:["Keyingi","Кийинки","Келесі","Далее"],final:["Yakun","Жыйынтык","Қорытынды","Финал"],
wait:["Javob qabul qilindi. Kuting…","Жооп кабыл алынды. Күтүңүз…","Жауап қабылданды. Күтіңіз…","Ответ принят. Ждите…"],
joined:["Siz o‘yindasiz! Ismingiz ekranda ko‘rinadi.","Сиз оюндасыз! Атыңыз экранда көрүнөт.","Сіз ойындасыз! Атыңыз экранда көрінеді.","Вы в игре! Ваше имя на экране."],
right:["To‘g‘ri!","Туура!","Дұрыс!","Верно!"],wrong:["Noto‘g‘ri","Туура эмес","Қате","Неверно"],pts:["ball","упай","ұпай","баллов"],
pick:["Sandiqni tanlang!","Сандыкты тандаңыз!","Сандықты таңдаңыз!","Выберите сундук!"],rank:["O‘rin","Орун","Орын","Место"],home:["Bosh sahifa","Башкы бет","Басты бет","На главную"],
err1:["PIN topilmadi","PIN табылган жок","PIN табылмады","PIN не найден"],err2:["O‘yin boshlangan","Оюн башталган","Ойын басталған","Игра уже началась"],err3:["Ism bo‘sh yoki band","Ат бош же ээленген","Аты бос немесе бос емес","Имя пустое или занято"],
cg:["Oltin","Алтын","Алтын","Золото"],cb:["Katta xazina!","Чоң кенч!","Үлкен қазына!","Клад!"],cs:["O‘g‘irladingiz!","Уурдадыңыз!","Ұрладыңыз!","Украли!"],cx:["Bomba!","Бомба!","Бомба!","Бомба!"],
closed:["O‘yin yopildi","Оюн жабылды","Ойын жабылды","Игра закрыта"]};

const COL = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
const SH = ["▲", "◆", "●", "■"];
const socket = io(); // Vite proxy orqali server bilan bir xil manzilda ulanadi

// 3D yulduzlar fon
function Stars() {
  const r = useRef();
  useEffect(() => {
    const c = r.current, x = c.getContext("2d");
    let w, h, mx = 0, my = 0, id;
    const P = Array.from({ length: 200 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
    const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    const mv = (e) => {
      mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5;
      document.documentElement.style.setProperty("--px", e.clientX + "px");
      document.documentElement.style.setProperty("--py", e.clientY + "px");
    };
    rs();
    addEventListener("resize", rs);
    addEventListener("pointermove", mv);
    const f = () => {
      x.clearRect(0, 0, w, h);
      for (const s of P) {
        s.z -= 0.004;
        if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; }
        const k = 1 / s.z;
        x.globalAlpha = 1 - s.z * 0.7;
        x.fillStyle = `hsl(${200 + s.x * 60} 90% ${60 + (1 - s.z) * 30}%)`;
        x.beginPath(); x.arc((s.x + mx * 0.4) * k * w * 0.25 + w / 2, (s.y + my * 0.4) * k * h * 0.25 + h / 2, (1 - s.z) * 2.2, 0, 7); x.fill();
      }
      id = requestAnimationFrame(f);
    };
    f();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", rs); removeEventListener("pointermove", mv); };
  }, []);
  return <canvas id="st" ref={r} />;
}

const Board = ({ b }) => b.map((p, k) => (
  <div className="lr" key={k}><span>{k + 1}</span><span>{p.a} {p.n}</span><b>{p.sc}</b></div>
));

export default function App() {
  const [L, setL] = useState(+localStorage.l || 0);
  const [v, setV] = useState("home");
  const [sel, setSel] = useState(SUBJ.map((_, i) => i));
  const [cfg, setCfg] = useState({ count: 10, time: 20, mode: "classic" });
  const [pin, setPin] = useState(new URLSearchParams(location.search).get("pin") || "");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [role, setRole] = useState(null);
  const [me, setMe] = useState({});
  const [pl, setPl] = useState([]);
  const [d, setD] = useState(null);
  const [ac, setAc] = useState(null);
  const [myA, setMyA] = useState(null);
  const [rev, setRev] = useState(null);
  const [res, setRes] = useState(null);
  const [cr, setCr] = useState(null);
  const [bd, setBd] = useState([]);
  const [fin, setFin] = useState(null);
  const [toast, setToast] = useState("");
  const t = (k) => I[k][L];

  useEffect(() => { document.documentElement.lang = LG[L]; localStorage.l = L; }, [L]);

  useEffect(() => {
    socket.on("plist", setPl);
    socket.on("q", (x) => { setD(x); setMyA(null); setAc(null); setRev(null); setRes(null); setCr(null); setV("q"); });
    socket.on("ac", setAc);
    socket.on("reveal", (r) => { setRev(r); setBd(r.board); setV("rev"); });
    socket.on("res", (r) => { setRes(r); setCr(null); setV("res"); });
    socket.on("board", setBd);
    socket.on("chestres", setCr);
    socket.on("stolen", (r) => { setToast(`🏴‍☠️ ${r.n}: −${r.amt}`); setTimeout(() => setToast(""), 2600); });
    socket.on("end", (r) => { setFin(r); setV("end"); });
    socket.on("closed", () => { alert(I.closed[+localStorage.l || 0]); location.href = "/"; });
    return () => socket.off();
  }, []);

  const join = () => socket.emit("join", { pin, name }, (r) => {
    if (r.err) return setErr(t("err" + r.err));
    setRole("p"); setMe({ av: r.av, mode: r.mode, name: name.trim() }); setV("wait");
  });
  const create = () => socket.emit("host:create", { subs: sel, ...cfg }, (r) => {
    setPin(r.pin); setRole("h"); setPl([]); setV("lobby");
  });
  const answer = (i) => { if (myA != null) return; setMyA(i); socket.emit("answer", { i }); };
  const pick = () => { socket.emit("chest"); setCr({ wait: 1 }); };
  const toggle = (i) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const host = role === "h";

  return (
    <>
      <Stars />
      <header>
        <b>🪐 BilimOrbit Live</b>
        <nav>{LN.map((n, k) => <button key={n} className={k === L ? "on" : ""} onClick={() => setL(k)}>{n}</button>)}</nav>
      </header>
      {toast && <div className="toast">{toast}</div>}

      <main>
        {v === "home" && (
          <>
            <div className="orb3d">🪐</div>
            <h1>BilimOrbit Live</h1>
            <div className="two">
              <div className="card">
                <h2>{t("join")}</h2>
                <input inputMode="numeric" maxLength={6} placeholder={t("pin")} value={pin} onChange={(e) => setPin(e.target.value)} />
                <input maxLength={14} placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
                <button className="go" onClick={join}>{t("join")}</button>
                <p className="er">{err}</p>
              </div>
              <div className="card">
                <h2>{t("host")}</h2>
                <p>{t("hd")}</p>
                <button className="go alt" onClick={() => setV("setup")}>{t("host")}</button>
              </div>
            </div>
          </>
        )}

        {v === "setup" && (
          <div className="card">
            <h2>{t("host")}</h2>
            <h3>{t("subj")}</h3>
            <div className="chips">
              {SUBJ.map((s, i) => <button key={i} className={`chip ${sel.includes(i) ? "on" : ""}`} onClick={() => toggle(i)}>{s[0]} {s[1][L]}</button>)}
            </div>
            <div className="row">
              <label>{t("cnt")}
                <select value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: +e.target.value })}>{[5, 10, 15, 20].map((n) => <option key={n}>{n}</option>)}</select>
              </label>
              <label>{t("tm")}
                <select value={cfg.time} onChange={(e) => setCfg({ ...cfg, time: +e.target.value })}>{[10, 20, 30].map((n) => <option key={n}>{n}</option>)}</select>
              </label>
              <label>{t("mode")}
                <select value={cfg.mode} onChange={(e) => setCfg({ ...cfg, mode: e.target.value })}>
                  <option value="classic">{t("classic")}</option>
                  <option value="gold">{t("gold")}</option>
                </select>
              </label>
            </div>
            <button className="go" onClick={create} disabled={!sel.length}>{t("create")}</button>
          </div>
        )}

        {v === "lobby" && (
          <div className="card c">
            <small>{t("open")} {location.host}</small>
            <div className="pin">{pin}</div>
            <div className="qr"><QRCodeSVG value={`${location.origin}/?pin=${pin}`} size={200} /></div>
            <p>{location.origin}/?pin={pin}</p>
            <h3>{t("lobby")} ({pl.length})</h3>
            <div className="pl">{pl.map((p, i) => <span className="pp" key={i}>{p.a} {p.n}</span>)}</div>
            <button className="go" disabled={!pl.length} onClick={() => socket.emit("host:start")}>{t("start")}</button>
          </div>
        )}

        {v === "wait" && (
          <div className="card c"><div className="big">{me.av}</div><h2>{me.name}</h2><p>{t("joined")}</p></div>
        )}

        {v === "q" && d && (myA != null && !host ? (
          <div className="card c"><div className="big" style={{ color: COL[myA] }}>{SH[myA]}</div><h2>{t("wait")}</h2></div>
        ) : (
          <>
            <div className="top"><span>{SUBJ[d.si][0]} {d.n + 1}/{d.total}</span><span>{ac ? `${ac.a}/${ac.of}` : ""}</span></div>
            <div className="bar"><i key={d.n} style={{ animation: `drain ${d.time}s linear forwards` }} /></div>
            <div className="card q c"><h2>{d.s[L]}</h2></div>
            <div className="opts">
              {d.o.map((o, i) => (
                <button key={i} className="op" style={{ background: COL[i] }} disabled={host} onClick={() => answer(i)}><b>{SH[i]}</b><span>{o}</span></button>
              ))}
            </div>
          </>
        ))}

        {v === "rev" && rev && d && (
          <>
            <div className="card">
              <h2>{d.s[L]}</h2>
              <div className="bars">
                {rev.counts.map((c, i) => (
                  <div key={i} className={`bc ${i === rev.c ? "ok" : "dim"}`}>
                    <b>{SH[i]} {c}</b>
                    <i style={{ height: `${Math.max(6, (c / Math.max(1, ...rev.counts)) * 100)}%`, background: COL[i] }} />
                    <span>{d.o[i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>🏆</h3>
              <Board b={bd} />
              <button className="go" onClick={() => socket.emit("host:next")}>{rev.last ? t("final") : t("next")}</button>
            </div>
          </>
        )}

        {v === "res" && res && (
          <div className={`card c ${res.good ? "ok" : "no"}`}>
            <div className="big">{res.good ? "✅" : "❌"}</div>
            <h2>{res.good ? t("right") : t("wrong")}</h2>
            <div className="n">{me.mode === "gold" ? "💰" : "⭐"} {cr && cr.sc != null ? cr.sc : res.sc}</div>
            {res.gain ? <p>+{res.gain}</p> : null}
            <p>{t("rank")}: {res.rank} {res.st > 1 ? "🔥" + res.st : ""}</p>
            {res.chest && !cr && (
              <>
                <h3>{t("pick")}</h3>
                <div className="chs">{[0, 1, 2].map((k) => <button key={k} className="chest" onClick={pick}>🎁</button>)}</div>
              </>
            )}
            {cr && cr.wait && <p>…</p>}
            {cr && cr.type && (
              <div className={`cr ${cr.type}`}>
                {{ g: "💰 +", b: "💎 +", s: "🏴‍☠️ +", x: "💣 −" }[cr.type]}{cr.amt}
                <small>{t("c" + cr.type)}</small>
              </div>
            )}
          </div>
        )}

        {v === "end" && fin && (
          <div className="card c">
            <div className="big">🏆</div>
            <h2>{t("final")}</h2>
            {fin.rank ? <><div className="n">#{fin.rank}</div><p>{fin.sc} {t("pts")}</p></> : null}
            <Board b={fin.board} />
            <button className="go" onClick={() => (location.href = "/")}>{t("home")}</button>
          </div>
        )}
      </main>
    </>
  );
}