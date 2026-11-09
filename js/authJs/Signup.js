const API = "https://awepfrums-backend.onrender.com";
const form = document.getElementById("signupForm");
const name = document.getElementById("name");
const email = document.getElementById("email");
const role = document.getElementById("role");
const password = document.getElementById("password");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const roleError = document.getElementById("roleError");
const passwordError = document.getElementById("passwordError");

const signupBtn = document.getElementById("signupBtn");
const btnText = document.querySelector(".btn-text");
const btnIcon = document.getElementById("btnIcon");
const loaderDisplay = document.getElementById("loaderDisplay");

const emailPattern = /^[A-Za-z0-9._%+-]+@cbsua\.edu\.ph$/i;

const reqLength = document.getElementById("reqLength");
const reqUpper = document.getElementById("reqUpper");
const reqLower = document.getElementById("reqLower");
const reqNum = document.getElementById("reqNum");
const reqSpecial = document.getElementById("reqSpecial");

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

function validateName() {
    if (name.value.trim().length < 3) {
        nameError.textContent = "Name must be at least 3 characters.";
        return false;
    }
    nameError.textContent = "";
    return true;
}
name.addEventListener("input", validateName);

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

function validatePassword() {
    const val = password.value;
    
    if (val.trim() === "") {
        passwordError.textContent = "Password is required.";
    } else {
        passwordError.textContent = "";
    }

    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasLower = /[a-z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const hasSpecial = /[@$!% *?&]/.test(val);

    const updateUI = (el, isValid) => {
        const icon = el.querySelector('i');
        if (isValid) {
            el.className = "requirement valid";
            icon.className = "fas fa-check-circle";
        } else {
            el.className = "requirement invalid";
            icon.className = "fas fa-times-circle";
        }
    };

    if (val.length > 0) {
        updateUI(reqLength, hasLength);
        updateUI(reqUpper, hasUpper);
        updateUI(reqLower, hasLower);
        updateUI(reqNum, hasNum);
        updateUI(reqSpecial, hasSpecial);
    } else {
        document.querySelectorAll('.requirement').forEach(el => {
            el.className = "requirement";
            el.querySelector('i').className = "fas fa-circle";
        });
    }

    return (hasLength && hasUpper && hasLower && hasNum && hasSpecial);
}
password.addEventListener("input", validatePassword);

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

    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isRoleValid = validateRole();
    const isPasswordValid = validatePassword();

    if (!isNameValid || !isEmailValid || !isRoleValid || !isPasswordValid) {
        return;
    }

    loaderDisplay.style.display = 'flex';
    signupBtn.disabled = true;
    btnText.textContent = "Creating Account...";
    btnIcon.style.display = 'none';

    try {
        const res = await fetch(`${API}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.value,
                email: email.value,
                password: password.value,
                role: role.value
            })
        });

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 429) {
                showFeedback("warning", "Warning", data.error || "Too Many Requests");
                return;
            }
            showFeedback("error", "Error", data.message || "Signup process execution encountered an error.");
            return;
        }

        showFeedback("success", "Success", "Verification code sent! Please check your inbox.");
        localStorage.setItem("otp_role", role.value);
        localStorage.setItem("otp_email", email.value);
        setTimeout(() => {
            window.location.href = "OTP.html";
        }, 2000);

    } catch (err) {
        console.error(err);
        showFeedback("Network communication dropped. Unable to reach server infrastructure.");
    } finally {
        loaderDisplay.style.display = 'none';
        signupBtn.disabled = false;
        btnText.textContent = "Create Account";
        btnIcon.style.display = 'inline';
        form.reset();
    }
});