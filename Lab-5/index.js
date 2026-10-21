// Run: node index.js   (Node 18+, no npm install needed)
// Open: http://localhost:3000

const http = require("http");

const PORT = 3000;
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const SYSTEM = [
  "You are a helpful assistant. Reply in the same language the user writes in.",
  "Format answers in clean GitHub-flavored Markdown: short paragraphs, headings, bullet or numbered lists, tables, and fenced code blocks with a language tag.",
  "For math use \\( ... \\) inline and \\[ ... \\] for display equations. Never use single dollar signs for math.",
  "To draw a chart, output a fenced code block (three backticks) with the language tag chart containing ONLY valid JSON, for example: {\"type\":\"bar\",\"title\":\"Sales\",\"labels\":[\"Jan\",\"Feb\"],\"datasets\":[{\"label\":\"2026\",\"data\":[10,20]}]}. type is one of bar, line, pie, doughnut, radar, scatter. Use a chart whenever comparing numbers or showing a trend helps.",
  "To draw a diagram (flowchart, sequence, class, ER, gantt, mindmap), output a fenced code block (three backticks) with the language tag mermaid containing valid Mermaid syntax. Put node labels in double quotes.",
  "Never wrap the whole answer in a code block.",
].join("\n");

const HTML = String.raw`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chatbot</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #212121; color: #ececec; display: flex; overflow: hidden; }
  button { font: inherit; cursor: pointer; }

  /* sidebar */
  #side { width: 260px; background: #171717; display: flex; flex-direction: column; padding: 10px; flex-shrink: 0; transition: transform .2s; z-index: 20; }
  #newchat { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; background: transparent; color: #ececec; border: 0; border-radius: 10px; text-align: left; }
  #newchat:hover, .item:hover { background: #212121; }
  #list { flex: 1; overflow-y: auto; margin: 8px 0; }
  .item { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; }
  .item.active { background: #2f2f2f; }
  .item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .del { display: none; background: none; border: 0; color: #999; font-size: 16px; padding: 0 4px; }
  .item:hover .del { display: block; }
  .del:hover { color: #fff; }
  #keybox { border-top: 1px solid #2f2f2f; padding-top: 10px; }
  #keybox label { display: block; font-size: 12px; color: #9b9b9b; margin-bottom: 6px; }
  #key { width: 100%; padding: 9px 10px; background: #2f2f2f; color: #ececec; border: 1px solid transparent; border-radius: 8px; outline: none; font-size: 13px; }
  #key:focus { border-color: #555; }
  #key.warn { border-color: #e5484d; }

  /* main */
  #main { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
  #top { display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
  #menu { display: none; background: none; border: 0; color: #ececec; font-size: 22px; }
  #model { background: transparent; color: #ececec; border: 0; font-size: 17px; padding: 6px 8px; border-radius: 8px; outline: none; cursor: pointer; }
  #model:hover { background: #2f2f2f; }
  #model option { background: #2f2f2f; }

  #scroll { flex: 1; overflow-y: auto; }
  #welcome { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 500; padding-bottom: 80px; text-align: center; }
  #msgs { max-width: 768px; margin: 0 auto; padding: 10px 20px 30px; }
  .row { display: flex; margin: 22px 0; gap: 14px; }
  .row.user { justify-content: flex-end; }
  .bubble { background: #2f2f2f; padding: 10px 18px; border-radius: 22px; max-width: 80%; white-space: pre-wrap; line-height: 1.6; overflow-wrap: anywhere; }
  .avatar { width: 28px; height: 28px; border-radius: 50%; background: #d97757; color: #fff; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .content { flex: 1; min-width: 0; line-height: 1.7; overflow-wrap: anywhere; }
  .content p { margin: 0 0 12px; }
  .content h1, .content h2, .content h3 { margin: 18px 0 8px; line-height: 1.3; }
  .content h1 { font-size: 1.5em; } .content h2 { font-size: 1.25em; } .content h3 { font-size: 1.1em; }
  .content ul, .content ol { margin: 0 0 12px; padding-left: 24px; }
  .content a { color: #7cb4ff; }
  .content code { background: #2f2f2f; padding: 2px 6px; border-radius: 5px; font-size: .9em; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .code { background: #0d0d0d; border-radius: 12px; overflow: hidden; margin: 0 0 14px; }
  .code-head { display: flex; justify-content: space-between; align-items: center; background: #2f2f2f; padding: 6px 14px; font-size: 12px; color: #b4b4b4; }
  .copy { background: none; border: 0; color: #b4b4b4; font-size: 12px; }
  .copy:hover { color: #fff; }
  .code pre { margin: 0; padding: 14px; overflow-x: auto; }
  .code pre code { background: none; padding: 0; font-size: 13.5px; line-height: 1.55; }
  .dots i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; background: #9b9b9b; animation: b 1.2s infinite; }
  .dots i:nth-child(2) { animation-delay: .2s; } .dots i:nth-child(3) { animation-delay: .4s; }
  @keyframes b { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }

  /* input */
  #bar { padding: 0 20px 16px; }
  #box { max-width: 768px; margin: 0 auto; background: #2f2f2f; border-radius: 28px; display: flex; align-items: flex-end; padding: 8px 8px 8px 20px; gap: 8px; }
  #input { flex: 1; background: none; border: 0; outline: none; color: #ececec; font: inherit; resize: none; max-height: 200px; padding: 8px 0; line-height: 1.5; }
  #send { width: 36px; height: 36px; border-radius: 50%; border: 0; background: #fff; color: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  #send:disabled { background: #555; cursor: default; }
  #note { text-align: center; font-size: 12px; color: #9b9b9b; margin-top: 8px; }

  .content h4, .content h5, .content h6 { margin: 14px 0 6px; font-size: 1em; }
  .content li { margin: 3px 0; }
  .content hr { border: 0; border-top: 1px solid #3a3a3a; margin: 18px 0; }
  .content blockquote { border-left: 3px solid #555; margin: 0 0 12px; padding: 2px 14px; color: #b4b4b4; }
  .content del { color: #9b9b9b; }
  .tbl { overflow-x: auto; margin: 0 0 14px; }
  .tbl table { border-collapse: collapse; min-width: 50%; }
  .tbl th, .tbl td { border: 1px solid #3a3a3a; padding: 8px 12px; }
  .tbl th { background: #2a2a2a; }
  .math { overflow-x: auto; margin: 0 0 14px; }
  .code pre code.hljs { background: transparent; padding: 0; }
  .viz { background: #171717; border-radius: 12px; padding: 14px; margin: 0 0 14px; overflow-x: auto; }
  .viz-out { margin: 0 auto; position: relative; }
  .viz-out svg { max-width: 100%; height: auto; }
  .viz-wait { color: #9b9b9b; font-style: italic; margin: 0 0 12px; }
  .viz-err { color: #ff8a8a; margin-bottom: 8px; }
  .viz-out pre { white-space: pre-wrap; font-size: 12px; color: #b4b4b4; }

  @media (max-width: 768px) {
    #side { position: fixed; top: 0; bottom: 0; left: 0; transform: translateX(-100%); }
    #side.open { transform: none; }
    #menu { display: block; }
  }
</style>
</head>
<body>
<aside id="side">
  <button id="newchat"><span>＋</span> New chat</button>
  <div id="list"></div>
  <div id="keybox">
    <label for="key">Groq API key</label>
    <input id="key" type="password" placeholder="gsk_..." autocomplete="off">
  </div>
</aside>

<div id="main">
  <div id="top">
    <button id="menu">☰</button>
    <select id="model">
      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
    </select>
  </div>
  <div id="scroll">
    <div id="welcome">What can I help with?</div>
    <div id="msgs"></div>
  </div>
  <div id="bar">
    <div id="box">
      <textarea id="input" rows="1" placeholder="Message..."></textarea>
      <button id="send"></button>
    </div>
    <div id="note">AI can make mistakes. Check important info.</div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var BT = String.fromCharCode(96);
  var FENCE = BT + BT + BT;
  var ICON_SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  var ICON_STOP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>';

  var chats = [], cur = null, ctrl = null, busy = false;
  try { chats = JSON.parse(localStorage.getItem("chats") || "[]"); } catch (e) {}
  try { $("key").value = localStorage.getItem("apiKey") || ""; } catch (e) {}
  try { var sm = localStorage.getItem("model"); if (sm) $("model").value = sm; } catch (e) {}

  function save() { try { localStorage.setItem("chats", JSON.stringify(chats)); } catch (e) {} }
  function getChat() { return chats.filter(function (c) { return c.id === cur; })[0]; }
  function scrollDown() { var s = $("scroll"); s.scrollTop = s.scrollHeight; }
  function closeSide() { $("side").classList.remove("open"); }

  /* ---------- markdown + visuals ---------- */
  if (window.mermaid) mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
  var PALETTE = ["#d97757", "#4f9dff", "#52c41a", "#f5a623", "#b36bff", "#ff6b9d", "#2dd4bf", "#fadb14"];
  var mmId = 0;

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function inline(s) {
    s = esc(s);
    var keep = [];
    function hold(h) { keep.push(h); return "\u0001" + (keep.length - 1) + "\u0001"; }
    s = s.replace(new RegExp(BT + "([^" + BT + "]+)" + BT, "g"), function (m, c) { return hold("<code>" + c + "</code>"); });
    s = s.replace(/\\\((.+?)\\\)/g, function (m) { return hold(m); });
    s = s.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s.replace(/\u0001(\d+)\u0001/g, function (m, i) { return keep[i]; });
  }

  function blocks(t) {
    var lines = t.split("\n"), html = "", para = [], stack = [], i = 0;
    function flushP() { if (para.length) { html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } }
    function closeTo(ind) { while (stack.length && stack[stack.length - 1].ind > ind) { html += "</li></" + stack.pop().t + ">"; } }
    function item(tag, ind, txt, num) {
      closeTo(ind);
      var top = stack[stack.length - 1];
      if (!top || top.ind < ind) {
        html += "<" + tag + (tag === "ol" && num > 1 ? ' start="' + num + '"' : "") + "><li>";
        stack.push({ t: tag, ind: ind });
      } else if (top.t === tag) {
        html += "</li><li>";
      } else {
        html += "</li></" + top.t + "><" + tag + "><li>";
        top.t = tag;
      }
      html += inline(txt);
    }
    function cells(l) {
      l = l.trim();
      if (l.charAt(0) === "|") l = l.slice(1);
      if (l.charAt(l.length - 1) === "|") l = l.slice(0, -1);
      return l.split("|").map(function (c) { return c.trim(); });
    }
    var sepRe = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

    while (i < lines.length) {
      var ln = lines[i], m;
      if (!ln.trim()) { flushP(); i++; continue; }

      if (ln.indexOf("|") >= 0 && i + 1 < lines.length && lines[i + 1].indexOf("|") >= 0 && sepRe.test(lines[i + 1])) {
        flushP(); closeTo(-1);
        var head = cells(ln);
        var al = cells(lines[i + 1]).map(function (c) {
          var l = c.charAt(0) === ":", r = c.charAt(c.length - 1) === ":";
          return l && r ? "center" : r ? "right" : "left";
        });
        html += '<div class="tbl"><table><thead><tr>' + head.map(function (c, k) {
          return '<th style="text-align:' + (al[k] || "left") + '">' + inline(c) + "</th>";
        }).join("") + "</tr></thead><tbody>";
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") >= 0) {
          html += "<tr>" + cells(lines[i]).map(function (c, k) {
            return '<td style="text-align:' + (al[k] || "left") + '">' + inline(c) + "</td>";
          }).join("") + "</tr>";
          i++;
        }
        html += "</tbody></table></div>";
        continue;
      }

      if (/^\s*>/.test(ln)) {
        flushP(); closeTo(-1);
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
        html += "<blockquote>" + blocks(q.join("\n")) + "</blockquote>";
        continue;
      }

      if ((m = ln.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) {
        flushP(); closeTo(-1);
        html += "<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">";
        i++; continue;
      }

      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(ln)) { flushP(); closeTo(-1); html += "<hr>"; i++; continue; }

      if ((m = ln.match(/^(\s*)[-*+•]\s+(.*)$/))) { flushP(); item("ul", m[1].length, m[2]); i++; continue; }
      if ((m = ln.match(/^(\s*)(\d+)[.)]\s+(.*)$/))) { flushP(); item("ol", m[1].length, m[3], parseInt(m[2], 10)); i++; continue; }

      if (stack.length && /^\s{2,}/.test(ln)) { html += "<br>" + inline(ln.trim()); i++; continue; }

      closeTo(-1);
      para.push(ln);
      i++;
    }
    flushP(); closeTo(-1);
    return html;
  }

  function codeBlock(lang, code, fin) {
    lang = (lang || "").toLowerCase();
    if (lang === "chart" || lang === "mermaid") {
      if (!fin) return '<div class="viz-wait">Drawing ' + lang + "...</div>";
      return '<div class="viz" data-kind="' + lang + '"><pre hidden>' + esc(code) + '</pre><div class="viz-out"></div></div>';
    }
    return '<div class="code"><div class="code-head"><span>' + esc(lang || "code") + '</span><button class="copy">Copy</button></div><pre><code class="language-' + esc(lang || "plaintext") + '">' + esc(code.replace(/\n$/, "")) + "</code></pre></div>";
  }

  function mdText(t) {
    var out = "", last = 0, m;
    var re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
    while ((m = re.exec(t))) {
      out += blocks(t.slice(last, m.index));
      out += '<div class="math">\\[' + esc(m[1] || m[2]) + '\\]</div>';
      last = re.lastIndex;
    }
    return out + blocks(t.slice(last));
  }

  function md(src, fin) {
    var out = "", last = 0, m;
    var re = new RegExp(FENCE + "([\\w+#-]*)[^\\n]*\\n([\\s\\S]*?)(?:" + FENCE + "|$)", "g");
    while ((m = re.exec(src))) {
      out += mdText(src.slice(last, m.index));
      out += codeBlock(m[1], m[2], fin);
      last = re.lastIndex;
    }
    return out + mdText(src.slice(last));
  }

  function drawChart(out, src) {
    if (!window.Chart) { out.innerHTML = '<div class="viz-err">Chart.js failed to load (check internet).</div>'; return; }
    var spec;
    try { spec = JSON.parse(src); }
    catch (e) {
      try { spec = JSON.parse(src.replace(/,\s*([}\]])/g, "$1")); }
      catch (e2) { out.innerHTML = '<div class="viz-err">Chart JSON is invalid.</div><pre>' + esc(src) + "</pre>"; return; }
    }
    Chart.defaults.color = "#b4b4b4";
    Chart.defaults.borderColor = "#333";
    var type = spec.type || "bar";
    var round = type === "pie" || type === "doughnut" || type === "polarArea";
    var ds = (spec.datasets || []).map(function (d, i) {
      var o = Object.assign({}, d), c = PALETTE[i % PALETTE.length];
      if (!o.backgroundColor) o.backgroundColor = round ? PALETTE : (type === "line" || type === "radar" ? c + "33" : c);
      if (!o.borderColor && !round) o.borderColor = c;
      return o;
    });
    if (!ds.length && spec.data) ds = [{ label: spec.title || "", data: spec.data, backgroundColor: round ? PALETTE : PALETTE[0] }];
    out.style.maxWidth = round ? "380px" : "700px";
    var cv = document.createElement("canvas");
    out.appendChild(cv);
    try {
      new Chart(cv, {
        type: type,
        data: { labels: spec.labels || [], datasets: ds },
        options: { responsive: true, plugins: { title: { display: !!spec.title, text: spec.title || "", font: { size: 16 } } } }
      });
    } catch (e) { out.innerHTML = '<div class="viz-err">Chart error: ' + esc(e.message) + "</div>"; }
  }

  async function drawMermaid(out, src) {
    if (!window.mermaid) { out.innerHTML = '<div class="viz-err">Mermaid failed to load (check internet).</div>'; return; }
    var id = "mm" + (++mmId);
    try {
      var r = await mermaid.render(id, src);
      out.innerHTML = r.svg;
    } catch (e) {
      var junk = document.getElementById("d" + id);
      if (junk) junk.remove();
      out.innerHTML = '<div class="viz-err">Diagram syntax error.</div><pre>' + esc(src) + "</pre>";
    }
  }

  function enhance(el) {
    el.querySelectorAll(".viz").forEach(function (v) {
      if (v.dataset.done) return;
      v.dataset.done = "1";
      var src = v.querySelector("pre").textContent, out = v.querySelector(".viz-out");
      if (v.dataset.kind === "chart") drawChart(out, src); else drawMermaid(out, src);
    });
    if (window.hljs) el.querySelectorAll(".code pre code").forEach(function (c) { try { hljs.highlightElement(c); } catch (e) {} });
    if (window.renderMathInElement) {
      try {
        renderMathInElement(el, {
          delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("copy")) {
      var code = e.target.closest(".code").querySelector("pre").innerText;
      navigator.clipboard.writeText(code).then(function () {
        e.target.textContent = "Copied!";
        setTimeout(function () { e.target.textContent = "Copy"; }, 1500);
      });
    }
  });

  /* ---------- render ---------- */
  function addRow(role, text) {
    var row = document.createElement("div");
    row.className = "row " + role;
    var target;
    if (role === "user") {
      target = document.createElement("div");
      target.className = "bubble";
      target.textContent = text;
      row.appendChild(target);
    } else {
      var av = document.createElement("div");
      av.className = "avatar";
      av.textContent = "C";
      target = document.createElement("div");
      target.className = "content";
      target.innerHTML = md(text, true);
      enhance(target);
      row.appendChild(av);
      row.appendChild(target);
    }
    $("msgs").appendChild(row);
    return target;
  }

  function renderSide() {
    var list = $("list");
    list.innerHTML = "";
    chats.slice().reverse().forEach(function (c) {
      var it = document.createElement("div");
      it.className = "item" + (c.id === cur ? " active" : "");
      var t = document.createElement("span");
      t.textContent = c.title;
      var d = document.createElement("button");
      d.className = "del";
      d.textContent = "×";
      d.onclick = function (e) {
        e.stopPropagation();
        if (busy) return;
        chats = chats.filter(function (x) { return x.id !== c.id; });
        if (cur === c.id) cur = null;
        save(); renderAll();
      };
      it.onclick = function () { if (busy) return; cur = c.id; renderAll(); closeSide(); };
      it.appendChild(t);
      it.appendChild(d);
      list.appendChild(it);
    });
  }

  function renderMsgs() {
    $("msgs").innerHTML = "";
    var c = getChat();
    $("welcome").style.display = c && c.messages.length ? "none" : "flex";
    if (!c) return;
    c.messages.forEach(function (m) { addRow(m.role, m.content); });
    scrollDown();
  }

  function renderAll() { renderSide(); renderMsgs(); }

  function setBusy(b) {
    busy = b;
    $("send").innerHTML = b ? ICON_STOP : ICON_SEND;
  }

  function grow() {
    var t = $("input");
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 200) + "px";
  }

  /* ---------- send ---------- */
  async function send() {
    if (busy) { if (ctrl) ctrl.abort(); return; }
    var key = $("key").value.trim();
    var text = $("input").value.trim();
    if (!key) { $("key").classList.add("warn"); $("side").classList.add("open"); $("key").focus(); return; }
    if (!text) return;

    var c = getChat();
    if (!c) {
      c = { id: String(Date.now()), title: text.slice(0, 40), messages: [] };
      chats.push(c);
      cur = c.id;
      $("msgs").innerHTML = "";
    }
    $("input").value = "";
    grow();
    c.messages.push({ role: "user", content: text });
    save(); renderSide();
    $("welcome").style.display = "none";
    addRow("user", text);
    var bot = addRow("assistant", "");
    bot.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    scrollDown();

    setBusy(true);
    ctrl = new AbortController();
    var full = "";
    try {
      var r = await fetch("/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ apiKey: key, model: $("model").value, messages: c.messages })
      });
      if (!r.ok) {
        var et = await r.text();
        try { et = JSON.parse(et).error.message; } catch (x) {}
        bot.textContent = "Error " + r.status + ": " + et;
        c.messages.pop();
        if (!c.messages.length) { chats = chats.filter(function (x) { return x.id !== c.id; }); cur = null; }
        save(); renderSide();
        return;
      }
      var reader = r.body.getReader();
      var dec = new TextDecoder();
      var buf = "";
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        var lines = buf.split(/\r?\n/);
        buf = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].indexOf("data: ") !== 0) continue;
          try {
            var d = JSON.parse(lines[i].slice(6));
            var tx = d.choices && d.choices[0] && d.choices[0].delta && d.choices[0].delta.content;
            if (tx) {
              full += tx;
              bot.innerHTML = md(full, false);
              scrollDown();
            } else if (d.error) {
              full += "\n\nError: " + (d.error.message || "unknown");
              bot.innerHTML = md(full, false);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") { full += (full ? "\n\n" : "") + "Error: " + e.message; bot.innerHTML = md(full, false); }
    } finally {
      if (full) { c.messages.push({ role: "assistant", content: full }); bot.innerHTML = md(full, true); enhance(bot); scrollDown(); }
      else if (c.messages.length && c.messages[c.messages.length - 1].role === "user" && bot.querySelector(".dots")) {
        c.messages.pop();
        bot.closest(".row").remove();
        if (!c.messages.length) { chats = chats.filter(function (x) { return x.id !== c.id; }); cur = null; renderAll(); }
      }
      save(); renderSide();
      setBusy(false);
      ctrl = null;
      $("input").focus();
    }
  }

  /* ---------- model list from Groq ---------- */
  async function loadModels() {
    var key = $("key").value.trim();
    if (!key) return;
    try {
      var r = await fetch("/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: key })
      });
      if (!r.ok) return;
      var j = await r.json();
      var ids = (j.data || []).map(function (m) { return m.id; })
        .filter(function (id) { return !/whisper|tts|guard|orpheus|distil/i.test(id); })
        .sort();
      if (!ids.length) return;
      var saved = "";
      try { saved = localStorage.getItem("model") || ""; } catch (e) {}
      var sel = $("model");
      sel.innerHTML = "";
      ids.forEach(function (id) {
        var o = document.createElement("option");
        o.value = id;
        o.textContent = id;
        sel.appendChild(o);
      });
      sel.value = ids.indexOf(saved) >= 0 ? saved : (ids.indexOf("llama-3.3-70b-versatile") >= 0 ? "llama-3.3-70b-versatile" : ids[0]);
    } catch (e) {}
  }
  var keyTimer = null;

  /* ---------- events ---------- */
  $("send").onclick = send;
  $("input").addEventListener("input", grow);
  $("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  $("newchat").onclick = function () { if (busy) return; cur = null; renderAll(); $("input").focus(); closeSide(); };
  $("menu").onclick = function () { $("side").classList.toggle("open"); };
  $("scroll").addEventListener("click", closeSide);
  $("key").addEventListener("input", function () {
    $("key").classList.remove("warn");
    try { localStorage.setItem("apiKey", $("key").value.trim()); } catch (e) {}
    clearTimeout(keyTimer);
    keyTimer = setTimeout(loadModels, 600);
  });
  $("model").addEventListener("change", function () {
    try { localStorage.setItem("model", $("model").value); } catch (e) {}
  });

  setBusy(false);
  renderAll();
  loadModels();
  $("input").focus();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(HTML);
  }

  if (req.method === "POST" && req.url === "/models") {
    let body = "";
    for await (const c of req) body += c;
    let key = "";
    try { key = JSON.parse(body).apiKey || ""; } catch {}
    try {
      const up = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { authorization: "Bearer " + key },
      });
      res.writeHead(up.status, { "content-type": "application/json" });
      return res.end(await up.text());
    } catch (e) {
      res.writeHead(500);
      return res.end("Server error: " + e.message);
    }
  }

  if (req.method === "POST" && req.url === "/chat") {
    let body = "";
    for await (const c of req) body += c;

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end("Bad JSON");
    }

    const { apiKey, messages } = parsed;
    const model = typeof parsed.model === "string" && parsed.model ? parsed.model : DEFAULT_MODEL;
    if (!apiKey) {
      res.writeHead(400);
      return res.end("Missing API key");
    }

    try {
      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({ model, max_completion_tokens: 4096, stream: true, messages: [{ role: "system", content: SYSTEM }].concat(Array.isArray(messages) ? messages : []) }),
      });

      if (!upstream.ok) {
        res.writeHead(upstream.status);
        return res.end(await upstream.text());
      }

      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      req.on("close", () => upstream.body.cancel().catch(() => {}));
      for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch (e) {
      if (!res.headersSent) res.writeHead(500);
      res.end("Server error: " + e.message);
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => console.log("Chatbot at http://localhost:" + PORT));