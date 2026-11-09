let rooms = [];
let fullRooms = [];
let activeSemester = null;

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const selectAllCheckbox = document.getElementById("selectAll");
const deleteButton = document.getElementById("deleteButton");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const roomModal = document.getElementById("roomModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addRoomForm = document.getElementById("addRoomForm");
const roomNameInput = document.getElementById("roomName");
const formErrorRoomName = document.getElementById("formErrorRoomName");

let editMode = false;
let editRoomId = null;

async function fetchRooms() {
    loaderDisplay.style.display = 'flex';
    try {
        const semRes = await secureFetch(`${API_URL}/sem/active`);
        if(semRes.ok){
            activeSemester = await semRes.json();
        } else {
            activeSemester = null;
        }

        const roomRes = await secureFetch(`${API_URL}/rooms`);
        if(roomRes.ok){
            rooms = await roomRes.json();
            fullRooms = [...rooms];
            renderTable();
        }

    } catch(err){
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

    const totalItems = rooms.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedRooms = rooms.slice(start, end);

    paginatedRooms.forEach(room => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.classList.add("firstColumn");
        tdName.innerText = room.room_name;
        tr.appendChild(tdName);

        const tdAction = document.createElement("td");
        tdAction.classList.add("secondColumn");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(room);
        });
        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);

        const encodedName = encodeURIComponent(room.room_name);
        let dataToPass = `roomId=${room.room_id}&roomName=${encodedName}`;

        if (activeSemester) {
            Object.keys(activeSemester).forEach(key => {
                dataToPass += `&${encodeURIComponent(key)}=${encodeURIComponent(activeSemester[key])}`;
            });
        }
        
        tr.addEventListener("click", () => {
                window.location.href=`AdminManageRoomDetail.html?${dataToPass}`;
        });

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

addButton.addEventListener("click", () => {
    editMode = false;
    editRoomId = null;
    roomNameInput.value = "";
    formErrorRoomName.innerText = "";
    modalTitle.innerText = "Add Room";
    modalBtn.innerText = "Add Room";
    roomModal.style.display = "flex";
});

function openEditModal(room){
    editMode = true;
    editRoomId = room.room_id;
    roomNameInput.value = room.room_name;
    formErrorRoomName.innerText = "";
    modalTitle.innerText = "Edit Room";
    modalBtn.innerText = "Update Room";
    roomModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    roomModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    roomModal.style.display = "none";
});


addRoomForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const roomName = roomNameInput.value.trim();
    if(roomName.length < 3){
        formErrorRoomName.innerText = "Room name must be at least 3 characters";
        return;
    }

    loaderDisplay.style.display = 'flex';
    modalBtn.disabled = true;
    btnText.style.display = "none";

    try {
        let url = `${API_URL}/rooms`;
        let method = "POST";
        if(editMode && editRoomId){
            url = `${API_URL}/rooms/${editRoomId}`;
            method = "PUT";
        }

        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName })
        });
        const data = await res.json();
        if(!res.ok){
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode? "Room updated successfully!" : "Room added successfully!");
            roomModal.style.display = "none";
            fetchRooms();
        }
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        modalBtn.disabled = false;
        btnText.style.display = "inline";
    }
});

roomModal.addEventListener("click", (e) => {
    if(e.target === roomModal){
        roomModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    rooms = fullRooms.filter(room => 
        room.room_name.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
});