import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]));

function showError(container, title, error) {
    console.error(title, error);
    container.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(error?.code || error?.message || "Please try again later.")}</p>`;
}

function syncContactInBackground(payload) {
    addDoc(collection(db, "messages"), payload).catch((error) => console.warn("Message Firebase sync pending:", error));
}

function readCache(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}

function renderProjectCards(container, projects) {
    container.innerHTML = projects.length ? projects.map((data) => {
        const link = data.liveLink ? `<a href="${escapeHtml(data.liveLink)}" target="_blank" rel="noopener noreferrer">View Project</a>` : "";
        const image = data.image ? `<img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || "Project")}" loading="lazy">` : "";
        return `<article class="project-card">${image}<h3>${escapeHtml(data.title || "Untitled Project")}</h3><p>${escapeHtml(data.description || "")}</p><small>${escapeHtml(data.technologies || "")}</small>${link}</article>`;
    }).join("") : "<h3>No projects found</h3><p>Projects will appear here soon.</p>";
}

async function loadProjects() {
    const container = $("projectsContainer");
    if (!container) return;
    const cachedProjects = readCache("portfolio_projects_cache", []);
    if (cachedProjects.length) renderProjectCards(container, cachedProjects);
    try {
        const snapshot = await getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc")));
        if (snapshot.empty) {
            if (!cachedProjects.length) renderProjectCards(container, []);
            return;
        }
        renderProjectCards(container, snapshot.docs.map((projectDoc) => projectDoc.data()));
    } catch (error) {
        if (!cachedProjects.length) showError(container, "Projects unavailable", error);
    }
}

async function loadSkills() {
    const container = $("skillsContainer");
    if (!container) return;
    try {
        const snapshot = await getDocs(query(collection(db, "skills"), orderBy("createdAt", "desc")));
        if (snapshot.empty) {
            container.innerHTML = "<h3>No skills found</h3><p>Skills will appear here soon.</p>";
            return;
        }
        container.innerHTML = snapshot.docs.map((skillDoc) => {
            const data = skillDoc.data();
            const percentage = Math.min(100, Math.max(0, Number(data.percentage) || 0));
            return `<article class="card"><h3>${escapeHtml(data.name || "Skill")}</h3><div class="skill-bar"><div class="skill-progress" style="width:${percentage}%"></div></div><span>${percentage}%</span></article>`;
        }).join("");
    } catch (error) {
        showError(container, "Skills unavailable", error);
    }
}

async function loadProfile() {
    const cached = readCache("portfolio_profile_cache", null);
    if (cached) {
        if (cached.name && $("profileName")) $("profileName").textContent = cached.name;
        if (cached.bio && $("profileBio")) $("profileBio").textContent = cached.bio;
        if (cached.title && document.querySelector(".hero h2")) document.querySelector(".hero h2").textContent = cached.title;
    }
    try {
        const snapshot = await getDoc(doc(db, "settings", "profile"));
        if (!snapshot.exists()) return;
        const profile = snapshot.data();
        if (profile.name && $("profileName")) $("profileName").textContent = profile.name;
        if (profile.bio && $("profileBio")) $("profileBio").textContent = profile.bio;
        if (profile.title && document.querySelector(".hero h2")) document.querySelector(".hero h2").textContent = profile.title;
        if (profile.image && $("profileImage")) $("profileImage").src = profile.image;
    } catch (error) {
        console.warn("Profile could not be loaded:", error);
    }
}

async function submitContactForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $("formStatus");
    const button = form.querySelector("button[type=submit]");
    const payload = {
        name: $("contactName").value.trim(),
        email: $("contactEmail").value.trim(),
        message: $("contactMessage").value.trim(),
        createdAt: serverTimestamp(),
        read: false,
        localId: `local-${Date.now()}`
    };
    if (!payload.name || !payload.email || !payload.message) return;
    button.disabled = true;
    status.textContent = "Saved";
    try {
        form.reset();
        status.textContent = "Thanks! Your message has been sent successfully.";
        status.style.color = "#65d98b";
        const cachedMessages = readCache("portfolio_messages_cache", []);
        localStorage.setItem("portfolio_messages_cache", JSON.stringify([{ ...payload, createdAt: new Date().toISOString() }, ...cachedMessages]));
        syncContactInBackground(payload);
    } catch (error) {
        console.error("Contact form error:", error);
        status.textContent = "Could not send your message. Please try again.";
        status.style.color = "#ff6b6b";
    } finally {
        button.disabled = false;
    }
}

$("contactForm")?.addEventListener("submit", submitContactForm);
loadProjects();
loadSkills();
loadProfile();
