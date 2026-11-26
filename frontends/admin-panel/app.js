// CrediBot — Admin Panel
// API base: via gateway → /admin/*
const API = "/admin";

let token = null;
let officerId = null;

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
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function statusBadge(status) {
  const s = (status || "").toUpperCase();
  let cls = "badge-default";
  if (s.includes("PENDING") || s.includes("PROCESSANDO")) cls = "badge-pending";
  else if (s.includes("APPROVED") || s.includes("APROVADO")) cls = "badge-approved";
  else if (s.includes("REJECTED") || s.includes("REJEITADO") || s.includes("CANCELED")) cls = "badge-rejected";
  return `<span class="badge ${cls}">${status}</span>`;
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
  });
});

// ===================== Login =====================

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("#login-error");
  hideError(errorEl);

  const id = $("#officerId").value.trim();
  const pw = $("#password").value;

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { officerId: id, password: pw },
    });
    token = data.token;
    officerId = data.officerId;
    $("#officer-name").textContent = `👤 ${officerId}`;

    $("#login-section").classList.remove("active");
    $("#login-section").classList.add("hidden");
    $("#panel-section").classList.remove("hidden");
    $("#panel-section").classList.add("active");
  } catch (err) {
    showError(errorEl, err.message);
  }
});

// ===================== Logout =====================

$("#btn-logout").addEventListener("click", () => {
  token = null;
  officerId = null;
  $("#panel-section").classList.remove("active");
  $("#panel-section").classList.add("hidden");
  $("#login-section").classList.remove("hidden");
  $("#login-section").classList.add("active");
  $("#officerId").value = "";
  $("#password").value = "";
  // Clear results
  $("#audit-result").classList.add("hidden");
  $("#review-result").classList.add("hidden");
});

// ===================== Audit (GET /loans/:id) =====================

$("#audit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("#audit-error");
  const resultEl = $("#audit-result");
  hideError(errorEl);
  resultEl.classList.add("hidden");

  const loanId = $("#audit-loan-id").value.trim();
  if (!loanId) return;

  try {
    const data = await api(`/loans/${encodeURIComponent(loanId)}`);

    // Empréstimo
    $("#a-loan-id").textContent = data.loanId;
    $("#a-loan-status").innerHTML = statusBadge(data.status);
    $("#a-loan-created").textContent = formatDate(data.createdAt);
    $("#a-loan-updated").textContent = formatDate(data.updatedAt);

    // Financeiro
    $("#a-fin-amount").textContent = formatBRL(data.financials.requestedAmount);
    $("#a-fin-installments").textContent = data.financials.installments ?? "—";
    $("#a-fin-rate").textContent = data.financials.appliedInterestRate;

    // Cliente
    const c = data.customer;
    $("#a-cust-id").textContent = c.id;
    $("#a-cust-name").textContent = c.name;
    $("#a-cust-email").textContent = c.email;
    $("#a-cust-cpf").textContent = c.cpf ?? "—";
    $("#a-cust-income").textContent = formatBRL(c.monthlyIncome);
    $("#a-cust-kyc").textContent = c.kycStatus;
    $("#a-cust-blocked").textContent = c.accountBlocked ? "Sim ⚠️" : "Não ✅";

    // Análise de crédito
    if (data.creditAnalysis) {
      const ca = data.creditAnalysis;
      $("#a-credit-none").classList.add("hidden");
      $("#a-credit-data").classList.remove("hidden");
      $("#a-credit-score").textContent = ca.riskScore;
      $("#a-credit-decision").innerHTML = statusBadge(ca.decision);
      $("#a-credit-model").textContent = ca.modelVersion;
      $("#a-credit-reason").textContent = ca.approvalReason;
      $("#a-credit-date").textContent = formatDate(ca.evaluatedAt);

      // Fatores
      const tbody = $("#a-credit-factors tbody");
      tbody.innerHTML = "";
      (ca.factors || []).forEach((f) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${f.factor}</td><td>${f.weight}</td>`;
        tbody.appendChild(tr);
      });
    } else {
      $("#a-credit-none").classList.remove("hidden");
      $("#a-credit-data").classList.add("hidden");
    }

    resultEl.classList.remove("hidden");
  } catch (err) {
    showError(errorEl, err.message);
  }
});

// ===================== Review (PATCH /loans/:id/review) =====================

$("#review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = $("#review-error");
  const resultEl = $("#review-result");
  hideError(errorEl);
  resultEl.classList.add("hidden");

  const loanId = $("#review-loan-id").value.trim();
  const decision = $("#review-decision").value;
  const justification = $("#review-justification").value.trim();

  if (!loanId || !decision || !justification) return;

  try {
    const data = await api(`/loans/${encodeURIComponent(loanId)}/review`, {
      method: "PATCH",
      body: { decision, justification },
    });

    $("#r-loan-id").textContent = data.loanId;
    $("#r-status").innerHTML = statusBadge(data.status);
    $("#r-reviewed-by").textContent = data.reviewedBy;
    resultEl.classList.remove("hidden");
    $("#review-form").reset();
  } catch (err) {
    showError(errorEl, err.message);
  }
});
