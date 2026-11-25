(() => {
  const PHONE = "77760605070";
  const PRODUCT = 'Зимние защитные ботинки "COREX" KAZ 003';
  const PRICE = 14500;
  const PRICE_OPT = 12000;

  const sizesEl = document.querySelector("[data-sizes]");
  const sizesModalEl = document.querySelector("[data-sizes-modal]");
  const sizeBlock = document.querySelector("[data-size-block]");
  const sizeHint = document.querySelector("[data-size-hint]");
  const cartLinesEl = document.querySelector("[data-cart-lines]");
  const cartLinesModalEl = document.querySelector("[data-cart-lines-modal]");
  const orderSummaryEl = document.querySelector("[data-order-summary]");
  const buybarMeta = document.querySelector("[data-buybar-meta]");
  const buybarTotal = document.querySelector("[data-buybar-total]");
  const orderModal = document.querySelector('[data-modal="order"]');
  const sizesModal = document.querySelector('[data-modal="sizes"]');
  const pickSizeModal = document.querySelector('[data-modal="pick-size"]');
  const confirmSizeBtn = document.querySelector("[data-confirm-size]");
  const toast = document.querySelector("[data-toast]");

  /** @type {Map<number, number>} size -> qty */
  const cart = new Map();
  let pendingAction = null; // "order" | "whatsapp"

  function money(n) {
    return `${n.toLocaleString("ru-RU")} ₸`;
  }

  function pairsWord(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "пара";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "пары";
    return "пар";
  }

  function totalPairs() {
    let sum = 0;
    cart.forEach((qty) => {
      sum += qty;
    });
    return sum;
  }

  function unitPrice() {
    return totalPairs() >= 20 ? PRICE_OPT : PRICE;
  }

  function totalSum() {
    return totalPairs() * unitPrice();
  }

  function cartEntries() {
    return [...cart.entries()].sort((a, b) => a[0] - b[0]);
  }

  function hasSizes() {
    return cart.size > 0;
  }

  function syncSizeButtons() {
    document.querySelectorAll(".size-btn").forEach((b) => {
      const size = Number(b.dataset.size);
      const active = cart.has(size);
      b.classList.toggle("is-selected", active);
      b.setAttribute("aria-selected", String(active));
      const badge = b.querySelector(".size-badge");
      if (active) {
        const qty = cart.get(size);
        if (!badge) {
          const span = document.createElement("span");
          span.className = "size-badge";
          span.textContent = String(qty);
          b.appendChild(span);
        } else {
          badge.textContent = String(qty);
        }
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function renderCartLines(target) {
    if (!target) return;
    const entries = cartEntries();
    target.hidden = entries.length === 0;
    target.innerHTML = "";

    entries.forEach(([size, qty]) => {
      const row = document.createElement("div");
      row.className = "cart-line";
      row.innerHTML = `
        <div class="cart-line-size">
          Размер ${size}
          <span>${money(unitPrice())} / пара</span>
        </div>
        <div class="cart-line-stepper">
          <button type="button" data-minus aria-label="Меньше">−</button>
          <strong>${qty}</strong>
          <button type="button" data-plus aria-label="Больше">+</button>
        </div>
        <button type="button" class="cart-line-remove" data-remove aria-label="Убрать размер">×</button>
      `;
      row.querySelector("[data-minus]").addEventListener("click", () => setQty(size, qty - 1));
      row.querySelector("[data-plus]").addEventListener("click", () => setQty(size, qty + 1));
      row.querySelector("[data-remove]").addEventListener("click", () => removeSize(size));
      target.appendChild(row);
    });
  }

  function renderOrderSummary() {
    const entries = cartEntries();
    const pairs = totalPairs();
    const unit = unitPrice();
    orderSummaryEl.innerHTML = entries
      .map(
        ([size, qty]) =>
          `<div class="order-summary-row"><span>Размер ${size} × ${qty}</span><span>${money(qty * unit)}</span></div>`
      )
      .join("");
    orderSummaryEl.innerHTML += `<div class="order-summary-row order-summary-total"><span>${pairs} ${pairsWord(pairs)}${pairs >= 20 ? " · опт" : ""}</span><span>${money(totalSum())}</span></div>`;
  }

  function updateBuybar() {
    const pairs = totalPairs();
    if (!pairs) {
      buybarMeta.textContent = "Итого";
      buybarTotal.textContent = money(PRICE);
      return;
    }
    const sizesWord =
      cart.size === 1 ? "размер" : cart.size < 5 ? "размера" : "размеров";
    buybarMeta.textContent =
      cart.size > 1
        ? `${pairs} ${pairsWord(pairs)} · ${cart.size} ${sizesWord}`
        : `${pairs} ${pairsWord(pairs)}`;
    buybarTotal.textContent = money(totalSum());
  }

  function refreshUI() {
    syncSizeButtons();
    renderCartLines(cartLinesEl);
    renderCartLines(cartLinesModalEl);
    updateBuybar();
    confirmSizeBtn.disabled = !hasSizes();

    if (hasSizes()) {
      sizeBlock.classList.remove("is-error");
      const parts = cartEntries().map(([s, q]) => `${s}×${q}`);
      sizeHint.textContent = `В заказе: ${parts.join(", ")}`;
      sizeHint.style.color = "";
    } else {
      sizeHint.textContent = "Можно выбрать несколько — например 42 и 43";
    }
  }

  function setQty(size, qty) {
    const next = Math.max(0, Math.min(999, qty));
    if (next <= 0) cart.delete(size);
    else cart.set(size, next);
    refreshUI();
  }

  function removeSize(size) {
    cart.delete(size);
    refreshUI();
  }

  function toggleSize(size) {
    if (cart.has(size)) removeSize(size);
    else {
      cart.set(size, 1);
      refreshUI();
      showToast(`Размер ${size} добавлен`);
    }
  }

  function createSizeButton(s, target) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size-btn";
    btn.textContent = String(s);
    btn.dataset.size = String(s);
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", "false");
    btn.addEventListener("click", () => toggleSize(s));
    target.appendChild(btn);
  }

  for (let s = 38; s <= 47; s += 1) {
    createSizeButton(s, sizesEl);
    createSizeButton(s, sizesModalEl);
  }

  function requireSize(action) {
    if (hasSizes()) return true;
    pendingAction = action;
    sizeBlock.classList.remove("is-error");
    void sizeBlock.offsetWidth;
    sizeBlock.classList.add("is-error");
    sizeHint.textContent = "Выберите хотя бы один размер";
    showToast("Выберите размер, чтобы продолжить");
    pickSizeModal.showModal();
    return false;
  }

  function continueAfterSize() {
    const action = pendingAction;
    pendingAction = null;
    pickSizeModal.close();
    if (action === "order") {
      renderOrderSummary();
      orderModal.showModal();
    } else if (action === "whatsapp") {
      openWhatsApp(buildMessage());
    }
  }

  confirmSizeBtn.addEventListener("click", () => {
    if (!hasSizes()) {
      showToast("Сначала выберите размер");
      return;
    }
    continueAfterSize();
  });

  /* ---------- gallery ---------- */
  const viewport = document.querySelector("[data-viewport]");
  const track = document.querySelector("[data-track]");
  const slides = [...track.querySelectorAll(".gallery-slide")];
  const dotsWrap = document.querySelector("[data-dots]");
  const thumbsWrap = document.querySelector("[data-thumbs]");
  let index = 0;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let dragging = false;
  let lockAxis = null;
  let moved = false;

  slides.forEach((slide, i) => {
    const img = slide.querySelector("img");

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Фото ${i + 1}`);
    if (i === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);

    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "gallery-thumb" + (i === 0 ? " is-active" : "");
    thumb.setAttribute("aria-label", `Открыть фото ${i + 1}`);
    thumb.innerHTML = `<img src="${img.src}" alt="" draggable="false" />`;
    thumb.addEventListener("click", () => goTo(i));
    thumbsWrap.appendChild(thumb);
  });

  const dots = [...dotsWrap.querySelectorAll("button")];
  const thumbs = [...thumbsWrap.querySelectorAll("button")];

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
    track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
    slides.forEach((s, n) => s.classList.toggle("is-active", n === index));
    dots.forEach((d, n) => d.classList.toggle("is-active", n === index));
    thumbs.forEach((t, n) => t.classList.toggle("is-active", n === index));
  }

  document.querySelector("[data-prev]").addEventListener("click", (e) => {
    e.stopPropagation();
    goTo(index - 1);
  });
  document.querySelector("[data-next]").addEventListener("click", (e) => {
    e.stopPropagation();
    goTo(index + 1);
  });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragging = true;
    moved = false;
    lockAxis = null;
    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!lockAxis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      lockAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (lockAxis === "y") return;

    moved = true;
    deltaX = dx;
    e.preventDefault();
    track.style.transition = "none";
    track.style.transform = `translate3d(calc(-${index * 100}% + ${deltaX}px), 0, 0)`;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;

    if (!moved && lockAxis !== "x") {
      const rect = viewport.getBoundingClientRect();
      const x = (e?.clientX ?? startX) - rect.left;
      goTo(x < rect.width / 2 ? index - 1 : index + 1);
      return;
    }

    if (Math.abs(deltaX) > 40) {
      goTo(index + (deltaX < 0 ? 1 : -1));
    } else {
      goTo(index);
    }
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", () => {
    dragging = false;
    goTo(index);
  });

  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goTo(index - 1);
    if (e.key === "ArrowRight") goTo(index + 1);
  });
  viewport.setAttribute("tabindex", "0");
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", "Галерея товара");

  /* ---------- tabs ---------- */
  const tabButtons = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      tabButtons.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
      panels.forEach((p) => {
        const active = p.dataset.panel === id;
        p.toggleAttribute("hidden", !active);
        p.classList.toggle("is-active", active);
      });
    });
  });

  /* ---------- modals ---------- */
  document.querySelector("[data-open-order]").addEventListener("click", () => {
    if (!requireSize("order")) {
      sizeBlock.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    renderOrderSummary();
    orderModal.showModal();
  });

  document.querySelector("[data-open-sizes]").addEventListener("click", () => {
    sizesModal.showModal();
  });

  const invoiceModal = document.querySelector('[data-modal="invoice"]');
  document.querySelector("[data-open-invoice]").addEventListener("click", () => {
    invoiceModal.showModal();
  });

  document.querySelector("[data-submit-invoice]").addEventListener("click", () => {
    const form = document.querySelector("[data-invoice-form]");
    if (!form.reportValidity()) return;

    const company = form.company.value.trim();
    const bin = form.bin.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    const comment = form.comment.value.trim();
    const sizeLines = cartEntries().map(([s, q]) => `  · ${s}: ${q} пар`);
    const lines = [
      "Здравствуйте! Нужен счёт для юридического лица.",
      "ИП Kazsafety",
      `Организация: ${company}`,
      `БИН/ИИН: ${bin}`,
      `Телефон: ${phone}`,
      `Адрес доставки: ${address}`,
      `Товар: ${PRODUCT}`,
      sizeLines.length ? `Размеры:\n${sizeLines.join("\n")}` : null,
      sizeLines.length ? `Всего: ${totalPairs()} ${pairsWord(totalPairs())}` : null,
      comment ? `Комментарий: ${comment}` : null,
    ].filter(Boolean);

    openWhatsApp(lines.join("\n"));
    invoiceModal.close();
    showToast("Открываем WhatsApp…");
  });

  function buildMessage({ name = "", phone = "", comment = "" } = {}) {
    const pairs = totalPairs();
    const unit = unitPrice();
    const sizeLines = cartEntries().map(([s, q]) => `  · размер ${s} — ${q} пар`);
    const lines = [
      `Здравствуйте! Хочу заказать: ${PRODUCT}`,
      "Размеры:",
      ...sizeLines,
      `Всего: ${pairs} ${pairsWord(pairs)}`,
      `Цена: ${money(unit)}/пара${pairs >= 20 ? " (опт)" : ""}`,
      `Сумма: ${money(totalSum())}`,
    ];
    if (name) lines.push(`Имя: ${name}`);
    if (phone) lines.push(`Телефон: ${phone}`);
    if (comment) lines.push(`Комментарий: ${comment}`);
    return lines.join("\n");
  }

  function openWhatsApp(text) {
    const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  }

  document.querySelector("[data-ask-manager]").addEventListener("click", () => {
    const lines = [
      `Здравствуйте! Есть вопрос по товару: ${PRODUCT}`,
      "Подскажите, пожалуйста,",
    ];
    if (hasSizes()) {
      lines.push(`Интересуют размеры: ${cartEntries().map(([s, q]) => `${s}×${q}`).join(", ")}`);
    }
    openWhatsApp(lines.join("\n"));
  });

  document.querySelectorAll("[data-ask-related]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openWhatsApp(
        `Здравствуйте! Интересует товар: ${btn.dataset.related}\nПодскажите цену, размеры и наличие.`
      );
    });
  });

  /* ---------- phone mask +7 (___) ___-__-__ ---------- */
  function formatPhone(raw) {
    let digits = String(raw).replace(/\D/g, "");
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (!digits.startsWith("7")) digits = `7${digits}`;
    digits = digits.slice(0, 11);

    const p = digits.slice(1);
    let out = "+7";
    if (p.length > 0) out += ` (${p.slice(0, 3)}`;
    if (p.length >= 3) out += ")";
    if (p.length > 3) out += ` ${p.slice(3, 6)}`;
    if (p.length > 6) out += `-${p.slice(6, 8)}`;
    if (p.length > 8) out += `-${p.slice(8, 10)}`;
    return out;
  }

  document.querySelectorAll("[data-phone-mask]").forEach((input) => {
    input.addEventListener("focus", () => {
      if (!input.value.trim()) input.value = "+7 (";
    });
    input.addEventListener("input", () => {
      input.value = formatPhone(input.value);
    });
    input.addEventListener("blur", () => {
      if (input.value.replace(/\D/g, "").length <= 1) input.value = "";
    });
  });

  document.querySelector("[data-submit-order]").addEventListener("click", () => {
    const form = document.querySelector("[data-order-form]");
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const comment = form.comment.value.trim();

    if (!hasSizes()) {
      orderModal.close();
      requireSize("order");
      return;
    }
    if (!form.reportValidity()) return;

    openWhatsApp(buildMessage({ name, phone, comment }));
    orderModal.close();
    showToast("Открываем WhatsApp…");
  });

  /* ---------- toast ---------- */
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-show");
      setTimeout(() => {
        toast.hidden = true;
      }, 250);
    }, 2400);
  }

  /* size badge style injected once */
  const style = document.createElement("style");
  style.textContent = `
    .size-btn { position: relative; }
    .size-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--green);
      color: #04150c;
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
    }
  `;
  document.head.appendChild(style);

  refreshUI();
})();
