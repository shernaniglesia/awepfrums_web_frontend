const API = "https://awepfrums-backend.onrender.com";
const form = document.getElementById("forgotForm");
const email = document.getElementById("email");
const role = document.getElementById("role");

const emailError = document.getElementById("emailError");
const roleError = document.getElementById("roleError");

const forgotBtn = document.getElementById("forgotBtn");
const btnText = document.querySelector(".btn-text");
const btnIcon = document.getElementById("btnIcon");
const backbtn = document.getElementById("backbtn");
const loaderDisplay = document.getElementById("loaderDisplay");

const emailPattern = /^[A-Za-z0-9._%+-]+@cbsua\.edu\.ph$/i;

function validateEmail() {
    if (email.value.trim() === "") {
        emailError.textContent = "Email is required.";
        return false;
    } else if (!emailPattern.test(email.value)) {
        emailError.textContent = "Please use a valid @cbsua.edu.ph email address.";
        return false;
    }
    emailError.textContent = "";
    return true;
}
email.addEventListener("input", validateEmail);

function validateRole() {
    if (role.value === "") {
        roleError.textContent = "Please select a user role.";
        return false;
    }
    roleError.textContent = "";
    return true;
}
role.addEventListener("change", validateRole);

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const isEmailValid = validateEmail();
    const isRoleValid = validateRole();

    if ( !isEmailValid || !isRoleValid ) {
        return;
    }

    loaderDisplay.style.display = 'flex';
    forgotBtn.disabled = true;
    btnText.textContent = "Sending...";
    btnIcon.style.display = 'none';

    try {
        const res = await fetch(`${API}/auth/forgotPassword`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value,
                role: role.value
            })
        });

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 429) {
                showFeedback("warning", "Warning", data.error || "Too Many Requests");
                return;
            }
            
            showFeedback("error", "Error", data.message);
            return;
        }

        if(res.ok){
            showFeedback("success", "Success", data.message);
            localStorage.setItem("otp_email", email.value);
            localStorage.setItem("otp_role", role.value);
            const status = "resetPassword";
            setTimeout(() => {
                window.location.href = "OTP.html?status=" + encodeURIComponent(status);
            }, 2000);
        }

    } catch (err) {
        console.error(err);
        showFeedback("error", "Error", "Network communication dropped. Unable to reach server infrastructure.");
    } finally {
        loaderDisplay.style.display = 'none';
        forgotBtn.disabled = false;
        btnText.textContent = "Send Reset Code";
        btnIcon.style.display = 'inline';
        form.reset();
    }
});

backbtn.addEventListener("click", () => {
    window.location.href = "Login.html";
});