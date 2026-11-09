const loaderDisplay = document.getElementById("loaderDisplay");

async function renderAllNotifications() {
    loaderDisplay.style.display = 'flex';
    const resultNotif = await fetchNotifications();

    if (!resultNotif || resultNotif.length === 0) {
        document.getElementById('all-notif-list').innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>You're all caught up! No notifications right now.</p>
            </div>
        `;
        loaderDisplay.style.display = 'none';
        return;
    }
    
    document.getElementById('all-notif-list').innerHTML = resultNotif.map(n => `
        <li class="${n.is_read ? 'read' : 'unread'}" onclick="notificationMarkAsRead(${n.id})" id="nList">
            <div class="notification-data">
                <strong>${n.title}</strong>
                <p>${n.message}</p>
                <span class="all-notif-time">${formatTime(n.created_at)}</span>
            </div>
            <span class="notif-trash-icon" title="clear"
                onclick="event.stopPropagation(); markAsClearFunction(${n.id})">
                <i class="fas fa-trash"></i>
            </span>
        </li>
    `).join('');
    loaderDisplay.style.display = 'none';
}

const threedotbtn = document.getElementById('threedotbtn');
const threedotbtndropdown = document.getElementById('threedotbtndropdown');
threedotbtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    threedotbtndropdown.classList.toggle("hidden");
});

document.addEventListener("click",()=>{
    threedotbtndropdown.classList.add("hidden");
});

threedotbtndropdown.addEventListener("click",(e)=>{
    e.stopPropagation();
});

function markAsClearFunction(id) {
    openConfirmModal('clearNotif', 'Clear this notification?', 'Are you sure you want to clear this?', 'Clear', id);
}

function markAllAsClearFunction() {
    openConfirmModal('clearAllNotif', 'Clear all notification?', 'Are you sure you want to clear all?', 'Clear');
}

async function notificationMarkAsRead(id) {
    await secureFetch('http://localhost:5000/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
            notificationId: id 
        })
    });
    fetchNotifications();
    displayNotifications();
    renderAllNotifications();
}

async function notificationMarkAllAsRead() {
    await secureFetch('http://localhost:5000/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
        })
    });
    fetchNotifications();
    displayNotifications();
    renderAllNotifications();
}

async function markAsClear(id) {
    await secureFetch('http://localhost:5000/notifications/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
            notificationId: id 
        })
    });
    fetchNotifications();
    displayNotifications();
    renderAllNotifications();
}

async function markAllAsClear() {
    await secureFetch('http://localhost:5000/notifications/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
        })
    });
    fetchNotifications();
    displayNotifications();
    renderAllNotifications();
}