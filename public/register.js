const registerForm = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    brokerage: document.getElementById("brokerage").value.trim(),
    market: document.getElementById("market").value.trim()
  };

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    window.location.href = "/dashboard";
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});
