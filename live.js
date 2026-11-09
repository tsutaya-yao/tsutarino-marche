// ツタリノマルシェ：当日に役立つ仕組み（両ページ共通）
// vendors-data.js の後に読み込む。
//   - いまの時刻から「いま出店中」「次のステージ」を判定
//   - お知らせ（NOTICE）の帯
//   - お気に入り（この端末のブラウザに保存）
//   - ホーム画面に追加（PWA）用の Service Worker 登録
// 動作確認用：URL に ?now=2026-11-21T11:10 を付けると、その時刻として表示できる。

const Live = (() => {
  const toDate = s => new Date(s + ":00+09:00");
  const jstDay = t => new Date(+t + 9 * 3600e3).toISOString().slice(0, 10);

  function now() {
    const p = new URLSearchParams(location.search).get("now");
    return p ? toDate(p.length === 16 ? p : p.slice(0, 16)) : new Date();
  }

  // いま営業中の部（0=21日1部, 1=21日2部, 2=22日）。営業時間外は -1
  function currentPart(t = now()) {
    return PART_TIMES.findIndex(p => t >= toDate(p.start) && t < toDate(p.end));
  }

  // 開催日全体の状態
  function status(t = now()) {
    const part = currentPart(t);
    if (part >= 0) return { state: "open", part };
    const first = toDate(PART_TIMES[0].start), last = toDate(PART_TIMES[PART_TIMES.length - 1].end);
    if (t < first) {
      // 当日の朝（開場前）
      return t > new Date(first - 12 * 3600e3) ? { state: "before-today" } : { state: "before" };
    }
    if (t >= last) return { state: "after" };
    // 21日の入れ替え中 / 22日の開場前 / 21日の夜
    const nextIdx = PART_TIMES.findIndex(p => t < toDate(p.start));
    const next = PART_TIMES[nextIdx];
    const sameDay = next && next.start.slice(0, 10) === jstDay(t);
    return { state: "between", next: nextIdx, sameDay };
  }

  // 次のステージ（開催中のものと、このあと始まるもの）
  function stages(t = now(), limit = 3) {
    const today = jstDay(t);
    const list = SCHEDULE.map(s => {
      const st = toDate(s.start), en = s.end ? toDate(s.end) : new Date(+st + 30 * 60e3);
      return { ...s, st, en, live: t >= st && t < en, mins: Math.round((st - t) / 60e3) };
    })
      .filter(s => s.en > t && s.start.slice(0, 10) === today)
      .sort((a, b) => a.st - b.st);
    return list.slice(0, limit);
  }

  // ---- お気に入り（端末ごとの保存。保存できない環境でも動くように） ----
  const KEY = "tsutarino-favs";
  let favs = new Set();
  try { favs = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify([...favs])); } catch (e) {} }
  const fav = {
    has: id => favs.has(id),
    toggle: id => { favs.has(id) ? favs.delete(id) : favs.add(id); save(); return favs.has(id); },
    size: () => favs.size,
  };

  // ---- お知らせの帯 ----
  function renderNotice() {
    if (typeof NOTICE === "undefined" || !NOTICE.text) return;
    const el = document.createElement("div");
    el.className = "notice-bar " + (NOTICE.type === "alert" ? "alert" : "info");
    el.setAttribute("role", "status");
    el.textContent = (NOTICE.type === "alert" ? "⚠ " : "📢 ") + NOTICE.text;
    const head = document.querySelector(".site-head");
    head.parentNode.insertBefore(el, head);
  }

  const hhmm = d => d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

  return { now, currentPart, status, stages, fav, renderNotice, hhmm, toDate };
})();

Live.renderNotice();

// ホーム画面に追加（PWA）。https か localhost のときだけ
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
