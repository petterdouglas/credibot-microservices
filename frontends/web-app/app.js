// CrediBot — Web App (cliente)
// API base: via gateway → /web/*
const API = "/web";

let token = null;

// ===================== Helpers =====================

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideError(el) {
  el.classList.add("hidden");
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// ===================== Navigation =====================

function showPage(name) {
  $$(".content").forEach((el) => el.classList.remove("active"));
  $(`#page-${name}`).classList.add("active");

  $$(".nav-links a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === name);
  });
}

$$(".nav-links a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(a.dataset.page);
    if (a.dataset.page === "dashboard") loadDashboard();
  });
});

// ===================== Login =====================

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("#login-error");
  hideError(errorEl);

  const customerId = $("#customerId").value.trim();
  if (!customerId) return;

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { customerId },
    });
    token = data.token;
    // Show dashboard
    $("#login-section").classList.remove("active");
    $("#login-section").classList.add("hidden");
    $("#dashboard-section").classList.remove("hidden");
    $("#dashboard-section").classList.add("active");
    loadDashboard();
  } catch (err) {
    showError(errorEl, err.message);
  }
});

// ===================== Logout =====================

$("#btn-logout").addEventListener("click", () => {
  token = null;
  $("#dashboard-section").classList.remove("active");
  $("#dashboard-section").classList.add("hidden");
  $("#login-section").classList.remove("hidden");
  $("#login-section").classList.add("active");
  $("#customerId").value = "";
  // Clear chat
  $("#chat-messages").innerHTML = "";
});

// ===================== Dashboard =====================

async function loadDashboard() {
  try {
    const data = await api("/dashboard");
    $("#dash-name").textContent = data.customerName;
    $("#dash-balance").textContent = formatBRL(data.walletBalance);

    if (data.activeLoan) {
      $("#dash-loan-status").textContent = data.activeLoan.status;
      $("#dash-loan-amount").textContent = formatBRL(data.activeLoan.amount);
      $("#dash-loan-rate").textContent = data.activeLoan.rate;
    } else {
      $("#dash-loan-status").textContent = "Nenhum";
      $("#dash-loan-amount").textContent = "—";
      $("#dash-loan-rate").textContent = "—";
    }
  } catch (err) {
    $("#dash-name").textContent = "Erro ao carregar";
    console.error(err);
  }
}

$("#btn-refresh-dash").addEventListener("click", loadDashboard);

// ===================== Novo Empréstimo =====================

$("#loan-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("#loan-error");
  const resultEl = $("#loan-result");
  hideError(errorEl);
  resultEl.classList.add("hidden");

  const amount = parseFloat($("#loan-amount").value);
  const installments = parseInt($("#loan-installments").value, 10);

  try {
    const data = await api("/loans", {
      method: "POST",
      body: { amount, installments },
    });
    $("#loan-res-id").textContent = data.loanId;
    $("#loan-res-status").textContent = data.status;
    $("#loan-res-msg").textContent = data.message;
    resultEl.classList.remove("hidden");
    $("#loan-form").reset();
  } catch (err) {
    showError(errorEl, err.message);
  }
});

// ===================== Chat IA =====================

function addChatBubble(text, type) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  $("#chat-messages").appendChild(bubble);
  $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
}

$("#chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const message = input.value.trim();
  if (!message) return;

  addChatBubble(message, "user");
  input.value = "";

  try {
    const data = await api("/chat", {
      method: "POST",
      body: { message },
    });
    addChatBubble(data.reply, "bot");
  } catch (err) {
    addChatBubble(`Erro: ${err.message}`, "bot");
  }
});
