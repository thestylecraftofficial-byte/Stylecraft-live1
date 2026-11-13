// Shows a "Thank you" popup with an animated tick when a sign-up has been saved (the form flips to its "done" state).
(function () {
  var css = ".sc-back{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(23,16,12,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:scFade .3s ease both}" +
    ".sc-pop{width:100%;max-width:380px;text-align:center;padding:36px 28px 30px;border-radius:22px;background:#F4EBDD;color:#17100C;box-shadow:0 30px 80px rgba(0,0,0,.45);animation:scPop .5s cubic-bezier(.2,.9,.3,1.2) both}" +
    ".sc-tick{width:88px;height:88px;display:block;margin:0 auto 16px}" +
    ".sc-tick circle{fill:none;stroke:#D4A072;stroke-width:3;stroke-dasharray:252;stroke-dashoffset:252;transform:rotate(-90deg);transform-origin:center;animation:scDraw .7s .1s ease-out forwards}" +
    ".sc-tick .fill{fill:#D4A072;stroke:none;stroke-dasharray:none;stroke-dashoffset:0;transform:none;opacity:0;animation:scFill .3s .65s ease-out forwards}" +
    ".sc-tick path{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:50;stroke-dashoffset:50;animation:scDraw .45s .8s ease-out forwards}" +
    ".sc-pop h2{margin:0 0 8px;font:500 32px/1.1 Newsreader,Georgia,serif}" +
    ".sc-pop p{margin:0 0 22px;font:400 16px/1.55 Inter,system-ui,sans-serif;color:#4a3a2e}" +
    ".sc-pop button{min-height:46px;padding:0 34px;border:0;border-radius:999px;background:#17100C;color:#F4EBDD;font:500 15px Inter,system-ui,sans-serif;cursor:pointer}" +
    "@keyframes scFade{from{opacity:0}}@keyframes scPop{from{opacity:0;transform:scale(.8) translateY(12px)}}@keyframes scDraw{to{stroke-dashoffset:0}}@keyframes scFill{to{opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.sc-back,.sc-pop,.sc-tick circle,.sc-tick .fill,.sc-tick path{animation:none!important}.sc-tick circle,.sc-tick path{stroke-dashoffset:0}.sc-tick .fill{opacity:1}}";
  var shown = false;
  function show(name) {
    if (shown) return; shown = true;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement("div"); b.className = "sc-back"; b.setAttribute("role", "dialog"); b.setAttribute("aria-modal", "true"); b.setAttribute("aria-labelledby", "sc-th");
    b.innerHTML = '<div class="sc-pop"><svg class="sc-tick" viewBox="0 0 88 88" aria-hidden="true"><circle class="fill" cx="44" cy="44" r="40"/><circle cx="44" cy="44" r="40"/><path d="M26 45 l13 13 l24 -28"/></svg><h2 id="sc-th"></h2><p>You are on the StyleCraft list. A thank-you note is on its way to your email, and we will message you when we open.</p><button type="button">Done</button></div>';
    b.querySelector("h2").textContent = name ? "Thank you, " + name + "!" : "Thank you!";
    function close() { b.remove(); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); }
    b.querySelector("button").addEventListener("click", close);
    b.addEventListener("click", function (e) { if (e.target === b) close(); });
    document.addEventListener("keydown", key);
    document.body.appendChild(b); b.querySelector("button").focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-wrap]"), function (w) {
    new MutationObserver(function () {
      if (w.classList.contains("done")) { var t = w.querySelector(".s-title"); var m = /^Thank you, (.*)\.$/.exec(t ? t.textContent : ""); show(m ? m[1] : ""); }
    }).observe(w, { attributes: true, attributeFilter: ["class"] });
  });
})();
