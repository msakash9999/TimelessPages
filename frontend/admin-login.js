const adminLoginForm = document.getElementById("adminLoginForm");
const adminMessage = document.getElementById("adminMessage");
const adminSubmitButton = adminLoginForm?.querySelector('button[type="submit"]');
const adminLoginParams = new URLSearchParams(window.location.search);
const adminRequestedNextPath = adminLoginParams.get("next") || "";

if (adminLoginParams.get("reason") === "protected") {
  localStorage.removeItem("timelessPagesAdminToken");
  localStorage.removeItem("timelessPagesAdminEmail");
  localStorage.removeItem("timelessPagesAdminName");
  localStorage.removeItem("timelessPagesIsAdmin");
}

function getApiBaseCandidates() {
  const savedApiBaseUrl = localStorage.getItem("timelessPagesApiBaseUrl");
  const { protocol, hostname, port, origin } = window.location;
  const isHttpPage = protocol === "http:" || protocol === "https:";
  const candidates = [];

  if (savedApiBaseUrl) {
    candidates.push(savedApiBaseUrl.replace(/\/$/, ""));
  }

  if (isHttpPage && port === "5000") {
    candidates.push(origin);
  }

  if (isHttpPage && hostname) {
    candidates.push(`${protocol}//${hostname}:5000`);
  }

  candidates.push("http://localhost:5000", "http://127.0.0.1:5000");

  return [...new Set(candidates)];
}

async function getJsonSafely(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: "The server returned HTML instead of JSON. Check that the backend API is running on port 5000." };
  }
}

async function requestJson(path, options = {}) {
  let lastError = null;

  for (const baseUrl of getApiBaseCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, options);
      const data = await getJsonSafely(response);

      if (data && typeof data === "object" && data.message?.includes("returned HTML instead of JSON")) {
        throw new Error(`The server at ${baseUrl} returned HTML instead of JSON.`);
      }

      localStorage.setItem("timelessPagesApiBaseUrl", baseUrl);
      return { response, data };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Cannot reach the backend server.");
}

function setAdminMessage(message, type) {
  if (!adminMessage) {
    return;
  }

  adminMessage.textContent = message;
  adminMessage.className = `admin-login-message ${type}`;
}

function resolveAdminNextPath() {
  return adminRequestedNextPath === "/admin.html" ? "admin.html" : "admin.html";
}

if (localStorage.getItem("timelessPagesAdminToken")) {
  window.location.href = resolveAdminNextPath();
}

adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("adminEmail")?.value.trim();
  const password = document.getElementById("adminPassword")?.value;

  if (!email || !password) {
    setAdminMessage("Please enter admin email and password.", "error");
    return;
  }

  try {
    if (adminSubmitButton) {
      adminSubmitButton.disabled = true;
      adminSubmitButton.textContent = "Signing in...";
    }

    const { response, data } = await requestJson("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(data?.message || "Admin login failed");
    }

    localStorage.setItem("timelessPagesAdminToken", data.token);
    localStorage.setItem("timelessPagesAdminEmail", data.admin.email);
    localStorage.setItem("timelessPagesAdminName", data.admin.name);
    localStorage.setItem("timelessPagesIsAdmin", "true");

    setAdminMessage("Login successful! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = resolveAdminNextPath();
    }, 700);
  } catch (error) {
    const knownApiBaseUrl = localStorage.getItem("timelessPagesApiBaseUrl") || "http://localhost:5000";
    const message = error instanceof TypeError
      ? `Cannot reach the backend server at ${knownApiBaseUrl}.`
      : (error.message || "Something went wrong.");
    setAdminMessage(message, "error");
  } finally {
    if (adminSubmitButton) {
      adminSubmitButton.disabled = false;
      adminSubmitButton.textContent = "Sign In to Dashboard";
    }
  }
});

if (adminLoginParams.get("reason") === "protected") {
  setAdminMessage("Please log in first. Direct admin URL access is blocked.", "error");
}
