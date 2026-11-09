const form = document.getElementById("changePasswordForm");
const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");

const oldPasswordError = document.getElementById("oldPasswordError");
const newPasswordError = document.getElementById("newPasswordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

const changePasswordBtn = document.getElementById("changePasswordBtn");
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

function validateOldPassword() {
    if (oldPassword.value === "") {
        oldPasswordError.textContent = "Please enter the old password.";
        return false;
    }
    oldPasswordError.textContent = "";
    return true;
}
oldPassword.addEventListener("input", validateOldPassword);

function validateNewPassword() {
    const val = newPassword.value;
    
    if (val.trim() === "") {
        newPasswordError.textContent = "Password is required.";
    } else {
        newPasswordError.textContent = "";
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
newPassword.addEventListener("input", validateNewPassword);

function validateConfirmPassword() {
    const val = confirmPassword.value;
    
    if (val.trim() === "") {
        confirmPasswordError.textContent = "Confirm password is required.";
        return false;
    } else if(newPassword.value !== confirmPassword.value) {
        confirmPasswordError.textContent = "Passwords do not match.";
        return false;
    } 
    confirmPasswordError.textContent = "";
    return true;
}
confirmPassword.addEventListener("input", validateConfirmPassword);

    form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const isOldPasswordValid = validateOldPassword();
    const isNewPasswordValid = validateNewPassword();
    const isConfirmPasswordValid = validateConfirmPassword();

    if (!isOldPasswordValid || !isNewPasswordValid || !isConfirmPasswordValid) {
        return;
    }

    loaderDisplay.style.display = 'flex';
    changePasswordBtn.disabled = true;
    btnText.textContent = "Updating Password...";
    btnIcon.style.display = 'none';

    try {
        const res = await secureFetch(`${API_URL}/users/reset-password/${CURRENT_USER_ROLE}/${CURRENT_USER_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                currentPassword: oldPassword.value,
                newPassword: newPassword.value,
            })
        });

        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success", data.message);
            form.reset();
        } else {
            showFeedback("error", "Error", data.message);
        }
    } catch (err) {
        console.error(err);
        showFeedback("error", "Error", "Network communication dropped. Unable to reach server infrastructure.");
    } finally {
        form.reset();
        loaderDisplay.style.display = 'none';
        changePasswordBtn.disabled = false;
        btnText.textContent = "Update Password";
        btnIcon.style.display = 'inline';
    }
});