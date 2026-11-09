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
const equipmentModal = document.getElementById("equipmentModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const ReserveEquipmentForm = document.getElementById("ReserveEquipmentForm");
let equipmentId = null;
const equipmentNameInput = document.getElementById("equipmentName");
const equipmentStartTimeInput = document.getElementById("startTime"); 
const equipmentEndTimeInput = document.getElementById("endTime");
const formErrorStartTime = document.getElementById("formErrorStartTime");
const formErrorEndTime = document.getElementById("formErrorEndTime");

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
                <div class="equipmentQueueMobile">
                    <strong>${equipment.equipment_name}</strong>
                    <span>${equipment.equipment_desc}</span>
                    <span class="status-badge ${statusClass}">${equipment.equipment_status}</span>
                </div>
            `;

            tr.appendChild(tdCombined);

        } else {

            const tdName = document.createElement("td");
            tdName.innerText = equipment.equipment_name;
            tr.appendChild(tdName);

            const tdTime = document.createElement("td");
            tdTime.innerText = equipment.equipment_desc;
            tr.appendChild(tdTime);

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

        if(equipment.equipment_status === "available"){
            const editBtn = document.createElement("button");
            editBtn.innerHTML = '<i class="fa-solid fa-book"></i>';
            editBtn.classList.add("editButton");
            editBtn.title = "reserve";
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openReserveModal(equipment);
            });

            tdAction.appendChild(queueBtn);
            tdAction.appendChild(editBtn);
        }
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

        if(equipmentQueueData.borrower_role === CURRENT_USER_ROLE && equipmentQueueData.equipment_reservation_reference_id === CURRENT_USER_ID) {
            if(equipmentQueueData.status === "approved"){
                const cancelBtn = document.createElement("button");
                cancelBtn.innerHTML = 'Cancel';
                cancelBtn.classList.add("editButton");
                cancelBtn.title = "cancel";
                cancelBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    handleAction(equipmentQueueData, "cancelled");
                });

                tdAction.appendChild(cancelBtn);
            }
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
                equipment_name: item.equipment_name,
                equipment_reservation_type: action,
                equipment_reservation_user_type: item.borrower_role,
                equipment_reservation_reference_id: item.equipment_reservation_reference_id,
                equipment_reservation_user_name: item.borrower_name,
                equipment_reservation_date: item.equipment_reservation_date,
                equipment_reservation_start_time: item.start_time,
                equipment_reservation_end_time: item.end_time
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

function openReserveModal(equipment){
    equipmentId = equipment.equipment_id;
    equipmentNameInput.value = equipment.equipment_name;
    equipmentStartTimeInput.value = "";
    equipmentEndTimeInput.value = "";
    formErrorStartTime.innerText = "";
    formErrorEndTime.innerText = "";
    equipmentModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    equipmentModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    equipmentModal.style.display = "none";
});

function getFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
}

ReserveEquipmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const start = equipmentStartTimeInput.value;
    const end = equipmentEndTimeInput.value;

    formErrorStartTime.innerText = "";
    formErrorEndTime.innerText = "";

    const toMinutes = t => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };

    const MIN_TIME = toMinutes("07:30");
    const MAX_TIME = toMinutes("17:00");

    if (!start || !end) {
        formErrorStartTime.innerText = "Start and end time are required.";
        return;
    }

    const startMin = toMinutes(start);
    const endMin = toMinutes(end);

    if (startMin < MIN_TIME || startMin > MAX_TIME) {
        formErrorStartTime.innerText = "Start time must be between 7:30 AM and 5:00 PM.";
        return;
    }

    if (endMin < MIN_TIME || endMin > MAX_TIME) {
        formErrorEndTime.innerText = "End time must be between 7:30 AM and 5:00 PM.";
        return;
    }

    if (endMin <= startMin) {
        formErrorEndTime.innerText = "End time must be later than start time.";
        return;
    }

    submitReservation();
    
});

async function submitReservation() {
    loaderDisplay.style.display = 'flex';
    const equipment_id = equipmentId;
    const equipment_name = document.getElementById("equipmentName").value;
    const equipment_reservation_reference_id = CURRENT_USER_ID;
    const equipment_reservation_user_type = CURRENT_USER_ROLE;
    const equipment_reservation_date = new Date();
    equipment_reservation_date.setHours(equipment_reservation_date.getHours() + 8)
    const equipment_reservation_start_time = document.getElementById("startTime").value;
    const equipment_reservation_end_time = document.getElementById("endTime").value;
    const current_user_name = CURRENT_USER_NAME;
    try {
        const res = await secureFetch(`${API_URL}/equipment-reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ equipment_id, equipment_name, equipment_reservation_user_type, 
                equipment_reservation_reference_id, equipment_reservation_date, 
                equipment_reservation_start_time, equipment_reservation_end_time,
                current_user_name
                })
        });
        const data = await res.json();
        if(!res.ok){
            showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", "Equipment added successfully!");
        }
        equipmentModal.style.display = "none";
        fetchEquipments();
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

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