const API_URL = "https://awepfrums-backend.onrender.com";
const token = localStorage.getItem("accessToken");
const role = localStorage.getItem("userRole");

async function secureFetch(url, options = {}) {
    options.headers = options.headers || {};
    let token = localStorage.getItem("accessToken");
    
    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(url, options);

    if (response.status === 401) {
        const data = await response.clone().json().catch(() => ({}));
        
        if (data.errorCode === "TOKEN_EXPIRED") {
            
            const newAccessToken = await performTokenRefresh(); 
            
            if (newAccessToken) {
                options.headers["Authorization"] = `Bearer ${newAccessToken}`;
                response = await fetch(url, options);
            }
        }
    }
    return response;
}

async function performTokenRefresh() {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) {
        window.location.href = "../../pages/authPages/Login.html";
        return null;
    }

    try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: storedRefreshToken }) // Pass it in body
        });
        if (!response.ok) throw new Error("Refresh expired");

        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        return data.accessToken;
    } catch (error) {
        console.error("Session expired, logging out:", error);
        localStorage.clear();
        window.location.href = "../../pages/authPages/Login.html";
        return null;
    }
}

async function handleUserLogout() {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    document.getElementById("loaderMessage").innerText = "Logging out..."
    loaderDisplay.style.display = 'flex';
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
    } catch (err) {
        console.error("Failed to notify backend of logout:", err);
    } finally {
        // Clear out everything from storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userRole");
        setInterval(() => {
            loaderDisplay.style.display = 'none';
            window.location.href = "../../pages/authPages/Login.html";
        }, 2000);
    }
}