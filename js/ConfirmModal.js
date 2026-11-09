function openConfirmModal(type, title, message, btntxt, targetId = null) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmIcon = document.getElementById('confirmIcon');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const yesButton = document.getElementById('yesButton');

    if(!confirmModal) return;

    confirmIcon.classList.add("bi-power", "feedback-error");
    confirmIcon.className = "bi";
    if (type === "logout") confirmIcon.classList.add("bi-power", "feedback-error");
    if (type === "semSetActive") confirmIcon.classList.add("bi-calendar-range", "feedback-warning");
    if (type === "clearNotif") confirmIcon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    if (type === "clearAllNotif") confirmIcon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    if (type === "removeSchedule") confirmIcon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    if (type === "removeReservation") confirmIcon.classList.add("bi-exclamation-circle-fill", "feedback-warning");
    if (type === "giveSchedule") confirmIcon.classList.add("bi-exclamation-circle-fill", "feedback-warning");


    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    yesButton.textContent = btntxt;

    confirmModal.style.display = 'flex';

    document.getElementById("cancelButton").onclick = () => {
        confirmModal.style.display = "none";
    };

    if(type === "logout") {
        yesButton.onclick = (e) => {
            handleUserLogout();
            confirmModal.style.display = "none";
        };
    }

    if(type === "semSetActive") {
        yesButton.style.backgroundColor = "#10b981";
        yesButton.onclick = (e) => {
            if (targetId !== null) {
                setActive(targetId); 
            }
            confirmModal.style.display = "none";
        };
    }

    if(type === "clearNotif") {
        yesButton.onclick = async (e) => {
            if (targetId !== null) {
                await markAsClear(targetId); 
            }
            confirmModal.style.display = "none";
        };
    }

    if(type === "clearAllNotif") {
        yesButton.onclick = async (e) => {
            await markAllAsClear(); 
            confirmModal.style.display = "none";
        };
    }

    if(type === "removeSchedule") {
        yesButton.onclick = async (e) => {
            await handleMakeAvailable();
            confirmModal.style.display = "none";
        };
    }

    if(type === "removeReservation") {
        yesButton.onclick = async (e) => {
            await handleRemove();
            confirmModal.style.display = "none";
        };
    }

    if(type === "giveSchedule") {
        yesButton.onclick = async (e) => {
            handleGiveSchedule();
            confirmModal.style.display = "none";
        };
    }
    
}

fetch("../Modal.html")
.then(res => res.text())
.then(html => {
    document.getElementById("confirmContainer").innerHTML = html;
});