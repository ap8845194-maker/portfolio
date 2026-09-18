import { auth } from "../firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("dashboard.html");
});

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    loginStatus.textContent = "Logging in...";
    loginStatus.style.color = "";
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginStatus.style.color = "#65d98b";
        loginStatus.textContent = "Login successful!";
    } catch (error) {
        console.error("Firebase Login Error:", error);
        loginStatus.style.color = "#ff6b6b";
        loginStatus.textContent = error.code || "Login failed. Please check your credentials.";
    }
});
