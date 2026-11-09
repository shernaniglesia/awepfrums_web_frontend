const API = "https://awepfrums-backend.onrender.com";
const savedRole = localStorage.getItem("userRole");
const token = localStorage.getItem("accessToken");

if (token && savedRole) {
    switch (savedRole) {
        case "admin":
            window.location.href = "../adminPages/AdminDashboard.html";
            break;
        case "instructor":
            window.location.href = "../instructorPages/InstructorDashboard.html";
            break;
        case "student":
            window.location.href = "../studentPages/StudentDashboard.html";
            break;
    }
}

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const role = document.getElementById("role");
const password = document.getElementById("password");
const emailError = document.getElementById("emailError");
const roleError = document.getElementById("roleError");
const passwordError = document.getElementById("passwordError");
const loginBtn = document.getElementById("loginBtn");
const btnText = document.querySelector(".btn-text");
const btnIcon = document.querySelector(".btn-icon");
const loaderDisplay = document.getElementById("loaderDisplay");
const loaderMessage = document.getElementById("loaderMessage");

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const targetId = this.dataset.target;
        const field = document.getElementById(targetId);
        const isPassword = field.type === 'password';
        
        field.type = isPassword ? 'text' : 'password';
        this.classList.toggle('fa-eye-slash', isPassword);
        this.classList.toggle('fa-eye', !isPassword);
    });
});

const emailPattern = /^[A-Za-z0-9._%+-]+@cbsua\.edu\.ph$/i;
let valid = false;

email.addEventListener("input", function() {
    if (email.value.trim() === "") {
        emailError.textContent = "Email is required.";
        valid = false;
    } else if (!emailPattern.test(email.value)) {
        emailError.textContent = "Please use a valid @cbsua.edu.ph email address.";
        valid = false;
    } else {
        emailError.textContent = "";
        valid = true;
    }
});

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    if (!valid) return;
    loaderMessage.textContent = 'Verifying credential...';
    loaderDisplay.style.display = 'flex';
    loginBtn.disabled = true;
    btnText.textContent = "Verifying credential...";
    btnIcon.style.display = 'none';
    localStorage.clear();

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value,
                role: role.value,
                password: password.value
            })
        });
 
        const data = await res.json();
        
        if (!res.ok) {
            if (res.status === 429) {
                showFeedback("warning", "Warning", data.error || "Too Many Requests");
                return;
            }
            
            showFeedback("error", "Access Denied", data.message || "Login failed");
            return;
        }
        
        if (data.requireOTP) {
            localStorage.setItem("otp_email", data.email);
            localStorage.setItem("otp_role", data.smallRole);
            window.location.href = "OTP.html";
            return;
        }

        loaderMessage.textContent = 'Logging in...';

        localStorage.setItem("userRole", data.role);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        switch (data.role) {
            case "admin":
                window.location.href = "../adminPages/AdminDashboard.html";
                break;
            case "instructor":
                window.location.href = "../instructorPages/InstructorDashboard.html";
                break;
            case "student":
                window.location.href = "../studentPages/StudentDashboard.html";
                break;
            default:
                showFeedback("warning", "Warning", "Unknown role");
        }

    } catch (err) {
        console.error(err);
        showFeedback("error", "Error", data.message);
    } finally {
        loaderDisplay.style.display = 'none';
        loginBtn.disabled = false;
        btnText.textContent = "Sign In";
        btnIcon.style.display = 'inline';
    }
});