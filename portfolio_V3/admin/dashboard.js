import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, setDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const projectsContainer = $("projectsContainer");
const skillsContainer = $("skillsContainer");
const messagesContainer = $("messagesContainer");
const projectModal = $("projectModal");
const PROJECT_CACHE_KEY = "portfolio_projects_cache";
const PROFILE_CACHE_KEY = "portfolio_profile_cache";

const readCache = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
};
const writeCache = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const syncInBackground = (operation, label) => operation.catch((error) => console.warn(`${label} Firebase sync pending:`, error));

function setProjectModal(open) {
    projectModal?.classList.toggle("show", open);
}

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.replace("index.html"); return; }
    loadProjects(); loadSkills(); loadMessages(); loadProfile();
});

$("addProjectBtn")?.addEventListener("click", () => setProjectModal(true));
$("closeProjectModal")?.addEventListener("click", () => setProjectModal(false));
projectModal?.addEventListener("click", (event) => {
    if (event.target === projectModal) setProjectModal(false);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setProjectModal(false);
});
$("addSkillBtn")?.addEventListener("click", async () => {
    const name = prompt("Skill name:");
    if (!name?.trim()) return;
    const percentage = Number(prompt("Skill percentage (0-100):", "80"));
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return alert("Please enter a percentage between 0 and 100.");
    try { await addDoc(collection(db, "skills"), { name: name.trim(), percentage: Math.round(percentage), createdAt: serverTimestamp() }); loadSkills(); }
    catch (error) { alert(`Skill add failed: ${error.code || error.message}`); }
});
$("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.replace("index.html"); });

$("projectForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type=submit]");
    const originalText = submitButton?.textContent || "Add Project";
    const payload = {
        title: $("projectTitle").value.trim(),
        description: $("projectDescription").value.trim(),
        technologies: $("projectTechnologies").value.trim(),
        liveLink: $("projectLiveLink").value.trim(),
        image: $("projectImage").value.trim(),
        createdAt: serverTimestamp()
    };
    if (!payload.title || !payload.description) return;
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Saving..."; }
    try {
        const localProject = { ...payload, createdAt: new Date().toISOString(), localId: `local-${Date.now()}` };
        const cachedProjects = readCache(PROJECT_CACHE_KEY, []);
        writeCache(PROJECT_CACHE_KEY, [localProject, ...cachedProjects]);
        form.reset(); setProjectModal(false); loadProjects();
        alert("Project saved successfully.");
        syncInBackground(addDoc(collection(db, "projects"), payload), "Project");
    } catch (error) {
        console.error("PROJECT ADD ERROR:", error);
        alert(`Project add failed: ${error.code || error.message}`);
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalText; }
    }
});

async function loadProjects() {
    if (!projectsContainer) return;
    try {
        const snapshot = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc")));
        const cachedProjects = readCache(PROJECT_CACHE_KEY, []);
        const remoteIds = new Set(snapshot.docs.map((item) => item.id));
        const localOnly = cachedProjects.filter((item) => !remoteIds.has(item.localId));
        const allProjects = [...localOnly.map((item) => ({ id: item.localId, data: () => item })), ...snapshot.docs];
        if ($("projectCount")) $("projectCount").textContent = snapshot.size;
        projectsContainer.innerHTML = allProjects.length === 0 ? "<div><h3>No Projects Yet</h3><p>Click + Add Project to create one.</p></div>" : allProjects.map((item) => { const data = item.data(); return `<div class="project-card"><h3>${escapeHtml(data.title || "Untitled Project")}</h3><p>${escapeHtml(data.description || "")}</p><p>${escapeHtml(data.technologies || "")}</p><button type="button" class="delete-project" data-id="${item.id}">Delete</button></div>`; }).join("");
        projectsContainer.querySelectorAll(".delete-project").forEach((button) => button.addEventListener("click", async () => { if (confirm("Delete this project?")) { await deleteDoc(doc(db, "projects", button.dataset.id)); loadProjects(); } }));
    } catch (error) {
        const cachedProjects = readCache(PROJECT_CACHE_KEY, []);
        projectsContainer.innerHTML = cachedProjects.length ? cachedProjects.map((data) => `<div class="project-card"><h3>${escapeHtml(data.title)}</h3><p>${escapeHtml(data.description)}</p><p>${escapeHtml(data.technologies)}</p></div>`).join("") : `<div><h3>Projects saved locally</h3><p>Firebase sync will retry when the connection is available.</p></div>`;
    }
}

async function loadSkills() {
    if (!skillsContainer) return;
    try {
        const snapshot = await getDocs(query(collection(db, "skills"), orderBy("createdAt", "desc")));
        skillsContainer.innerHTML = snapshot.empty ? "<div><h3>No Skills Yet</h3><p>Click + Add Skill to create one.</p></div>" : snapshot.docs.map((item) => { const data = item.data(); return `<div class="skill-card"><h3>${escapeHtml(data.name || "Skill")}</h3><p>${Math.round(Number(data.percentage) || 0)}%</p><button type="button" class="delete-skill" data-id="${item.id}">Delete</button></div>`; }).join("");
        skillsContainer.querySelectorAll(".delete-skill").forEach((button) => button.addEventListener("click", async () => { if (confirm("Delete this skill?")) { await deleteDoc(doc(db, "skills", button.dataset.id)); loadSkills(); } }));
    } catch (error) { skillsContainer.innerHTML = `<div><h3>Firestore Error</h3><p>${escapeHtml(error.code || error.message)}</p></div>`; }
}

async function loadMessages() {
    if (!messagesContainer) return;
    const cachedMessages = readCache("portfolio_messages_cache", []);
    const renderMessages = (messages) => {
        if ($("messageCountLabel")) $("messageCountLabel").textContent = `${messages.length} message${messages.length === 1 ? "" : "s"}`;
        messagesContainer.innerHTML = messages.length === 0 ? "<div><h3>No Messages Yet</h3><p>Contact form submissions will appear here.</p></div>" : messages.map((item) => { const data = item.data ? item.data() : item; return `<article class="message-card"><h3>${escapeHtml(data.name || "Anonymous")}</h3><p><a href="mailto:${escapeHtml(data.email || "")}">${escapeHtml(data.email || "")}</a></p><p>${escapeHtml(data.message || "")}</p>${item.id ? `<button type="button" class="delete-message" data-id="${item.id}">Delete</button>` : "<small>Saved locally; syncing...</small>"}</article>`; }).join("");
        messagesContainer.querySelectorAll(".delete-message").forEach((button) => button.addEventListener("click", async () => { if (confirm("Delete this message?")) { await deleteDoc(doc(db, "messages", button.dataset.id)); loadMessages(); } }));
    };
    if (cachedMessages.length) renderMessages(cachedMessages);
    try {
        const snapshot = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc")));
        const remoteLocalIds = new Set(snapshot.docs.map((item) => item.data().localId).filter(Boolean));
        const localOnly = cachedMessages.filter((item) => !remoteLocalIds.has(item.localId));
        renderMessages([...localOnly.map((item) => ({ data: () => item })), ...snapshot.docs]);
    } catch (error) { if (!cachedMessages.length) messagesContainer.innerHTML = `<div><h3>Messages saved locally</h3><p>Firebase sync will retry when the connection is available.</p></div>`; }
}

async function loadProfile() {
    const cached = readCache(PROFILE_CACHE_KEY, null);
    if (cached) { if ($("profileName")) $("profileName").value = cached.name || ""; if ($("profileTitle")) $("profileTitle").value = cached.title || ""; if ($("profileAbout")) $("profileAbout").value = cached.bio || ""; }
    try { const snapshot = await getDoc(doc(db, "settings", "profile")); if (!snapshot.exists()) return; const profile = snapshot.data(); writeCache(PROFILE_CACHE_KEY, profile); if ($("profileName")) $("profileName").value = profile.name || ""; if ($("profileTitle")) $("profileTitle").value = profile.title || ""; if ($("profileAbout")) $("profileAbout").value = profile.bio || ""; }
    catch (error) { console.warn("Profile Firebase sync pending:", error); }
}

$("saveProfileBtn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";
    try {
        const profile = {
            name: $("profileName").value.trim(),
            title: $("profileTitle").value.trim(),
            bio: $("profileAbout").value.trim(),
            updatedAt: serverTimestamp()
        };
        writeCache(PROFILE_CACHE_KEY, profile);
        button.disabled = false;
        button.textContent = originalText;
        alert("Profile saved successfully.");
        syncInBackground(setDoc(doc(db, "settings", "profile"), profile, { merge: true }), "Profile");
    } catch (error) {
        console.error("PROFILE SAVE ERROR:", error);
        alert(`Profile save failed: ${error.code || error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});
