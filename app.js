const $ = (id) => document.getElementById(id);

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.tab).classList.add("active");
  });
});

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function checkHealth() {
  try {
    const data = await api("/api/health");
    $("health").textContent = data.demoMode ? "Free Demo Mode" : (data.openaiConfigured ? "API connected" : "API key missing");
  } catch {
    $("health").textContent = "Server error";
  }
}
checkHealth();

function addBubble(text, user = false) {
  const div = document.createElement("div");
  div.className = `bubble${user ? " user" : ""}`;
  div.textContent = text;
  $("chatLog").appendChild(div);
  $("chatLog").scrollTop = $("chatLog").scrollHeight;
}

$("chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("chatInput");
  const message = input.value.trim();
  if (!message) return;
  addBubble(message, true);
  input.value = "";
  try {
    const data = await api("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message})
    });
    addBubble(data.text);
  } catch (error) {
    addBubble(`Error: ${error.message}`);
  }
});

$("generateImage").addEventListener("click", async () => {
  const prompt = $("imagePrompt").value.trim();
  if (!prompt) return;
  $("imageOutput").textContent = "Generating…";
  try {
    const data = await api("/api/images", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        prompt,
        size: $("imageSize").value
      })
    });
    $("imageOutput").replaceChildren();
    const img = document.createElement("img");
    img.src = data.image;
    img.alt = "Generated image";
    $("imageOutput").appendChild(img);
  } catch (error) {
    $("imageOutput").textContent = `Error: ${error.message}`;
  }
});

let currentMedia;

$("mediaInput").addEventListener("change", () => {
  currentMedia = $("mediaInput").files[0];
  if (!currentMedia) return;
  const url = URL.createObjectURL(currentMedia);
  const box = $("mediaPreview");
  box.replaceChildren();
  let element;
  if (currentMedia.type.startsWith("image/")) {
    element = document.createElement("img");
  } else if (currentMedia.type.startsWith("video/")) {
    element = document.createElement("video");
    element.controls = true;
  } else if (currentMedia.type.startsWith("audio/")) {
    element = document.createElement("audio");
    element.controls = true;
  } else {
    box.textContent = "Unsupported media type.";
    return;
  }
  element.src = url;
  box.appendChild(element);
});

$("applyFilter").addEventListener("click", () => {
  const media = $("mediaPreview").querySelector("img, video");
  if (!media) return;
  media.style.filter = $("filter").value;
});

$("censorButton").addEventListener("click", async () => {
  const text = $("censorInput").value;
  if (!text) return;
  $("censorOutput").value = "Scanning…";
  $("detections").textContent = "";
  try {
    const data = await api("/api/censor", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text, mode: "strict"})
    });
    $("censorOutput").value = data.censored;
    $("detections").textContent =
      data.detections.length
        ? `${data.detections.length} detection(s). Replacement: ${data.replacement}`
        : "No configured detections.";
  } catch (error) {
    $("censorOutput").value = `Error: ${error.message}`;
  }
});
