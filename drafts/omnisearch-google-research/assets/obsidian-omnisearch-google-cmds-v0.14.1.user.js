// ==UserScript==
// @name         Obsidian Omnisearch in Google — CMDS
// @namespace    https://github.com/johnfkoo951/obsidian-omnisearch-google-cmds
// @downloadURL  https://raw.githubusercontent.com/johnfkoo951/obsidian-omnisearch-google-cmds/main/obsidian-omnisearch-google-cmds.user.js
// @updateURL    https://raw.githubusercontent.com/johnfkoo951/obsidian-omnisearch-google-cmds/main/obsidian-omnisearch-google-cmds.user.js
// @homepageURL  https://github.com/johnfkoo951/obsidian-omnisearch-google-cmds
// @supportURL   https://github.com/johnfkoo951/obsidian-omnisearch-google-cmds/issues
// @version      0.14.1-custom
// @description  Local multi-vault search beside Google, native Obsidian links, accessible filters, safe previews, connection status and keyboard navigation.
// @author       구요한 (CMDSPACE)
// @contributor  Simon Cambier (original "Obsidian Omnisearch in Google" — https://github.com/scambier/userscripts)
// @license      MIT  (this fork; original is unlicensed — see README. Credit retained to the original author.)
// @match        https://google.com/*
// @match        https://www.google.com/*
// @match        https://www.google.co.kr/*
// @match        https://google.co.kr/*
// @match        http://google.com/*
// @match        http://www.google.com/*
// @icon         https://obsidian.md/favicon.ico
// @require      https://raw.githubusercontent.com/sizzlemctwizzle/GM_config/b3ac68b00ba88f7817270ca0ccd28424282a7973/gm_config.js
// @run-at       document-end
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==
/* globals GM_config, GM, GM_getValue, GM_setValue, GM_xmlhttpRequest, GM_registerMenuCommand */
(function () {
    "use strict";

    const ID = "OmnisearchObsidianResults";
    const VERSION = "0.14.1";
    const S = {};
    const state = {
        raw: [], view: [], selected: -1, collapsed: false, controlsOpen: false,
        sort: "score", type: "all", minRel: 0, vault: "", refine: "",
        expanded: new Set(), generation: 0, render: 0, limit: 5, total: 0,
        statuses: [], pending: 0, lastQuery: "", requests: new Set(),
    };
    let root, toastTimer, refineTimer;
    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const validHex = (s) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s));
    const clamp = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.max(min, Math.min(max, Number(n))) : fallback;
    const extOf = (p) => String(p).split(".").pop().toLowerCase();
    const matchType = (p, t) => t === "all" || (t === "img" ? ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"].includes(extOf(p)) : extOf(p) === t);
    const getVal = async (key, fallback) => {
        try { return typeof GM !== "undefined" && GM.getValue ? await GM.getValue(key, fallback) : GM_getValue(key, fallback); }
        catch { return fallback; }
    };
    const setVal = async (key, value) => {
        try {
            if (typeof GM !== "undefined" && GM.setValue) await GM.setValue(key, value);
            else GM_setValue(key, value);
        } catch { toast("설정을 저장하지 못했습니다. 현재 탭에서는 유지됩니다."); }
    };
    const baseQuery = () => state.refine.trim() || new URL(location.href).searchParams.get("q") || "";
    const effectiveQuery = () => {
        const q = baseQuery();
        return S.exactMatch && q && !/^".*"$/.test(q) ? `"${q}"` : q;
    };
    const vaultName = (item) => item._dvault || item.vault || "";
    const validPath = (path) => typeof path === "string" && !!path && !/^[\\/]|^[a-z]:|[\x00-\x1f]/i.test(path)
        && !path.split(/[\\/]/).some((part) => part === ".." || part === ".");
    function openUrl(item, advanced = S.useAdvancedUri) {
        if (!validPath(item.path) || !vaultName(item)) return "";
        // Both URI schemes accept an extension. Keep the exact vault-relative filename.
        return `obsidian://${advanced ? "adv-uri" : "open"}?vault=${encodeURIComponent(vaultName(item))}&${advanced ? "filepath" : "file"}=${encodeURIComponent(item.path)}`;
    }
    function lrBase(value) {
        let text = String(value || "").trim();
        if (/^\d+$/.test(text)) text = "http://127.0.0.1:" + text;
        else if (/^(localhost|127\.0\.0\.1):\d+$/.test(text)) text = "http://" + text;
        try {
            const u = new URL(text);
            if (!["http:", "https:"].includes(u.protocol) || !["localhost", "127.0.0.1"].includes(u.hostname)
                || u.username || u.password || u.search || u.hash || u.pathname !== "/") return null;
            return u.origin;
        } catch { return null; }
    }
    const hasRest = (item) => !!(item._restKey && lrBase(item._restPort));
    const encodedPath = (path) => path.split("/").map(encodeURIComponent).join("/");
    function request(options, tracked = true) {
        return new Promise((resolve) => {
            let handle, finished = false;
            const done = (result) => {
                if (finished) return;
                finished = true;
                state.requests.delete(handle);
                resolve(result);
            };
            try {
                const api = typeof GM !== "undefined" && GM.xmlHttpRequest ? GM.xmlHttpRequest.bind(GM) : GM_xmlhttpRequest;
                handle = api({ ...options, timeout: S.requestTimeout, anonymous: true,
                    onload: (r) => done({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.responseText || r.response || "" }),
                    onerror: () => done({ ok: false, reason: "연결 안 됨" }),
                    ontimeout: () => done({ ok: false, reason: "시간 초과" }),
                    onabort: () => done({ ok: false, reason: "취소됨" }),
                });
                if (tracked && !finished && handle?.abort) state.requests.add(handle);
                if (handle?.catch) handle.catch(() => done({ ok: false, reason: "요청 실패" }));
            } catch { done({ ok: false, reason: "요청 권한 확인" }); }
        });
    }
    function cancelRequests() {
        for (const handle of state.requests) { try { handle.abort(); } catch { /* Already settled. */ } }
        state.requests.clear();
    }
    function showOpenHelp(item, message) {
        const basic = openUrl(item, false), advanced = openUrl(item, true);
        $(".om-open-help").hidden = false;
        $(".om-open-help").innerHTML = `<strong>${escapeHtml(item.basename)}</strong><p>${escapeHtml(message)}</p>
            ${basic ? `<a href="${escapeHtml(basic)}">기본 링크로 열기</a> <a href="${escapeHtml(advanced)}">Advanced URI로 열기</a>` : "볼트 이름이 없습니다. 설정에서 등록 볼트명을 입력하세요."}
            <button type="button" data-action="dismiss-open">닫기</button>`;
    }
    async function openViaRest(item, button) {
        if (!hasRest(item)) { showOpenHelp(item, "Local REST 포트와 키가 없습니다. 아래 링크를 직접 클릭하세요."); return; }
        const generation = state.generation;
        button.closest("details")?.removeAttribute("open");
        button.disabled = true;
        button.textContent = "요청 중…";
        const response = await request({ method: "POST", url: `${lrBase(item._restPort)}/open/${encodedPath(item.path)}`,
            headers: { Authorization: "Bearer " + item._restKey } }, false);
        button.disabled = false;
        button.textContent = "REST 열기";
        if (generation !== state.generation) return;
        // Async external-protocol redirects lose the click's user activation. Offer a real link instead.
        showOpenHelp(item, response.ok
            ? "REST 서버가 열기 요청을 수락했습니다. 창이 앞으로 오지 않으면 아래 링크를 클릭하세요."
            : `REST ${response.status !== undefined ? "HTTP " + response.status : response.reason}. 아래 링크를 직접 클릭하거나 포트·키를 확인하세요.`);
    }
    function absPath(item) {
        const base = item._root || (S.vaultsParentDir && item.vault ? S.vaultsParentDir.replace(/\/+$/, "") + "/" + item.vault : "");
        return base ? base.replace(/\/+$/, "") + "/" + item.path : null;
    }
    function vaultColor(item) {
        if (validHex(item._color)) return item._color;
        let h = 0;
        for (const c of item._label || item.vault || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
        return `hsl(${h % 360} 45% 55%)`;
    }
    // Parse in an inert template; emit text and attribute-free <mark> only. Never insert API HTML.
    function safeExcerpt(raw) {
        const template = document.createElement("template");
        template.innerHTML = String(raw ?? "").slice(0, 12000);
        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent);
            if (node.nodeType !== Node.ELEMENT_NODE) return "";
            if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(node.tagName.toUpperCase())) return "";
            if (node.tagName === "BR") return " ";
            const text = [...node.childNodes].map(walk).join("");
            return node.tagName === "MARK" ? `<mark>${text}</mark>` : text;
        };
        return [...template.content.childNodes].map(walk).join("");
    }
    function cleanExcerpt(raw) {
        // Only remove a real leading YAML block, not words/dates/wikilinks scattered through prose.
        const text = S.cleanFrontmatter ? String(raw ?? "").replace(/^﻿?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "") : raw;
        return safeExcerpt(text);
    }
    function bodyPreview(content, query) {
        const body = String(content || "").replace(/^﻿?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
            .replace(/```[\s\S]*?```/g, " ").replace(/^#{1,6}\s+/gm, "")
            .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, alias) => alias || path)
            .replace(/\s+/g, " ").trim();
        const terms = [...new Set(String(query || "").split(/\s+/).map((t) => t.replace(/^"|"$/g, "")).filter(Boolean))]
            .sort((a, b) => b.length - a.length).slice(0, 20);
        const indexes = terms.map((t) => body.toLowerCase().indexOf(t.toLowerCase())).filter((i) => i >= 0);
        const start = indexes.length ? Math.max(0, Math.min(...indexes) - 60) : 0;
        const snippet = body.slice(start, start + 400);
        let html = "", offset = 0;
        if (terms.length) {
            const re = new RegExp(terms.map(escapeRegExp).join("|"), "gi");
            for (const m of snippet.matchAll(re)) {
                html += escapeHtml(snippet.slice(offset, m.index)) + `<mark>${escapeHtml(m[0])}</mark>`;
                offset = m.index + m[0].length;
            }
        }
        html += escapeHtml(snippet.slice(offset));
        return (start ? "… " : "") + html + (start + snippet.length < body.length ? " …" : "");
    }
    function uniqueTags(tags) {
        const seen = new Set();
        return tags.map((t) => String(t).replace(/^#+/, "").replace(/[….,;:]+$/u, ""))
            .filter((t) => t && t.length <= 60 && /[^0-9]/.test(t) && !/[\s<>"'`\[\]]/.test(t))
            .filter((t) => { const key = t.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
    }
    function extractTags(raw) {
        const template = document.createElement("template");
        template.innerHTML = safeExcerpt(raw);
        return uniqueTags((template.content.textContent.match(/(?:^|\s)#[\p{L}\p{N}_\/-]+/gu) || []).map((t) => t.trim()));
    }
    function notesTags(note) {
        const fm = note.frontmatter || note.properties || {};
        const flatten = (v) => Array.isArray(v) ? v.flatMap(flatten) : typeof v === "string" ? v.split(/[,\s]+/) : [];
        const curated = uniqueTags(flatten(fm.tags ?? fm.tag));
        return curated.length ? curated : uniqueTags(flatten(note.tags).concat(extractTags(note.content || "")));
    }
    const noteCache = new Map();
    let activeNoteReads = 0;
    const noteWaiters = [];
    async function withNoteSlot(read) {
        if (activeNoteReads >= 3) await new Promise((resolve) => noteWaiters.push(resolve));
        else activeNoteReads++;
        try { return await read(); }
        finally {
            const next = noteWaiters.shift();
            if (next) next(); else activeNoteReads--;
        }
    }
    async function enrichResults() {
        if (!S.useLocalRest) return;
        const generation = state.generation, render = state.render, query = baseQuery();
        const queue = state.view.filter((item) => hasRest(item) && extOf(item.path) === "md").slice(0, 30);
        async function worker() {
            while (queue.length && generation === state.generation && render === state.render) {
                const item = queue.shift();
                let note = noteCache.get(item._id);
                if (!note) {
                    const response = await withNoteSlot(() => {
                        if (generation !== state.generation || render !== state.render) return null;
                        return request({ method: "GET", url: `${lrBase(item._restPort)}/vault/${encodedPath(item.path)}`,
                            headers: { Authorization: "Bearer " + item._restKey, Accept: "application/vnd.olrapi.note+json" } });
                    });
                    if (!response?.ok) continue;
                    try { note = JSON.parse(response.text); } catch { continue; }
                    if (!note || typeof note !== "object") continue;
                    if (generation !== state.generation) return;
                    noteCache.set(item._id, note);
                }
                if (generation !== state.generation || render !== state.render) return;
                const card = $$(".om-result").find((el) => el.dataset.key === item._id);
                if (!card) continue;
                if (typeof note.content === "string") card.querySelector(".om-excerpt").innerHTML = bodyPreview(note.content, query);
                if (S.showTags) card.querySelector(".om-tags").innerHTML = tagsHtml(notesTags(note));
            }
        }
        await Promise.all([worker(), worker(), worker()]);
    }
    function toast(message) {
        const el = $(".om-toast");
        el.textContent = message;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
    }
    async function copyText(text) {
        try { await navigator.clipboard.writeText(text); toast("복사했습니다."); }
        catch {
            const active = document.activeElement;
            const ta = document.createElement("textarea");
            ta.value = text; ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
            root.append(ta); ta.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch { /* Report failure below. */ }
            ta.remove(); active?.focus();
            toast(ok ? "복사했습니다." : "복사 권한을 확인해주세요.");
        }
    }
    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            #${ID} {
                --accent:#134538; --on-accent:#fff; --pink:#E985A2;
                --surface:#fff; --soft:#f4f7f5; --text:#202823; --muted:#59665f; --line:#dce4df;
                font:14px/1.6 "SF Pro Text","SF Pro Display","Pretendard",system-ui,sans-serif;
                color:var(--text); background:var(--surface); border:1px solid var(--line); border-radius:16px;
                margin:20px 0; width:100%; min-width:0; max-width:100%; box-sizing:border-box;
                text-align:left; position:relative; isolation:isolate; overflow-wrap:anywhere;
                box-shadow:0 2px 8px #00000006; color-scheme:light;
            }
            @media(prefers-color-scheme:dark) {
                #${ID} { --accent:#E985A2; --on-accent:#1b1b1b; --surface:#222623; --soft:#2a302c;
                    --text:#edf2ee; --muted:#b5c1b9; --line:#434d46; color-scheme:dark; }
            }
            #${ID} * { box-sizing:border-box; }
            #${ID} [hidden] { display:none !important; }
            #${ID} button,#${ID} select,#${ID} input { font:inherit; color:inherit; }
            #${ID} button,#${ID} select { cursor:pointer; }
            #${ID} button { border:1px solid var(--line); background:var(--surface); border-radius:7px; padding:5px 9px; min-height:32px; line-height:1.4; }
            #${ID} button:hover,#${ID} summary:hover { background:var(--soft); }
            #${ID} button:disabled { cursor:wait; opacity:.65; }
            #${ID} :is(button,a,input,select,summary):focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
            #${ID} a { color:var(--accent); text-decoration:none; }
            #${ID} a:hover { text-decoration:underline; }
            #${ID} p { margin:4px 0 8px; }
            #${ID} .om-header { padding:16px 18px 12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
            #${ID} .om-brand { flex:1; min-width:140px; }
            #${ID} .om-brand strong { display:block; font-size:18px; line-height:1.3; letter-spacing:-.4px; }
            #${ID} .om-brand span { font-size:11px; color:var(--muted); }
            #${ID} .om-header button { font-size:12px; border-color:transparent; }
            #${ID} .om-body { padding:0 16px 10px; }
            #${ID} .om-search { display:flex; align-items:center; border:1px solid var(--line); border-radius:9px; padding:3px 4px 3px 10px; background:var(--soft); gap:5px; }
            #${ID} .om-search:focus-within { outline:2px solid var(--accent); outline-offset:2px; }
            #${ID} .om-refine { min-width:0; flex:1; width:100%; border:0; background:transparent; padding:5px 0; outline:none; }
            #${ID} .om-search button { border:0; background:transparent; font-size:12px; }
            #${ID} .om-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; padding:10px 0; }
            #${ID} .om-status { flex:1; color:var(--muted); font-size:12px; min-width:120px; }
            #${ID} .om-toolbar button { font-size:12px; }
            #${ID} button[aria-pressed=true] { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
            #${ID} .om-controls { padding:12px; background:var(--soft); border-radius:9px; margin-bottom:10px; display:grid; gap:10px; }
            #${ID} .om-controls label { display:flex; align-items:center; gap:8px; font-size:12px; }
            #${ID} .om-controls select { flex:1; min-width:0; border:1px solid var(--line); border-radius:5px; background:var(--surface); padding:5px; }
            #${ID} .om-controls input[type=range] { flex:1; min-width:0; width:80px; accent-color:var(--accent); }
            #${ID} .om-vaults { display:flex; gap:6px; flex-wrap:wrap; padding-bottom:10px; }
            #${ID} .om-vaults button { font-size:11px; min-height:30px; }
            #${ID} .om-vaults small { opacity:.85; margin-left:4px; }
            #${ID} .om-result { padding:15px 1px; border-top:1px solid var(--line); position:relative; }
            #${ID} .om-result.selected { background:var(--soft); outline:2px solid var(--accent); outline-offset:3px; border-radius:8px; }
            #${ID} .om-meta { display:flex; gap:8px; align-items:center; color:var(--muted); font-size:11px; margin-bottom:5px; }
            #${ID} .om-badge { display:inline-flex; align-items:center; gap:6px; min-width:0; }
            #${ID} .om-badge::before { content:""; background:var(--vc,var(--accent)); width:7px; height:7px; border-radius:50%; flex-shrink:0; }
            #${ID} .om-score { margin-left:auto; white-space:nowrap; }
            #${ID} .om-title { font-size:16px; line-height:1.45; font-weight:650; margin:0 0 7px; letter-spacing:-.15px; }
            #${ID} .om-title a { color:var(--title,var(--text)); display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
            #${ID}.vscope-full .om-title a { color:var(--vc,var(--text)); }
            #${ID} .om-excerpt { font-size:13px; line-height:1.65; color:var(--muted); white-space:pre-line;
                display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:var(--excerpt-lines,3); overflow:hidden; }
            #${ID} .om-excerpt.expanded { display:block; }
            #${ID} mark { color:var(--text); background:color-mix(in srgb,var(--accent) 15%,var(--surface)); border-radius:2px; }
            #${ID} .om-tags,#${ID} .om-terms { display:flex; flex-wrap:wrap; gap:5px; font-size:11px; margin-top:7px; }
            #${ID} .om-tag { color:var(--muted); background:var(--soft); padding:1px 6px; border-radius:5px; }
            #${ID} .om-tag::before { content:"#"; opacity:.7; }
            #${ID} .om-path { font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:7px; }
            #${ID} .om-actions { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:9px; font-size:12px; }
            #${ID} .om-open { display:inline-flex; align-items:center; min-height:32px; padding:4px 10px; background:var(--accent); color:var(--on-accent); border-radius:6px; }
            #${ID} .om-actions button { font-size:11px; padding:4px 7px; }
            #${ID} details { position:relative; }
            #${ID} summary { cursor:pointer; padding:5px 8px; border-radius:6px; }
            #${ID} .om-menu { position:absolute; bottom:34px; right:0; display:grid; gap:4px; width:160px; padding:7px;
                background:var(--surface); border:1px solid var(--line); border-radius:8px; z-index:2; box-shadow:0 6px 18px #0002; }
            #${ID} .om-menu a { padding:5px; }
            #${ID} .om-message { padding:20px 4px; color:var(--muted); font-size:13px; }
            #${ID} .om-open-help,#${ID} .om-help { background:var(--soft); padding:12px; font-size:12px; border-radius:8px; margin-bottom:10px; }
            #${ID} .om-open-help a { display:inline-block; margin:5px 12px 5px 0; text-decoration:underline; }
            #${ID} .om-more { width:100%; margin:8px 0; }
            #${ID} .om-footer { display:flex; gap:8px; align-items:center; border-top:1px solid var(--line); padding:8px 0 0; color:var(--muted); font-size:10px; }
            #${ID} .om-footer span { flex:1; }
            #${ID} .om-footer button { font-size:11px; border-color:transparent; }
            #${ID} .om-toast { position:sticky; bottom:12px; background:var(--text); color:var(--surface); padding:9px 12px; border-radius:8px; z-index:3; font-size:12px; }
            #${ID}.skin-tinted .om-result { background:color-mix(in srgb,var(--vc) 6%,var(--surface)); padding:12px; margin-bottom:6px; border-radius:8px; }
            #${ID}.skin-flat { border-color:transparent; box-shadow:none; }
            #${ID}.skin-solid .om-badge::before { display:none; }
            @media(max-width:600px) { #${ID} { border-radius:12px; } #${ID} .om-header { padding:12px; } #${ID} .om-body { padding:0 12px 10px; } }
            @media(prefers-reduced-motion:reduce) { #${ID} *,#${ID} { scroll-behavior:auto !important; transition:none !important; } }
        `;
        document.head.append(style);
    }
    function applyTheme() {
        const dark = matchMedia("(prefers-color-scheme: dark)").matches;
        const themes = { Ocean:["#0369a1","#7dd3fc"], Obsidian:["#6941b7","#c4b5fd"], Mono:["#3c4043","#d1d5db"],
            Forest:["#166534","#86efac"], Sunset:["#9a3412","#fdba74"], Rose:["#9f1239","#fda4af"],
            Grape:["#6d28d9","#d8b4fe"], Slate:["#475569","#cbd5e1"], CMDS:["#134538","#E985A2"] };
        root.style.setProperty("--accent", validHex(S.accentColor) ? S.accentColor : (themes[S.theme] || themes.CMDS)[dark ? 1 : 0]);
        if (validHex(S.titleColor)) root.style.setProperty("--title", S.titleColor);
        root.style.setProperty("--excerpt-lines", S.excerptLines);
    }
    // ---------- config ----------
    // @ts-ignore
    const CONFIG_CSS = `
        body { font: 13px/1.5 "SF Pro Text", "Pretendard", system-ui, sans-serif; margin: 0; padding: 0 0 64px; color:#1b1b1b; }
        #ObsidianOmnisearchGoogle_header { font-size: 17px; padding: 14px 14px 10px; position: sticky; top: 0; background:#fff; z-index: 2; border-bottom:1px solid #eee; }
        .section_header_holder { margin: 14px 10px 2px; }
        .section_header {
            background: #eef3f1; color: #134538; border: 1px solid #d4e2dc;
            font-size: 11px; font-weight: 700; letter-spacing: .04em;
            text-align: left; padding: 4px 9px; border-radius: 6px;
        }
        .section_desc { font-size: 11px; color:#59665f; text-align:left; padding: 3px 4px 0; }
        .config_var { margin: 5px 10px; }
        .field_label { font-weight: 600; cursor: help; }
        input[type=text], input[type=password], input[type=number], select { padding: 3px 6px; border:1px solid #ccc; border-radius: 5px; }
        #ObsidianOmnisearchGoogle_buttons_holder {
            position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
            border-top: 1px solid #ddd; box-shadow: 0 -2px 10px rgba(0,0,0,.12);
            padding: 9px 14px; text-align: right; z-index: 3;
        }
        #ObsidianOmnisearchGoogle_buttons_holder button { font-size: 13px; padding: 5px 16px; margin-left: 8px; cursor: pointer; }
        #ObsidianOmnisearchGoogle_resetLink { margin-right: auto; font-size: 12px; }
    `;

    const gmc = new GM_config({
        id: "ObsidianOmnisearchGoogle",
        title: "Omnisearch in Google — Configuration",
        css: CONFIG_CSS,
        fields: {
            // ----- Vault slots (leave Port blank to disable a slot). No paths hardcoded — fill your own. -----
            v1_port:  { section: ["Vault 1", "볼트마다 한 칸. Port를 비우면 그 슬롯은 사용 안 함."], label: "Port", type: "text", default: "51361", title: "이 볼트의 Omnisearch HTTP 포트. 비우면 슬롯 비활성." },
            v1_name:  { label: "Display name (badge)", type: "text", default: "Main", title: "결과 카드 배지에 표시할 볼트 이름 (예: Main, Wiki)." },
            v1_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "", title: "deeplink에 쓸 Obsidian 등록 볼트명. 비우면 Omnisearch가 준 값 사용." },
            v1_color: { label: "Color hex (blank = auto)", type: "text", default: "#E39AAB", title: "이 볼트의 배지/카드 색 (#RRGGBB). 비우면 이름 해시로 자동." },
            v1_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "", title: "abs 경로 복사용 절대경로 루트. 보통은 아래 '공통 부모 폴더' 하나면 충분." },
            v1_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "", title: "이 볼트 Local REST API(HTTP) 포트. body+태그 정확 표시용. General의 'Use Local REST API' 켜야 동작." },
            v1_lrKey:  { label: "Local REST API key", type: "text", default: "", title: "이 볼트 Local REST API 키(Bearer). 플러그인 설정에서 복사." },

            v2_port:  { section: ["Vault 2"], label: "Port", type: "text", default: "51362" },
            v2_name:  { label: "Display name (badge)", type: "text", default: "Wiki" },
            v2_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "" },
            v2_color: { label: "Color hex (blank = auto)", type: "text", default: "#86C2A6" },
            v2_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "" },
            v2_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "" },
            v2_lrKey:  { label: "Local REST API key", type: "text", default: "" },

            v3_port:  { section: ["Vault 3"], label: "Port", type: "text", default: "" },
            v3_name:  { label: "Display name (badge)", type: "text", default: "" },
            v3_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "" },
            v3_color: { label: "Color hex (blank = auto)", type: "text", default: "" },
            v3_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "" },
            v3_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "" },
            v3_lrKey:  { label: "Local REST API key", type: "text", default: "" },

            v4_port:  { section: ["Vault 4"], label: "Port", type: "text", default: "" },
            v4_name:  { label: "Display name (badge)", type: "text", default: "" },
            v4_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "" },
            v4_color: { label: "Color hex (blank = auto)", type: "text", default: "" },
            v4_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "" },
            v4_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "" },
            v4_lrKey:  { label: "Local REST API key", type: "text", default: "" },

            v5_port:  { section: ["Vault 5"], label: "Port", type: "text", default: "" },
            v5_name:  { label: "Display name (badge)", type: "text", default: "" },
            v5_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "" },
            v5_color: { label: "Color hex (blank = auto)", type: "text", default: "" },
            v5_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "" },
            v5_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "" },
            v5_lrKey:  { label: "Local REST API key", type: "text", default: "" },

            v6_port:  { section: ["Vault 6"], label: "Port", type: "text", default: "" },
            v6_name:  { label: "Display name (badge)", type: "text", default: "" },
            v6_vault: { label: "Obsidian vault name for deeplink (blank = auto-detect)", type: "text", default: "" },
            v6_color: { label: "Color hex (blank = auto)", type: "text", default: "" },
            v6_root:  { label: "Filesystem root for 'copy abs path' (blank = off)", type: "text", default: "" },
            v6_lrPort: { label: "Local REST API port (blank = off)", type: "text", default: "" },
            v6_lrKey:  { label: "Local REST API key", type: "text", default: "" },
            nbResults: { section: ["General settings", "공통 설정. 라벨에 마우스를 올리면 한국어 설명이 나옵니다."], label: "Results to display", type: "int", default: 5, title: "필터·정렬 후 보여줄 결과 개수." },
            excerptLines: { label: "Excerpt lines (separate expand button)", type: "int", default: 3, title: "본문 미리보기 줄 수. 별도 더 보기 버튼으로 펼칩니다." },
            showScore: { label: "Show within-vault relative score", type: "checkbox", default: true, title: "같은 볼트 최고점 대비 상대 점수. 의미 유사도나 확률이 아닙니다." },
            showPath: { label: "Show path breadcrumb", type: "checkbox", default: true, title: "노트 경로를 브레드크럼으로 표시." },
            showVaultBadge: { label: "Vault badge", type: "select", options: ["auto", "always", "never"], default: "auto", title: "볼트 배지 표시: auto=2개 이상일 때 / always / never." },
            showTags: { label: "Show tags in footer", type: "checkbox", default: true, title: "카드 하단에 노트 태그 칩 표시(미리보기에서 best-effort 추출)." },
            maxTags: { label: "Max tags per card", type: "int", default: 5, title: "카드당 표시할 태그 최대 개수." },
            showMatchedTerms: { label: "Show matched query terms (noisy — usually off)", type: "checkbox", default: false, title: "매칭된 검색어 조각 표시. 한국어 조사 변형(rag를/rag가)이 섞여 지저분 — 보통 끔. 태그를 원하면 위의 'Show tags'를 쓰세요." },
            cleanFrontmatter: { label: "Strip frontmatter from preview", type: "checkbox", default: true, title: "미리보기에서 YAML(태그·작성자·날짜·wikilink 등) 제거하고 본문 위주로." },
            exactMatch: { label: "Exact match (wrap query in quotes)", type: "checkbox", default: false, title: "검색어를 따옴표로 묶어 정확 매칭." },
            excludeFolders: { label: "Exclude paths containing (comma-separated)", type: "text", default: "", title: "경로에 이 문자열이 포함된 결과 제외(콤마로 여러 개)." },
            theme: { label: "Accent theme", type: "select", options: ["Ocean", "CMDS", "Obsidian", "Mono", "Forest", "Sunset", "Rose", "Grape", "Slate"], default: "CMDS", title: "기본 색 테마(헤더·단일볼트·fallback). Ocean=블루, CMDS=그린/핑크, Obsidian=퍼플, Mono=중립, Forest=그린, Sunset=오렌지, Rose=레드핑크, Grape=보라, Slate=청회색. 라이트/다크 자동." },
            skin: { label: "Card style", type: "select", options: ["Clean", "Tinted", "Solid", "Flat"], default: "Clean", title: "카드 스타일. Clean=중립 면과 구분선(추천), Tinted=볼트색 은은한 틴트(예전), Solid=틴트·보더 없음, Flat=구분선만(가장 가벼움)." },
            vaultColorScope: { label: "Vault color scope", type: "select", options: ["Accent", "Full"], default: "Accent", title: "볼트색 적용 범위. Accent=포인트(닷·배지·보더·바·태그)만 색, 제목은 읽기 좋은 중립색(추천). Full=제목·하이라이트까지 볼트색(진하고 모노톤)." },
            titleColor: { label: "Note title color (hex)", type: "text", default: "", title: "노트 제목 글자색(#RRGGBB). Accent 스코프=모든 제목에 적용(비우면 중립), Full 스코프=볼트색 우선." },
            accentColor: { label: "Accent override (hex, blank = theme)", type: "text", default: "", title: "포인트 색 전체 덮어쓰기(#RRGGBB). 비우면 테마 사용." },
            position: { label: "Sidebar position", type: "select", options: ["Bottom", "Top"], default: "Top", title: "결과 위젯을 구글 사이드바 위/아래 어디에 둘지." },
            vaultsParentDir: { label: "Common parent folder of your vaults", type: "text", default: "", title: "볼트들의 공통 상위 폴더. 설정하면 abs 경로 = 부모/볼트명/상대경로 로 자동 조립." },
            useLocalRest: { label: "Use Local REST API for body + tags", type: "checkbox", default: false, title: "각 볼트의 Local REST API(HTTP)로 노트를 직접 읽어 frontmatter 제거한 본문 + 실제 태그 표시. 슬롯에 포트/키 입력 + 플러그인 설치 필요." },
            useAdvancedUri: { label: "Use Advanced URI for opening", type: "checkbox", default: false, title: "Advanced URI 플러그인으로 열기. 백그라운드 볼트의 노트도 안정적으로 열림(권장)." },
            keyboardNav: { label: "Keyboard navigation (j/k/Enter/y)", type: "checkbox", default: true, title: "결과 위에서 j/k·↑↓ 이동, Enter 열기, y 위키링크 복사." },
            showControlsDefault: { label: "Open live controls by default", type: "checkbox", default: false, title: "검색 시 라이브 필터 패널을 기본으로 펼침." },
            requestTimeout: { label: "Per-port timeout (ms)", type: "int", default: 5000, title: "각 포트(볼트) 요청 대기 시간(ms). 초과 시 그 볼트는 건너뜀." },
        },
        events: {
            save: () => location.reload(),
            init: () => {},
            // GM_config's per-field `title` isn't reliably rendered as a hover tooltip,
            // so inject the Korean tooltips onto each field row when the panel opens.
            open: (doc) => {
                for (let i = 1; i <= 6; i++) {
                    const input = doc.getElementById("ObsidianOmnisearchGoogle_field_v" + i + "_lrKey");
                    if (input) { input.type = "password"; input.autocomplete = "off"; }
                }
                const slot = {
                    port: "이 볼트의 Omnisearch HTTP 포트. 비우면 슬롯 비활성.",
                    name: "결과 카드 배지에 표시할 볼트 이름 (예: Main, Wiki).",
                    vault: "deeplink에 쓸 Obsidian 등록 볼트명. 비우면 Omnisearch가 준 값 사용.",
                    color: "이 볼트의 배지/카드 색 (#RRGGBB). 비우면 이름 해시로 자동.",
                    root: "abs 경로 복사용 절대경로 루트. 보통은 General의 '공통 부모 폴더' 하나면 충분.",
                    lrPort: "이 볼트 Local REST API(HTTP) 포트. 본문+태그 정확 표시용. General의 'Use Local REST API' 켜야 동작.",
                    lrKey: "이 볼트 Local REST API 키(Bearer). 플러그인 설정에서 복사.",
                };
                const gen = {
                    nbResults: "필터·정렬 후 보여줄 결과 개수.",
                    excerptLines: "본문 미리보기 줄 수. 별도 더 보기 버튼으로 펼칩니다.",
                    showScore: "같은 볼트 최고점 대비 상대 점수. 의미 유사도나 확률이 아닙니다.",
                    showPath: "노트 경로를 브레드크럼으로 표시.",
                    showVaultBadge: "볼트 배지: auto(2개 이상일 때) / always / never.",
                    showTags: "카드 하단에 노트 태그 칩 표시(미리보기에서 best-effort 추출).",
                    maxTags: "카드당 표시할 태그 최대 개수.",
                    showMatchedTerms: "매칭 검색어 조각 표시. 조사 변형(rag를/rag**)이 섞여 지저분 — 보통 끔. 태그는 'Show tags'를 쓰세요.",
                    cleanFrontmatter: "미리보기에서 YAML(태그·작성자·날짜·wikilink 등) 제거하고 본문 위주로.",
                    exactMatch: "검색어를 따옴표로 묶어 정확 매칭.",
                    excludeFolders: "경로에 이 문자열이 포함된 결과 제외(콤마로 여러 개).",
                    theme: "기본 색 테마(헤더·단일볼트·fallback). CMDS/Obsidian/Mono/Ocean/Forest/Sunset/Rose/Grape/Slate. 라이트/다크 자동 전환.",
                    skin: "카드 스타일. Clean=중립 면과 구분선(추천), Tinted=볼트색 틴트(예전), Solid=틴트·보더 없음, Flat=구분선만.",
                    vaultColorScope: "볼트색 적용 범위. Accent=포인트만 색·제목은 중립(추천), Full=제목·하이라이트까지 볼트색(진함).",
                    titleColor: "노트 제목 글자색 (#RRGGBB).",
                    accentColor: "포인트 색 전체 덮어쓰기 (#RRGGBB). 비우면 테마 사용.",
                    position: "결과 위젯을 구글 사이드바 위/아래 어디에 둘지.",
                    vaultsParentDir: "볼트들의 공통 상위 폴더. 설정하면 abs 경로 = 부모/볼트명/상대경로 로 자동 조립.",
                    useLocalRest: "각 볼트 Local REST API(HTTP)로 노트를 직접 읽어 본문+실제 태그 표시. 슬롯에 포트/키 입력 + 플러그인 필요.",
                    useAdvancedUri: "Advanced URI 플러그인으로 열기. 백그라운드 볼트의 노트도 안정적으로 열림(권장).",
                    keyboardNav: "결과 위에서 j/k·↑↓ 이동, Enter 열기, y 위키링크 복사.",
                    showControlsDefault: "검색 시 라이브 필터 패널을 기본으로 펼침.",
                    requestTimeout: "각 포트(볼트) 요청 대기 시간(ms). 초과 시 그 볼트는 건너뜀.",
                };
                const setTip = (key, text) => {
                    const el = doc.getElementById("ObsidianOmnisearchGoogle_" + key + "_var");
                    if (el) { el.title = text; el.style.cursor = "help"; }
                };
                for (let i = 1; i <= 6; i++) for (const f in slot) setTip("v" + i + "_" + f, slot[f]);
                for (const k in gen) setTip(k, gen[k]);
            },
        },
    });

    const onInit = (config) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
            if (config.isInit) resolve();
            else if (Date.now() - start > 10000) reject(new Error("Omnisearch settings did not initialize. Check userscript permissions."));
            else setTimeout(tick, 30);
        };
        tick();
    });

    function loadSettings() {
        // Build vault configs from the split slot fields (no hardcoded paths — all user-supplied).
        S.vaults = [];
        S.vaultRoots = {};
        for (let i = 1; i <= 6; i++) {
            const port = String(gmc.get("v" + i + "_port") || "").trim();
            if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) continue;
            const label = String(gmc.get("v" + i + "_name") || "").trim();
            const dvault = String(gmc.get("v" + i + "_vault") || "").trim();
            const color = String(gmc.get("v" + i + "_color") || "").trim();
            const root = String(gmc.get("v" + i + "_root") || "").trim();
            const lrPort = String(gmc.get("v" + i + "_lrPort") || "").trim();
            const lrKey = String(gmc.get("v" + i + "_lrKey") || "").trim();
            S.vaults.push({ slot:String(i), port, label, color, dvault, root, lrPort, lrKey });
            if (root) {
                if (label) S.vaultRoots[label] = root;
                if (dvault) S.vaultRoots[dvault] = root;
            }
        }
        S.nbResults = clamp(parseInt(gmc.get("nbResults"), 10), 1, 100, 5);
        S.excerptLines = clamp(parseInt(gmc.get("excerptLines"), 10), 1, 12, 3);
        S.showScore = !!gmc.get("showScore");
        S.showPath = !!gmc.get("showPath");
        S.showVaultBadge = gmc.get("showVaultBadge");
        S.showTags = !!gmc.get("showTags");
        S.maxTags = clamp(parseInt(gmc.get("maxTags"), 10), 1, 20, 5);
        S.showMatchedTerms = !!gmc.get("showMatchedTerms");
        S.titleColor = gmc.get("titleColor");
        S.accentColor = gmc.get("accentColor");
        S.cleanFrontmatter = !!gmc.get("cleanFrontmatter");
        S.exactMatch = !!gmc.get("exactMatch");
        S.excludeFolders = String(gmc.get("excludeFolders") || "")
            .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        S.theme = gmc.get("theme");
        S.skin = gmc.get("skin");
        S.vaultColorScope = gmc.get("vaultColorScope");
        S.position = gmc.get("position");
        S.vaultsParentDir = String(gmc.get("vaultsParentDir") || "").trim();
        S.useLocalRest = !!gmc.get("useLocalRest");
        S.useAdvancedUri = !!gmc.get("useAdvancedUri");
        S.keyboardNav = !!gmc.get("keyboardNav");
        S.showControlsDefault = !!gmc.get("showControlsDefault");
        S.requestTimeout = clamp(parseInt(gmc.get("requestTimeout"), 10), 500, 30000, 5000);
    }

    function buildShell() {
        root = document.createElement("section");
        root.id = ID;
        root.className = `skin-${String(S.skin).toLowerCase()} vscope-${String(S.vaultColorScope).toLowerCase()}`;
        root.setAttribute("aria-label", "내 Obsidian 노트 검색");
        root.tabIndex = -1;
        root.innerHTML = `
            <header class="om-header"><div class="om-brand"><strong>내 노트에서</strong><span>Obsidian Omnisearch by CMDS</span></div>
                <button type="button" data-action="settings">설정</button>
                <button type="button" data-action="collapse" aria-expanded="${!state.collapsed}" aria-controls="om-body">${state.collapsed ? "펼치기" : "접기"}</button></header>
            <div class="om-body" id="om-body" ${state.collapsed ? "hidden" : ""}>
                <form class="om-search" role="search"><input class="om-refine" type="search" aria-label="Obsidian 검색어" placeholder="Google 검색어로 내 노트 찾기" autocomplete="off">
                    <button type="button" data-action="reset-query" title="Google 검색어로 돌아가기">초기화</button><button type="submit">검색</button></form>
                <div class="om-toolbar"><span class="om-status" role="status" aria-live="polite"></span>
                    <button type="button" data-action="filters" aria-expanded="${state.controlsOpen}" aria-controls="om-controls">필터</button>
                    <button type="button" data-action="refresh">새로고침</button></div>
                <div class="om-vaults" aria-label="볼트별 결과와 연결 상태"></div>
                <div class="om-controls" id="om-controls" ${state.controlsOpen ? "" : "hidden"}>
                    <label>정렬 <select class="om-sort"><option value="score">관련도</option><option value="name">제목순</option><option value="vault">볼트순</option></select></label>
                    <label>파일 <select class="om-type"><option value="all">전체</option><option value="md">Markdown</option><option value="pdf">PDF</option><option value="img">이미지</option></select></label>
                    <label title="각 볼트 최고점 대비 상대 점수. 의미 유사도나 확률이 아닙니다.">최소 상대 점수 <input class="om-minrel" type="range" min="0" max="100" step="1"><output class="om-minrel-val"></output></label>
                    <button type="button" data-action="reset-filters">필터 초기화</button>
                </div>
                <div class="om-open-help" role="status" hidden></div>
                <div class="om-help" id="om-help" hidden>제목이나 ‘Obsidian에서 열기’를 클릭하세요. 미리보기는 읽고 선택할 수 있습니다.
                    <p>Alt+Shift+O: 패널로 이동. 패널 안에서 j/k 또는 ↑↓: 결과 이동, y: 경로 위키링크 복사. Enter: 포커스된 링크·버튼 실행. /: 검색창. Esc: 선택 해제.</p>
                    <p>앱이 안 열리면 브라우저의 외부 앱 허용을 확인하고 ‘더보기’에서 기본/Advanced URI 링크를 시도하세요. Advanced URI는 대상 볼트에 플러그인이 필요합니다.</p>
                    <p>검색은 로컬 서버로 전송됩니다. 단, 표시한 노트 내용은 Google 페이지 DOM에 포함되므로 해당 페이지 스크립트와 확장 프로그램이 읽을 수 있습니다. 민감한 볼트는 슬롯을 비워 제외하세요.</p></div>
                <div class="om-list"></div><button type="button" class="om-more" data-action="more" hidden>결과 더 보기</button>
                <footer class="om-footer"><span>v${VERSION} / 로컬 볼트 검색</span><button type="button" data-action="help" aria-expanded="false" aria-controls="om-help">도움말</button></footer>
                <div class="om-toast" role="status" hidden></div>
            </div>`;
        syncControls();
        root.addEventListener("click", onClick);
        root.addEventListener("keydown", onKeydown);
        $(".om-search").addEventListener("submit", (e) => {
            e.preventDefault(); clearTimeout(refineTimer); state.refine = $(".om-refine").value; runSearch();
        });
        $(".om-refine").addEventListener("input", (e) => {
            clearTimeout(refineTimer);
            // Invalidate immediately, before debounce, so stale responses cannot repopulate the list.
            state.generation++; cancelRequests(); state.pending = 0; state.raw = []; state.view = []; state.statuses = []; state.selected = -1;
            $(".om-status").textContent = "검색어 입력 중…"; $(".om-vaults").replaceChildren(); $(".om-open-help").hidden = true;
            $(".om-list").textContent = "검색어 입력 중…"; $(".om-more").hidden = true;
            if (!e.isComposing) refineTimer = setTimeout(() => { state.refine = $(".om-refine").value; runSearch(); }, 300);
        });
        $(".om-refine").addEventListener("compositionend", () => {
            clearTimeout(refineTimer);
            refineTimer = setTimeout(() => { state.refine = $(".om-refine").value; runSearch(); }, 300);
        });
        for (const key of ["sort", "type", "minrel"]) $(".om-" + key).addEventListener(key === "minrel" ? "input" : "change", () => {
            state[key === "minrel" ? "minRel" : key] = key === "minrel" ? Number($(".om-minrel").value) : $(".om-" + key).value;
            setVal("om_" + (key === "minrel" ? "minRel" : key), state[key === "minrel" ? "minRel" : key]);
            state.limit = S.nbResults; syncControls(); renderResults();
        });
        document.addEventListener("keydown", (e) => {
            if (!S.keyboardNav || e.isComposing || e.defaultPrevented || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.code !== "KeyO" || isTyping(e.target)) return;
            if (!root.isConnected || !root.getClientRects().length) return;
            e.preventDefault(); state.collapsed = false; syncCollapse(); $(".om-refine").focus();
        });
    }
    function syncControls() {
        $(".om-sort").value = state.sort;
        $(".om-type").value = state.type;
        $(".om-minrel").value = state.minRel;
        $(".om-minrel-val").textContent = state.minRel + "%";
    }
    function syncCollapse() {
        $(".om-body").hidden = state.collapsed;
        const button = $('[data-action="collapse"]');
        button.setAttribute("aria-expanded", String(!state.collapsed));
        button.textContent = state.collapsed ? "펼치기" : "접기";
        setVal("om_collapsed", state.collapsed);
    }
    function itemFor(element) {
        const key = element.closest(".om-result")?.dataset.key;
        return state.view.find((item) => item._id === key);
    }
    function onClick(e) {
        $$("details[open]").forEach((menu) => { if (!menu.contains(e.target)) menu.removeAttribute("open"); });
        const button = e.target.closest("[data-action]");
        if (!button) return; // Native obsidian:// anchors keep their trusted default navigation.
        const item = itemFor(button);
        switch (button.dataset.action) {
            case "settings": gmc.open(); break;
            case "collapse": state.collapsed = !state.collapsed; syncCollapse(); break;
            case "filters":
                state.controlsOpen = !state.controlsOpen; $(".om-controls").hidden = !state.controlsOpen;
                button.setAttribute("aria-expanded", String(state.controlsOpen)); break;
            case "help": $(".om-help").hidden = !$(".om-help").hidden; button.setAttribute("aria-expanded", String(!$(".om-help").hidden)); break;
            case "refresh": clearTimeout(refineTimer); state.refine = $(".om-refine").value; runSearch(); break;
            case "reset-query": clearTimeout(refineTimer); state.refine = ""; $(".om-refine").value = ""; runSearch(); break;
            case "reset-filters":
                state.sort = "score"; state.type = "all"; state.minRel = 0; state.vault = ""; state.limit = S.nbResults;
                for (const key of ["sort", "type", "minRel"]) setVal("om_" + key, state[key]);
                syncControls(); renderResults(); break;
            case "vault": state.vault = button.dataset.vault; state.limit = S.nbResults; renderResults(); break;
            case "more": state.limit += S.nbResults; renderResults(); break;
            case "dismiss-open": $(".om-open-help").hidden = true; break;
            case "expand":
                if (!item) break;
                if (state.expanded.has(item._id)) state.expanded.delete(item._id); else state.expanded.add(item._id);
                button.closest(".om-result").querySelector(".om-excerpt").classList.toggle("expanded", state.expanded.has(item._id));
                button.setAttribute("aria-expanded", String(state.expanded.has(item._id)));
                button.textContent = state.expanded.has(item._id) ? "접기" : "미리보기 더 보기"; break;
            case "rest": if (item) openViaRest(item, button); break;
            case "open-help": if (item) showOpenHelp(item, "설정에서 실제 등록 볼트명을 입력하세요."); break;
            case "copy":
                if (!item) break;
                const values = { name: item.basename, rel: item.path, abs: absPath(item), uri: openUrl(item), wiki: `[[${item.path.replace(/\.md$/i, "")}]]` };
                const value = values[button.dataset.copy];
                if (value) copyText(value); else toast("볼트 이름 또는 절대경로 루트를 설정해주세요.");
                button.closest("details")?.removeAttribute("open"); break;
        }
    }
    function isTyping(target) { return !!target?.closest("input,textarea,select,[contenteditable]:not([contenteditable=false])"); }
    function onKeydown(e) {
        if (!S.keyboardNav || e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || state.collapsed) return;
        if (e.key === "/") { e.preventDefault(); $(".om-refine").focus(); return; }
        if (e.key === "Escape") { $$("details[open]").forEach((menu) => menu.removeAttribute("open")); state.selected = -1; $$(".om-result").forEach((el) => el.classList.remove("selected")); root.focus(); return; }
        if (!state.view.length) return;
        if (["j", "k", "ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            const current = itemFor(e.target);
            const index = current ? state.view.indexOf(current) : state.selected;
            state.selected = Math.max(0, Math.min(state.view.length - 1, index < 0 ? 0 : index + (["j", "ArrowDown"].includes(e.key) ? 1 : -1)));
            const cards = $$(".om-result"); cards.forEach((el, i) => el.classList.toggle("selected", i === state.selected));
            const card = cards[state.selected];
            card.querySelector(".om-title a, .om-title button").focus({ preventScroll:true });
            card.scrollIntoView({ block:"nearest", behavior:"auto" });
        } else if (e.key === "y") {
            const item = itemFor(e.target);
            if (item) { e.preventDefault(); copyText(`[[${item.path.replace(/\.md$/i, "")}]]`); }
        }
        // Enter/Space/Tab are native controls, not a second global opener.
    }
    function eligible(item) {
        return !S.excludeFolders.some((path) => item.path.toLowerCase().includes(path));
    }
    function applyPipeline() {
        let view = state.raw.filter(eligible).filter((item) => (!state.vault || item._slot === state.vault)
            && matchType(item.path, state.type) && item._rel >= state.minRel);
        if (state.sort === "name") view.sort((a,b) => a.basename.localeCompare(b.basename));
        else if (state.sort === "vault") view.sort((a,b) => (a._label || a.vault).localeCompare(b._label || b.vault) || b.score - a.score);
        else view.sort((a,b) => b.score - a.score || a.basename.localeCompare(b.basename));
        state.total = view.length; state.view = view.slice(0, state.limit); state.selected = -1;
    }
    const tagsHtml = (tags) => tags.slice(0, S.maxTags).map((tag) => `<span class="om-tag">${escapeHtml(tag)}</span>`).join("");
    function renderStatus() {
        const good = state.statuses.filter((s) => s.ok).length;
        const failures = state.statuses.filter((s) => !s.pending && !s.ok).length;
        $(".om-status").textContent = state.pending ? `검색 중 / ${good}개 볼트 응답` : `${state.view.length} / ${state.total}개 결과${failures ? ` / ${failures}개 볼트 연결 확인` : ""}`;
        $(".om-vaults").innerHTML = `<button type="button" data-action="vault" data-vault="" aria-pressed="${!state.vault}">전체</button>` + state.statuses.map((s) => {
            const count = state.raw.filter((it) => it._slot === s.slot && eligible(it)).length;
            const label = s.pending ? "검색 중" : s.ok ? String(count) : s.reason;
            return `<button type="button" data-action="vault" data-vault="${s.slot}" aria-pressed="${state.vault === s.slot}" title="${escapeHtml(s.reason || "포트 " + s.port)}">${escapeHtml(s.label)} <small>${escapeHtml(label)}</small></button>`;
        }).join("");
    }
    function renderResults() {
        const active = document.activeElement;
        const focusKey = active?.closest(".om-result")?.dataset.key;
        const focusAction = active?.dataset.action, focusCopy = active?.dataset.copy;
        const focusedVault = active?.dataset.action === "vault" ? active.dataset.vault : null;
        state.render++; applyPipeline(); renderStatus();
        $(".om-list").setAttribute("aria-busy", String(!!state.pending));
        if (!state.view.length) {
            const allFailed = !state.pending && state.statuses.length && state.statuses.every((s) => !s.ok);
            $(".om-list").innerHTML = `<div class="om-message">${!effectiveQuery() ? "Google에서 검색하거나 위에 검색어를 입력하세요." : !S.vaults.length ? "사용할 볼트가 없습니다. 설정에서 Omnisearch 포트를 입력하세요." : state.pending ? "열려 있는 볼트를 찾고 있습니다…" : allFailed ? 'Obsidian에서 볼트를 열고 Omnisearch HTTP 서버를 켜세요. 포트·브라우저 로컬 연결 권한도 확인하세요. <a href="obsidian://open">Obsidian 실행</a>' : '검색 결과가 없습니다. 검색어를 줄이거나 <button type="button" data-action="reset-filters">필터 초기화</button>를 시도하세요.'}</div>`;
        } else {
            const showBadge = S.showVaultBadge !== "never" && (S.showVaultBadge === "always" || S.vaults.length > 1);
            $(".om-list").innerHTML = state.view.map((item) => {
                const url = openUrl(item), expanded = state.expanded.has(item._id);
                const title = url ? `<a href="${escapeHtml(url)}" title="${escapeHtml(item.basename)}">${escapeHtml(item.basename)}</a>` : `<button type="button" data-action="open-help">${escapeHtml(item.basename)}</button>`;
                return `<article class="om-result" data-key="${escapeHtml(item._id)}" style="--vc:${vaultColor(item)}">
                    <div class="om-meta">${showBadge ? `<span class="om-badge">${escapeHtml(item._label || item.vault)}</span>` : ""}<span>${escapeHtml(extOf(item.path).toUpperCase())}</span>
                        ${S.showScore ? `<span class="om-score" title="같은 볼트 최고점 대비 상대 점수. 의미 유사도·확률이 아니며 볼트 간 점수는 직접 비교할 수 없습니다.">상대 ${item._rel}%</span>` : ""}</div>
                    <h3 class="om-title">${title}</h3>
                    <div class="om-excerpt ${expanded ? "expanded" : ""}">${cleanExcerpt(item.excerpt)}</div>
                    <div class="om-tags">${S.showTags ? tagsHtml(extractTags(item.excerpt)) : ""}</div>
                    ${S.showMatchedTerms && Array.isArray(item.foundWords) ? `<div class="om-terms">${item.foundWords.slice(0,8).map(escapeHtml).join(" / ")}</div>` : ""}
                    ${S.showPath ? `<div class="om-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path).replaceAll("/", " › ")}</div>` : ""}
                    <div class="om-actions">${url ? `<a class="om-open" href="${escapeHtml(url)}">Obsidian에서 열기</a>` : ""}
                        <button type="button" data-action="copy" data-copy="wiki">링크 복사</button>
                        <button type="button" data-action="expand" aria-expanded="${expanded}">${expanded ? "접기" : "미리보기 더 보기"}</button>
                        <details><summary>더보기</summary><div class="om-menu">
                            ${url ? `<a href="${escapeHtml(openUrl(item,false))}">기본 URI로 열기</a><a href="${escapeHtml(openUrl(item,true))}">Advanced URI</a>` : ""}
                            ${hasRest(item) ? '<button type="button" data-action="rest">REST 열기</button>' : ""}
                            <button type="button" data-action="copy" data-copy="uri">앱 링크 복사</button>
                            <button type="button" data-action="copy" data-copy="name">제목 복사</button>
                            <button type="button" data-action="copy" data-copy="rel">상대경로 복사</button>
                            <button type="button" data-action="copy" data-copy="abs">절대경로 복사</button>
                        </div></details>
                    </div></article>`;
            }).join("");
        }
        $(".om-more").hidden = state.view.length >= state.total;
        $(".om-more").textContent = `결과 더 보기 (${state.total - state.view.length}개 남음)`;
        if (focusKey) {
            const card = $$(".om-result").find((el) => el.dataset.key === focusKey);
            if (card) {
                const target = focusAction ? [...card.querySelectorAll("button")].find((el) => el.dataset.action === focusAction && el.dataset.copy === focusCopy) : card.querySelector(".om-title a, .om-title button");
                if (target) { target.closest("details")?.setAttribute("open", ""); target.focus({preventScroll:true}); }
            }
        } else if (focusedVault !== null) $$(".om-vaults button").find((b) => b.dataset.vault === focusedVault)?.focus({preventScroll:true});
        enrichResults();
    }
    async function runSearch() {
        const generation = ++state.generation;
        cancelRequests(); noteCache.clear(); state.expanded.clear();
        state.raw = []; state.limit = S.nbResults; state.pending = 0; state.statuses = [];
        $(".om-open-help").hidden = true;
        const query = effectiveQuery(); state.lastQuery = query;
        $(".om-refine").placeholder = new URL(location.href).searchParams.get("q") || "내 노트 검색어";
        if (!query) { renderResults(); return; }
        state.statuses = S.vaults.map((cfg) => ({ slot: cfg.slot, port: cfg.port, label: cfg.label || `Vault ${cfg.slot}`, pending:true }));
        state.pending = S.vaults.length; renderResults();
        await Promise.all(S.vaults.map(async (cfg, i) => {
            // Omnisearch may bind IPv6 ::1 only. localhost resolves it; 127.0.0.1 alone does not.
            let response = await request({ method:"GET", url:`http://localhost:${cfg.port}/search?q=${encodeURIComponent(query)}` });
            if (generation !== state.generation) return;
            if (!response.ok && response.status === undefined) {
                response = await request({ method:"GET", url:`http://127.0.0.1:${cfg.port}/search?q=${encodeURIComponent(query)}` });
                if (generation !== state.generation) return;
            }
            let rows;
            if (response.ok) { try { rows = JSON.parse(response.text); } catch { /* Invalid API response. */ } }
            const ok = response.ok && Array.isArray(rows);
            state.statuses[i] = { ...state.statuses[i], pending:false, ok,
                reason: ok ? "" : response.reason || (response.ok ? "응답 형식 오류" : `HTTP ${response.status}`) };
            if (ok) {
                const top = rows.reduce((max, r) => Number.isFinite(Number(r?.score)) ? Math.max(max, Number(r.score)) : max, 1);
                const seen = new Set(state.raw.map((r) => r._id));
                for (const r of rows) {
                    if (!r || !validPath(r.path)) continue;
                    const vault = cfg.dvault || String(r.vault || "");
                    const id = JSON.stringify([vault || "port:" + cfg.port, r.path]);
                    if (seen.has(id)) continue;
                    seen.add(id);
                    state.raw.push({ path:r.path, basename:String(r.basename || r.path.split("/").pop().replace(/\.md$/i,"")),
                        vault:String(r.vault || ""), excerpt:String(r.excerpt || ""), foundWords:r.foundWords,
                        score:Number.isFinite(Number(r.score)) ? Number(r.score) : 0,
                        _id:id, _slot:cfg.slot, _label:cfg.label, _dvault:cfg.dvault, _color:cfg.color,
                        _root:cfg.root, _restPort:cfg.lrPort, _restKey:cfg.lrKey,
                        _rel:Math.round(clamp((Number(r.score) || 0) / top * 100,0,100,0)) });
                }
            }
            state.pending--; renderResults();
        }));
    }
    let standaloneSidebar;
    function mount() {
        const main = document.querySelector("#center_col") || document.querySelector("#search");
        const mainRect = main?.getBoundingClientRect();
        const rhs = document.querySelector("#rhs");
        const rhsRect = rhs?.getBoundingClientRect();
        const visible = (el) => el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
        // Never mount in #center_col, #search or #rcnt: those are Google's result flow.
        const sidebar = visible(rhs) && rhsRect.width >= 280 && mainRect?.width > 0
            && rhsRect.left >= mainRect.right + 12 && rhsRect.right <= innerWidth - 8 ? rhs : null;
        if (sidebar) {
            if (standaloneSidebar) standaloneSidebar.hidden = true;
            root.hidden = false;
            if (root.parentNode !== sidebar) {
                if (S.position === "Top") sidebar.prepend(root); else sidebar.append(root);
            }
            return;
        }
        // An absent/stacked sidebar is not permission to take over the main column.
        // Use only the right-hand free space, without changing any Google element's styles.
        if (!standaloneSidebar) {
            standaloneSidebar = document.createElement("aside");
            standaloneSidebar.id = "om-cmds-sidebar";
            standaloneSidebar.setAttribute("aria-label", "Obsidian 검색 사이드바");
            standaloneSidebar.style.cssText = "position:absolute;box-sizing:border-box;z-index:1;";
            standaloneSidebar.hidden = true;
            document.body.append(standaloneSidebar);
        }
        if (root.parentNode !== standaloneSidebar) standaloneSidebar.append(root);
        root.hidden = false;
        if (!visible(main) || !mainRect || mainRect.width < 280) { standaloneSidebar.hidden = true; return; }
        const left = mainRect.right + 24;
        const width = Math.min(400, innerWidth - left - 24);
        if (width < 300) { standaloneSidebar.hidden = true; return; } // No main-column fallback.
        let top = Math.max(0, mainRect.top + scrollY);
        const content = document.querySelector("#rcnt") || main;
        // AI Overview source cards can occupy the otherwise empty right rail without #rhs.
        // Start below them (and any other visible Google content in this horizontal strip).
        for (const el of content.querySelectorAll("a,button,img,video,canvas,iframe,input,select,textarea,[role=button],h1,h2,h3,p")) {
            if (root.contains(el) || !visible(el)) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.left < left + width && rect.right > left
                && rect.bottom + scrollY > top) top = rect.bottom + scrollY + 24;
        }
        standaloneSidebar.style.width = width + "px";
        standaloneSidebar.hidden = false;
        // Account for a positioned body/ancestor, but not the ordinary static body's margin.
        const parent = standaloneSidebar.offsetParent;
        const positioned = parent && getComputedStyle(parent).position !== "static";
        const origin = positioned ? parent.getBoundingClientRect() : {left:0,top:0};
        standaloneSidebar.style.left = (left + scrollX - (positioned ? origin.left + scrollX + parent.clientLeft : 0)) + "px";
        standaloneSidebar.style.top = (top - (positioned ? origin.top + scrollY + parent.clientTop : 0)) + "px";
    }
    function watchPage() {
        let previous = new URL(location.href).searchParams.get("q") || "";
        let scheduled = false;
        const refresh = () => {
            scheduled = false;
            const query = new URL(location.href).searchParams.get("q") || "";
            mount();
            if (query !== previous) {
                previous = query; clearTimeout(refineTimer); state.refine = ""; $(".om-refine").value = ""; runSearch();
            }
        };
        const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(refresh); } };
        new MutationObserver((mutations) => {
            if (mutations.some((m) => m.target !== root && !root.contains(m.target))) schedule();
        }).observe(document.body, { childList:true, subtree:true });
        window.addEventListener("popstate", schedule);
        window.addEventListener("resize", schedule);
        // Google can change history without a DOM mutation. Do not monkeypatch the page's history API.
        setInterval(() => { if (!document.hidden) refresh(); }, 1000);
    }
    async function boot() {
        await onInit(gmc); loadSettings();
        state.collapsed = !!(await getVal("om_collapsed", false));
        const sort = await getVal("om_sort", "score"), type = await getVal("om_type", "all");
        state.sort = ["score","name","vault"].includes(sort) ? sort : "score";
        state.type = ["all","md","pdf","img"].includes(type) ? type : "all";
        state.minRel = clamp(await getVal("om_minRel", 0),0,100,0);
        state.controlsOpen = S.showControlsDefault;
        injectStyles(); buildShell(); applyTheme(); mount(); watchPage(); runSearch();
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
        if (typeof GM_registerMenuCommand === "function") GM_registerMenuCommand("Omnisearch CMDS 설정", () => gmc.open());
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot().catch(console.error), {once:true});
    else boot().catch(console.error);
})();
