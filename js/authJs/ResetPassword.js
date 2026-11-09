const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
const API = "https://awepfrums-backend.onrender.com";
const loaderDisplay = document.getElementById("loaderDisplay");
const form = document.getElementById("resetPasswordForm");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

const passwordError = document.getElementById("passwordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const btnText = document.querySelector(".btn-text");
const btnIcon = document.getElementById("btnIcon");

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

function validateConfirmPassword() {
    const val = confirmPassword.value;
    
    if (val.trim() === "") {
        confirmPasswordError.textContent = "Confirm password is required.";
        return false;
    } else if(password.value !== confirmPassword.value) {
        confirmPasswordError.textContent = "Passwords do not match.";
        return false;
    } 
    confirmPasswordError.textContent = "";
    return true;
}
confirmPassword.addEventListener("input", validateConfirmPassword);

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();

    if (!isPasswordValid || !isConfirmPasswordValid) {
        return;
    }

    if (!token) {
        alert("Invalid or missing token.");
        return;
    }

    loaderDisplay.style.display = 'flex';
    resetPasswordBtn.disabled = true;
    btnText.textContent = "Updating Password...";
    btnIcon.style.display = 'none';

    try {
        const res = await fetch(`${API}/auth/resetPassword`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    newPassword: password.value
                })
            });

        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success", data.message);
            form.reset();
            window.location.href = "Login.html";
        } else {
            showFeedback("error", "Error", data.message);
        }
    } catch (err) {
        console.error(err);
        showFeedback("Network communication dropped. Unable to reach server infrastructure.");
    } finally {
        form.reset();
        loaderDisplay.style.display = 'none';
        resetPasswordBtn.disabled = false;
        btnText.textContent = "Update Password";
        btnIcon.style.display = 'inline';
    }
});

backbtn.addEventListener("click", () => {
    window.location.href = "Login.html";
});