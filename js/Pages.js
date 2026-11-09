// Sidebar functionality
const menuBtn = document.getElementById("menuBtn");
const menuBtn2 = document.getElementById("menuBtn2");
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("main");
const header = document.getElementById("mainHeader");
const overlay = document.getElementById("overlay");

function toggleSidebar() {
    if (window.innerWidth <= 1260) {
        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");
    } else {
        sidebar.classList.toggle("hidden");
        content.classList.toggle("full");
        header.classList.toggle("full");
        menuBtn2.classList.toggle("show");
    }
}

menuBtn.addEventListener("click", toggleSidebar);
menuBtn2.addEventListener("click", toggleSidebar);
overlay.addEventListener("click", () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 1260) {
        sidebar.classList.remove("show");
        overlay.classList.remove("show");
    }
});


//Profile Dropdown
const profileContainer = document.querySelector(".profile-container");
const profileDropdown = document.getElementById("profileDropdown");

profileContainer.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("show");
});

document.addEventListener("click", () => {
    profileDropdown.classList.remove("show");
});

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        console.error("Invalid token:", e);
        return null;
    }
}

let CURRENT_USER_NAME = "";
let CURRENT_USER_ROLE = "";
let CURRENT_USER_ID = "";

function initUserProfile() {
    const decoded = decodeToken(token);
    if (decoded && decoded.user_name) {
        CURRENT_USER_NAME = decoded.user_name;
        const name = decoded.user_name;
        const role = decoded.user_role;
        CURRENT_USER_ID =  decoded.user_id;
        CURRENT_USER_ROLE = decoded.user_role;
        const firstName = name.split(" ")[0];
        const lastName = name.split(" ").at(-1)[0];
        const initials = (firstName[0] + lastName).toUpperCase();
        //const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
        
        document.getElementById("profileName").textContent = name;
        document.getElementById("profileAvatar").textContent = initials;
        document.getElementById("miniProfileAvatar").textContent = initials;
        document.getElementById("profileRole").textContent = role;
    }
}


//Notification Dropdown
const bellBtn = document.getElementById('notif-bell');
const dropdown = document.getElementById('notif-dropdown');

// Toggle Dropdown
bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    dropdown.classList.add("hidden");
});

dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
});

function formatTime(dateString) {
    const date = new Date(dateString);
    
    // Check if it happened today
    const isToday = new Date().toDateString() === date.toDateString();
    
    if (isToday) {
        // Show just the time if today (e.g., 2:30 PM)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        // Show date and time if older (e.g., May 14, 2:30 PM)
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

const API_URL_NGANI = "https://awepfrums-backend.onrender.com";

async function fetchNotifications() {
    const res = await secureFetch(`${API_URL_NGANI}/notifications/${CURRENT_USER_ROLE}/${CURRENT_USER_ID}`);
    return await res.json();
}

async function displayNotifications() {
    const data = await fetchNotifications();

    // Update badge count
    const unreadCount = data.filter(n => !n.is_read).length;
    if(unreadCount < 1){
        document.getElementById('notif-count').style.display = 'none';
    }else{
        document.getElementById('notif-count').style.background = "#ef4444";
        document.getElementById('notif-count').style.display = 'flex';
        document.getElementById('notif-count').innerText = unreadCount;
    }

    if (!data || data.length === 0) {
        document.getElementById('notif-list').innerHTML = `
            <div class="no-notifications" style="text-align: center; padding: 3rem 1rem;color: #64748b;font-size: 1rem;">
                <i class="fas fa-bell-slash" style="display: block;font-size: 2.5rem;margin-bottom: 1rem;color: #cbd5e1;"></i>
                <p>You're all caught up! No notifications right now.</p>
            </div>
        `;
        return;
    }

    document.getElementById('notif-list').innerHTML = data.slice(0, 4).map(n => `
        <li class="${n.is_read ? 'read' : 'unread'}" onclick="markAsRead(${n.id})">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <span class="notif-time">${formatTime(n.created_at)}</span>
        </li>
    `).join('');
}

async function markAsRead(id) {
    await secureFetch('${API_URL_NGANI}/notifications/read', {
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
}

async function markAllAsRead() {
    await secureFetch('${API_URL_NGANI}/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: CURRENT_USER_ID, 
            role: CURRENT_USER_ROLE, 
        })
    });
    fetchNotifications();
    displayNotifications();
}

setInterval(() => {
    fetchNotifications();
    displayNotifications();
}, 5000);
