//Feedback Modal
function showFeedback(type, title, message) {
    const modal = document.getElementById("feedbackModal");
    const icon = document.getElementById("feedbackIcon");
    const tHead = document.getElementById("feedbackTitle");
    const pText = document.getElementById("feedbackMessage");

    if(!modal || !icon) return;

    icon.className = "bi";
    if (type === "success") icon.classList.add("bi-check-circle-fill", "feedback-success");
    if (type === "error") icon.classList.add("bi-x-circle-fill", "feedback-error");
    if (type === "warning") icon.classList.add("bi-exclamation-circle-fill", "feedback-warning");

    tHead.textContent = title;
    pText.textContent = message;

    modal.style.display = "flex";

    document.getElementById("feedbackClose").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}



fetch("../Modal.html")
.then(res => res.text())
.then(html => {
    document.getElementById("feedbackContainer").innerHTML = html;
});