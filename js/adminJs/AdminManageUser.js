window.addEventListener("resize", () => {
    renderTable();
});

let users = [];
let fullUsers = [];

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const userModal = document.getElementById("userModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addUserForm = document.getElementById("addUserForm");

const nameInput = document.getElementById("name");
const roleInput = document.getElementById("role");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const formErrorName = document.getElementById("formErrorName");
const formErrorRole = document.getElementById("formErrorRole");
const formErrorEmail = document.getElementById("formErrorEmail");
const formErrorPassword = document.getElementById("formErrorPassword");

let editMode = false;
let editUserId = null;
let editRole = null;
let oldEmail = null;

togglePassword.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");

    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";

    if (isHidden) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
});

async function fetchUsers() {
    loaderDisplay.style.display = 'flex';
    try {
        const userRes = await secureFetch(`${API_URL}/users`); 
        
        if (userRes.ok) {
            users = await userRes.json();
            fullUsers = [...users];
            renderTable();
        } else {
            const errorData = await userRes.json().catch(() => ({}));
            showFeedback("error", "Access Denied", errorData.message || "Unauthorized");
        }
    } catch (err) {
        console.error("Error fetching data:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

function renderTable() {
    const dataTableBody = document.getElementById("dataTableBody");
    dataTableBody.innerHTML = "";
    const isMobile = window.innerWidth < 768;

    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedUsers = users.slice(start, end);

    paginatedUsers.forEach(user => {
        const tr = document.createElement("tr");

        if (isMobile) {
            const tdCombined = document.createElement("td");

            tdCombined.innerHTML = `
                <div class="data-cell">
                    <strong>${user.name}</strong><br>
                    <small>
                        ${user.email}<br>
                        ${user.role}
                    </small>
                </div>    
            `;

            tr.appendChild(tdCombined);

        } else {
            const tdName = document.createElement("td");
            tdName.classList.add("firstColumn");
            tdName.innerText = user.name;
            tr.appendChild(tdName);

            const tdEmail = document.createElement("td");
            tdEmail.classList.add("secondColumn");
            tdEmail.innerText = user.email;
            tr.appendChild(tdEmail);

            const tdRole = document.createElement("td");
            tdRole.classList.add("thirdColumn");
            tdRole.innerText = user.role;
            tr.appendChild(tdRole);
        }

        const tdAction = document.createElement("td");
        tdAction.classList.add("fourthColumn");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.title = "Edit";
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(user);
        });

        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

addButton.addEventListener("click", () => {
    document.getElementById("roleLabel").style.display = "flex";
    roleInput.style.display = "flex";
    document.getElementById("passwordLabel").style.display = "flex";
    passwordInput.style.display = "flex";
    togglePassword.style.display = "flex";
    editMode = false;
    editUserId = null;
    editRole = null;
    nameInput.value = "";
    roleInput.value = "";
    emailInput.value = "";
    passwordInput.value = "";
    formErrorName.innerText = "";
    formErrorRole.innerText = "";
    formErrorEmail.innerText = "";
    formErrorPassword.innerText = "";
    modalTitle.innerText = "Add User";
    modalBtn.innerText = "Add User";
    userModal.style.display = "flex";
});

function openEditModal(user) {
    document.getElementById("roleLabel").style.display = "none";
    roleInput.style.display = "none";
    document.getElementById("passwordLabel").style.display = "none";
    passwordInput.style.display = "none";
    togglePassword.style.display = "none";

    editMode = true;
    editUserId = user.id;
    editRole = user.role.toLowerCase();
    oldEmail = user.email;
    nameInput.value = user.name;
    emailInput.value = user.email;
    formErrorName.innerText = "";
    formErrorRole.innerText = "";
    formErrorEmail.innerText = "";
    formErrorPassword.innerText = "";
    modalTitle.innerText = "Edit User";
    modalBtn.innerText = "Update User";
    userModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    userModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    userModal.style.display = "none";
});

addUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const role = roleInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    formErrorName.innerText = "";
    formErrorRole.innerText = "";
    formErrorEmail.innerText = "";
    formErrorPassword.innerText = "";

    if (!name) {
        formErrorName.innerText = "Full name is required";
        return;
    }

    if (name.length < 3) {
        formErrorName.innerText = "Name must be at least 3 characters";
        return;
    }

    if (!editMode) {
        if (!role) {
            formErrorRole.innerText = "Role is required";
            return;
        }

        const validRoles = ["admin", "instructor", "student"];
        if (!validRoles.includes(role.toLowerCase())) {
            formErrorRole.innerText = "Invalid role";
            return;
        }
    }

    if (!email) {
        formErrorEmail.innerText = "Email is required";
        return;
    }
    const emailFormat = /^\S+@\S+\.\S+$/;
    if (!emailFormat.test(email)) {
        formErrorEmail.innerText = "Invalid email format";
        return;
    }

    const emailDomain = /^[A-Za-z0-9._%+-]+@cbsua\.edu\.ph$/i;
    if (!emailDomain.test(email)) {
        formErrorEmail.innerText = "Email must end with @cbsua.edu.ph";
        return;
    }

    if (!editMode) {
        if (!password) {
            formErrorPassword.innerText = "Password is required";
            return;
        }

        if (password.length < 8) {
            formErrorPassword.innerText = "Password must be at least 8 characters";
            return;
        }

        if (!/[A-Z]/.test(password)) {
            formErrorPassword.innerText = "Must contain at least one uppercase letter";
            return;
        }

        if (!/[a-z]/.test(password)) {
            formErrorPassword.innerText = "Must contain at least one lowercase letter";
            return;
        }

        if (!/[0-9]/.test(password)) {
            formErrorPassword.innerText = "Must contain at least one number";
            return;
        }

        if (!/[@$!%*?&]/.test(password)) {
            formErrorPassword.innerText = "Must contain at least one special character";
            return;
        }
    }

    modalBtn.disabled = true;
    btnText.style.display = "none";
    loaderDisplay.style.display = 'flex';

    try {
        let url = `${API_URL}/users`;
        let method = "POST";
        if (editMode && editUserId && editRole) {
            url = `${API_URL}/users/${editRole}/${editUserId}`;
            method = "PUT";
        }

        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                editMode
                    ? { name, email, oldEmail }
                    : { name, role, email, password }
            )
        });

        const data = await res.json();
        if (!res.ok) {
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode ? "User updated successfully!" : "User added successfully!");
        }
        userModal.style.display = "none";
        fetchUsers();
    } catch (err) {
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        modalBtn.disabled = false;
        btnText.style.display = "inline";
    }
});

userModal.addEventListener("click", (e) => {
    if (e.target === userModal) {
        userModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();

    users = fullUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(term);
        const roleMatch = (user.role || "").toLowerCase().includes(term);
        const emailMatch = (user.email || "").toLowerCase().includes(term);
        return nameMatch || roleMatch || emailMatch;
    });

    currentPage = 1;
    renderTable();
});

fetchUsers();