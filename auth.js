/**
 * auth.js
 * Client-side authentication helpers for the Study Tracker demo.
 * Responsible for wiring the signup and login forms to the backend API
 * and storing the returned token in `localStorage` on success.
 *
 * Notes for interviews:
 * - This file intentionally only stores the JWT token client-side.
 * - Full user objects are fetched from the server and kept in memory.
 */

const backendURL = "http://localhost:5000/api";

/**
 * Sign-up form handler
 * - Collects form values
 * - Calls POST /register on backend
 * - On success, redirects to login page
 */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const course = document.getElementById("course")?.value || "";
        const year = document.getElementById("year")?.value || "";

        const res = await fetch(`${backendURL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, course, year })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Account Created Successfully");
            window.location.href = "login.html";
        } else {
            alert(data.message);
        }
    });
}

/**
 * Login form handler
 * - Submits credentials to POST /login
 * - Persists returned token into `localStorage`
 * - Redirects to main app on success
 */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const res = await fetch(`${backendURL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("token", data.token);
            // Do not persist full user object in localStorage; token is enough.
            alert("Login Successful");
            window.location.href = "index.html";
        } else {
            alert(data.message);
        }
    });
}