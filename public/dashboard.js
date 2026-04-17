const profileBox = document.getElementById("profileBox");
const logoutBtn = document.getElementById("logoutBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const messages = document.getElementById("messages");

let currentUser = null;

function addBubble(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function loadCurrentUser() {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    window.location.href = "/login";
    return;
  }
  const data = await res.json();
  currentUser = data.user;
  profileBox.innerHTML = `
    <strong>${currentUser.name}</strong><br />
    ${currentUser.email}<br />
    <span style="color:#b8c1e6;">Market:</span> ${currentUser.market || "Not set"}<br />
    <span style="color:#b8c1e6;">Role:</span> ${currentUser.role}
  `;
}

chatForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addBubble(text, "user");
  chatInput.value = "";

  try {
    addBubble("Thinking...", "bot");
    const loadingBubble = messages.lastElementChild;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        context: { location: currentUser?.market || "" }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || "Chat failed");

    loadingBubble.textContent = `${data.answer}\n\n[Provider: ${data.meta.provider} | Listings: ${data.meta.listingCount} | Web signals: ${data.meta.webSignalCount}]`;
  } catch (err) {
    addBubble(`Error: ${err.message}`, "bot");
  }
});

logoutBtn?.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

loadCurrentUser();
