window.addEventListener("resize", () => {
    renderTable();
    if(equipmentQueueSwitch) {
        renderEquipmentQueueModal();
    }
});

let equipments = [];
let fullEquipments = [];
let equipmentQueue = [];
let selectedEquipmentName = "";
let equipmentQueueSwitch = false;

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const addButton = document.getElementById("addButton");
const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const equipmentModal = document.getElementById("equipmentModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");

const addEquipmentForm = document.getElementById("addEquipmentForm");
const equipmentNameInput = document.getElementById("equipmentName");
const equipmentDescriptionInput = document.getElementById("equipmentDescription");
const equipmentStatusInput = document.getElementById("equipmentStatus");
const formErrorEquipmentName = document.getElementById("formErrorEquipmentName");
const formErrorEquipmentDescription = document.getElementById("formErrorEquipmentDescription");
const formErrorEquipmentStatus = document.getElementById("formErrorEquipmentStatus");

let editMode = false;
let editEquipmentId = null;

function fTime(timeStr){
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
}

async function fetchEquipments() {
    loaderDisplay.style.display = 'flex';
    try {
        const equipmentRes = await secureFetch(`${API_URL}/equipments`);
        if(equipmentRes.ok){
            equipments = await equipmentRes.json();
            fullEquipments = [...equipments];
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
    const totalItems = equipments.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedEquipments = equipments.slice(start, end);

    paginatedEquipments.forEach(equipment => {
        const tr = document.createElement("tr");
        let statusClass = equipment.equipment_status.toLowerCase();
        if(statusClass === 'out of service'){
            statusClass = "outOfService";
        }

        if (isMobile) {
            const tdCombined = document.createElement("td");
            tdCombined.innerHTML = `
                <div class="data-cell">
                    <strong>${equipment.equipment_name}</strong><br>
                    <small>
                        ${equipment.equipment_desc}<br>
                        <span class="status-badge ${statusClass}">${equipment.equipment_status}</span>
                    <small>
                </div>    
            `;
            tr.appendChild(tdCombined);
        } else {
            const tdName = document.createElement("td");
            tdName.innerText = equipment.equipment_name;
            tr.appendChild(tdName);

            const tdDesc = document.createElement("td");
            tdDesc.innerText = equipment.equipment_desc;
            tr.appendChild(tdDesc);

            const tdStatus = document.createElement("td");
            const theStatus = document.createElement("p");
            theStatus.innerText = equipment.equipment_status;
            theStatus.classList.add("status-badge");
            theStatus.classList.add(statusClass);
            tdStatus.appendChild(theStatus);
            tr.appendChild(tdStatus);
        }

        const tdAction = document.createElement("td");
        tdAction.classList.add("fourthColumn");

        const queueBtn = document.createElement("button");
        queueBtn.innerHTML = '<i class="fa fa-tasks"></i>';
        queueBtn.title = "today's queue";
        queueBtn.style.marginRight = '10px';
        queueBtn.classList.add("editButton");
        queueBtn.addEventListener("click", () => {
            selectedEquipmentName = equipment.equipment_name;
            fetchEquipmentQueue(equipment.equipment_id);
        });

        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.title = 'edit';
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(equipment);
        });

        tdAction.appendChild(queueBtn);
        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);
        
        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

async function fetchEquipmentQueue(equipmentId) {
    loaderDisplay.style.display = 'flex';
    try {
        const equipmentQueueRes = await secureFetch(`${API_URL}/equipments/${equipmentId}/queue`);
        if(equipmentQueueRes.ok){
            equipmentQueue = await equipmentQueueRes.json();
            renderEquipmentQueueModal();
        }
    } catch(err){
        console.error("Error fetching data:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

function renderEquipmentQueueModal() {
    const equipmentQueueModalTitle = document.getElementById("equipmentQueueModalTitle");
    equipmentQueueModalTitle.textContent = selectedEquipmentName;
    const equipmentQueueDataTableBody = document.getElementById("equipmentQueueDataTableBody");
    equipmentQueueDataTableBody.innerHTML = "";
    const isMobile = window.innerWidth < 768;

    if(equipmentQueue?.length === 0){
        showFeedback("", selectedEquipmentName, "No waitlist for this item.");
        return;
    }
    equipmentQueue.forEach(equipmentQueueData => {
        const tr = document.createElement("tr");

        if (isMobile) {
             const tdCombined = document.createElement("td");

            tdCombined.innerHTML = `
                <div class="equipmentQueueMobile">
                    <span>${equipmentQueueData.borrower_name} (${equipmentQueueData.borrower_role})</span>
                    <span>${fTime(equipmentQueueData.start_time)} - ${fTime(equipmentQueueData.end_time)}</span>
                    <span class="status-badge ${equipmentQueueData.status}">${equipmentQueueData.status}</span>
                </div>
            `;

            tr.appendChild(tdCombined);
        } else {
            const tdName = document.createElement("td");
            tdName.innerText = `${equipmentQueueData.borrower_name} (${equipmentQueueData.borrower_role})`;
            tr.appendChild(tdName);

            const tdTime = document.createElement("td");
            tdTime.innerText = `${fTime(equipmentQueueData.start_time)} - ${fTime(equipmentQueueData.end_time)}`;
            tr.appendChild(tdTime);

            const tdStatus = document.createElement("td");
            const theStatus = document.createElement("p");
            theStatus.innerText = equipmentQueueData.status;
            theStatus.classList.add("status-badge");
            theStatus.classList.add(equipmentQueueData.status);
            tdStatus.appendChild(theStatus);
            tr.appendChild(tdStatus);
        }

        const tdAction = document.createElement("td");
        tdAction.classList.add("fourthColumn");

        if(equipmentQueueData.status === "approved"){ 
            const borrowBtn = document.createElement("button");
            borrowBtn.setAttribute('id','borrowBtn');
            borrowBtn.classList.add("editButton");
            borrowBtn.textContent = "Borrow";
            borrowBtn.onclick = () => handleAction(equipmentQueueData, "borrowed");
            tdAction.appendChild(borrowBtn);
        } else if(equipmentQueueData.status === "borrowed"){
            const returnBtn = document.createElement("button");
            returnBtn.setAttribute('id','returnBtn');
            returnBtn.classList.add("editButton");
            returnBtn.textContent = "Return";
            returnBtn.onclick = () => handleAction(equipmentQueueData, "returned");
            tdAction.appendChild(returnBtn);
        } 
        
        tr.appendChild(tdAction);

        equipmentQueueDataTableBody.appendChild(tr);
    });
    equipmentQueueSwitch = true;
    document.getElementById("equipmentQueueModal").style.display = "flex";
}

document.getElementById("closeEquipmentQueueModal").addEventListener("click", () => {
    equipmentQueueSwitch = false;
    document.getElementById("equipmentQueueModal").style.display = "none";
});

async function handleAction(item, action){
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/equipment-reservations/${item.equipment_reservation_id}/${action}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                adminName: CURRENT_USER_NAME,
                equipment_name: item.equipment_name,
                equipment_reservation_type: action,
                equipment_reservation_user_type: item.borrower_role,
                equipment_reservation_reference_id: item.equipment_reservation_reference_id,
                equipment_reservation_user_name: item.borrower_name,
                equipment_reservation_date: item.equipment_reservation_date,
                equipment_reservation_start_time: item.start_time,
                equipment_reservation_end_time: item.end_time,
            })
        });

        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success!", data.message || `Reservation ${action} successful`);
        } else {
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        document.getElementById("equipmentQueueModal").style.display = "none";
    } catch (err) {
        console.error("Error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

addButton.addEventListener("click", () => {
    editMode = false;
    editEquipmentId = null;
    equipmentNameInput.value = "";
    equipmentDescriptionInput.value = "";
    equipmentStatusInput.value = "";
    formErrorEquipmentName.innerText = "";
    formErrorEquipmentDescription.innerText = "";
    formErrorEquipmentStatus.innerText = "";
    modalTitle.innerText = "Add Equipment";
    modalBtn.innerText = "Add Equipment";
    equipmentModal.style.display = "flex";
});

function openEditModal(equipment){
    editMode = true;
    editEquipmentId = equipment.equipment_id;
    equipmentNameInput.value = equipment.equipment_name;
    equipmentDescriptionInput.value = equipment.equipment_desc;
    equipmentStatusInput.value = equipment.equipment_status;
    formErrorEquipmentName.innerText = "";
    formErrorEquipmentDescription.innerText = "";
    formErrorEquipmentStatus.innerText = "";
    modalTitle.innerText = "Edit Equipment";
    modalBtn.innerText = "Update Equipment";
    equipmentModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    equipmentModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    equipmentModal.style.display = "none";
});

addEquipmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const equipmentName = equipmentNameInput.value.trim();
    const equipmentDescription = equipmentDescriptionInput.value.trim();
    const equipmentStatus = equipmentStatusInput.value;

    formErrorEquipmentName.innerText = "";
    formErrorEquipmentDescription.innerText = "";
    formErrorEquipmentStatus.innerText = "";

    if(equipmentName.length < 3){
        formErrorEquipmentName.innerText = "Equipment name must be at least 3 characters";
        return;
    }

    if(equipmentDescription.length < 10){
        formErrorEquipmentDescription.innerText = "Equipment desciption must be at least 10 characters";
        return;
    }

    if (!equipmentStatus) {
        formErrorEquipmentStatus.innerText = "Please select a status";
        return;
    }

    loaderDisplay.style.display = 'flex';
    modalBtn.disabled = true;
    btnText.style.display = "none";

    try {
        let url = `${API_URL}/equipments`;
        let method = "POST";
        if(editMode && editEquipmentId){
            url = `${API_URL}/equipments/${editEquipmentId}`;
            method = "PUT";
        }
        
        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ equipmentName, equipmentDescription, equipmentStatus })
        });

        const data = await res.json();
        if(!res.ok){
            showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode ? "Equipment updated successfully!" : "Equipment added successfully!");
        }
        equipmentModal.style.display = "none";
        fetchEquipments();
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        modalBtn.disabled = false;
        btnText.style.display = "inline";
    }
});

equipmentModal.addEventListener("click", (e) => {
    if(e.target === equipmentModal){
        equipmentModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    
    equipments = fullEquipments.filter(equipment => {
        const nameMatch = equipment.equipment_name.toLowerCase().includes(term);
        const descMatch = (equipment.equipment_desc || "").toLowerCase().includes(term);
        return nameMatch || descMatch;
    });

    currentPage = 1;
    renderTable();
});