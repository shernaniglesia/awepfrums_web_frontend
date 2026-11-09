const API = "https://awepfrums-backend.onrender.com";
const email = localStorage.getItem("otp_email");
const role = localStorage.getItem("otp_role");
const urlParams = new URLSearchParams(window.location.search);
const receivedWord = urlParams.get('status');

const otpInputs = document.querySelectorAll("#otpInputs input");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");
const errorText = document.getElementById("errorText");
const infoText = document.getElementById("infoText");
const timerText = document.getElementById("timerText");
const loaderDisplay = document.getElementById("loaderDisplay");

let resendCountdown;
let countdownInterval;

otpInputs.forEach((input, idx) => {
    input.addEventListener("input", (e) => {
        const val = e.target.value;
        if (/[^0-9]/.test(val)) e.target.value = "";
        if (val && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && idx > 0) {
            otpInputs[idx - 1].focus();
        }
    });

    input.addEventListener("paste", (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(paste)) {
            otpInputs.forEach((inp, i) => inp.value = paste[i]);
        }
    });
});

function startResendCountdown() {
    resendCountdown = 45;
    resendBtn.disabled = true;
    
    countdownInterval = setInterval(() => {
        resendCountdown--;
        timerText.textContent = `Resend available in ${resendCountdown}s`;
        
        if (resendCountdown <= 0) {
            clearInterval(countdownInterval);
            resendBtn.disabled = false;
            resendBtn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
            timerText.textContent = "";
        } else {
            resendBtn.innerHTML = `<i class="fas fa-clock"></i> Wait ${resendCountdown}s`;
        }
    }, 1000);
}

verifyBtn.addEventListener("click", async () => {
    errorText.textContent = "";

    const otp = Array.from(otpInputs).map(i => i.value).join("");
    if (otp.length < 6) {
        errorText.textContent = "Please enter all 6 digits";
        return;
    }

    loaderDisplay.style.display = 'flex';
    verifyBtn.disabled = true;
    
    try {
        const res = await fetch(`${API}/auth/verifyOTP`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role, otp })
        });

        const data = await res.json();
        
        if (!res.ok) {
            if (res.status === 429) {
                showFeedback("warning", "Warning", data.error || "Too Many Requests");
                return;
            }

            showFeedback("error", "Error", data.message || "Incorrect OTP.");
            otpInputs.forEach(i => i.value = "");
            otpInputs[0].focus();
            return;
        } else {
            if(receivedWord === ("resetPassword")){
                showFeedback("success", "Success", "OTP verified. You can now reset your password.");
                setTimeout(() => {
                    window.location.href = `ResetPassword.html?token=${data.resetToken}`;
                }, 2000);
            }else{
                showFeedback("success", "Success", "Account verified successfully!");
                setTimeout(() => {
                    window.location.href = "Login.html";
                }, 2000);
            }
        }
    } catch (err) {
        console.error(err);
        errorText.textContent = "Server error";
        showFeedback("error", "Error", "Network communication dropped. Unable to reach server infrastructure.");
    } finally {
        loaderDisplay.style.display = 'none';
        verifyBtn.disabled = false;
    }
});

function disableInputs() {
    otpInputs.forEach(i => i.disabled = true);
    verifyBtn.disabled = true;
}

resendBtn.addEventListener("click", async () => {
    resendBtn.disabled = true;
    try {
        const res = await fetch(`${API}/auth/requestOTP`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role })
        });
        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success", "New OTP sent! Check your email.");
            otpInputs.forEach(i => { i.value = ""; i.disabled = false; });
            verifyBtn.disabled = false;
            otpInputs[0].focus();
            startResendCountdown();
        } else {
            if (res.status === 429) {
                showFeedback("warning", "Warning", data.error || "Too Many Requests");
                return;
            }

            showFeedback("error", "Error", data.message || "Failed to resend OTP");
            return;
        }
    } catch (err) {
        console.error(err);
        errorText.textContent = "Unable to contact server";
        showFeedback("error", "Error", "Network communication dropped. Unable to reach server infrastructure.");
    }
});

startResendCountdown();

backbtn.addEventListener("click", () => {
    window.location.href = "Login.html";
});