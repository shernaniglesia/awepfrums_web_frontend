let fullData = [];
let filteredData = [];

const loaderDisplay = document.getElementById("loaderDisplay");
const tbody = document.getElementById("dataTableBody");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");
const searchInput = document.getElementById("searchInput");

statusFilter.addEventListener("change", () => { currentPage = 1; applyFilters(); });
dateFilter.addEventListener("change", () => { currentPage = 1; applyFilters(); });
searchInput.addEventListener("input", () => { currentPage = 1; applyFilters(); });
window.addEventListener("resize", renderTable);

function fTime(timeStr){
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
}

function formatDate(date){
    if(!date) return '';
    const d = new Date(date);
    if(isNaN(d)) return date;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(d);
    return formattedDate;
}

function convertReservationCreatedAt(dateToConvert){
    return new Date(dateToConvert).toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function setDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${year}-${month}-${day}`;
    
    dateFilter.value = formattedToday;
}

function sameDate(itemDateStr, selectedDateStr) {
    if (!itemDateStr || !selectedDateStr) return false;

    const itemDate = new Date(itemDateStr);
    const [year, month, day] = selectedDateStr.split('-').map(Number);

    return itemDate.getFullYear() === year &&
        (itemDate.getMonth() + 1) === month &&
        itemDate.getDate() === day;
}

function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;

    filteredData = fullData.filter(item => {
        const matchesQuery =
            query === "" ||
            item.equipment_name.toLowerCase().includes(query) ||
            item.user_name.toLowerCase().includes(query) ||
            item.equipment_reservation_status.toLowerCase().includes(query);

        const matchesStatus =
            selectedStatus === "all" ||
            item.equipment_reservation_status.toLowerCase() === selectedStatus.toLowerCase();

        const matchesDate = selectedDate === "" || 
            sameDate(item.equipment_reservation_date, selectedDate);

        return matchesQuery && matchesStatus && matchesDate;
    });
    renderTable(filteredData);
}

function renderTable() {
    tbody.innerHTML = "";
    const isMobile = window.innerWidth < 830;

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = filteredData.slice(start, end);

    paginatedData.forEach(item => {
        let tr = document.createElement("tr");
        const statusClass = item.equipment_reservation_status.toLowerCase();
        tr.innerHTML = isMobile ? `
            <td class="firstColumn">
                <div class="tableData">
                    <span>Equipment: ${item.equipment_name}</span>
                    <span>Request by: ${item.user_name}</span>
                    <span>Time: ${fTime(item.equipment_reservation_start_time)} - ${fTime(item.equipment_reservation_end_time)}</span>
                    <span>Date: ${convertReservationCreatedAt(item.equipment_reservation_created_at)}</span>
                    <span>Status: <span class="status-badge ${statusClass}">${item.equipment_reservation_status}</span></span>
                </div>
            </td>
            <td class="reservationActions"></td>
        ` : `
            <td class="firstColumn">${item.equipment_name}</td>
            <td class="secondColumn">${item.user_name}</td>
            <td class="thirdColumn">${fTime(item.equipment_reservation_start_time)} - ${fTime(item.equipment_reservation_end_time)}</td>
            <td class="fourthColumn">${convertReservationCreatedAt(item.equipment_reservation_created_at)}</td>
            <td class="fifthColumn"><span class="status-badge ${statusClass}">${item.equipment_reservation_status}</span></td>
            <td class="reservationActions"></td>
        `;
        const actionsCell = tr.querySelector(".reservationActions");
        actionsCell.style.whiteSpace='nowrap';

        if( item.equipment_reservation_status === "pending" &&
            item.equipment_reservation_status === "approved" &&
            item.user_name === CURRENT_USER_NAME &&
            item.equipment_reservation_user_type === CURRENT_USER_ROLE &&
            item.equipment_reservation_reference_id === CURRENT_USER_ID
        ){
            const cancelBtn = document.createElement("button");
            cancelBtn.setAttribute('id','cancelBtn');
            cancelBtn.classList.add("editButton");
            cancelBtn.innerHTML = 'Cancel';
            cancelBtn.onclick = () => handleAction(item, "cancelled");

            actionsCell.appendChild(cancelBtn);
        }
        
        tbody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

function updatePaginationUI(totalItems, totalPages) {
    document.getElementById("totalItems").innerText = totalItems;
    document.getElementById("startIndex").innerText = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    document.getElementById("endIndex").innerText = Math.min(currentPage * rowsPerPage, totalItems);

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };
        controls.appendChild(btn);
    }
}

async function fetchReservations(){
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/equipment-reservations/${CURRENT_USER_ROLE}/${CURRENT_USER_ID}`);
        fullData = await res.json();
        applyFilters(); 
    } catch (err) {
        console.error("Fetch error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

async function handleAction(item, action){
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/equipment-reservations/${item.equipment_reservation_id}/${action}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                equipment_name: item.equipment_name,
                equipment_reservation_type: action,
                equipment_reservation_user_type: item.equipment_reservation_user_type,
                equipment_reservation_reference_id: item.equipment_reservation_reference_id,
                equipment_reservation_user_name: item.user_name,
                equipment_reservation_date: item.equipment_reservation_date,
                equipment_reservation_start_time: item.equipment_reservation_start_time,
                equipment_reservation_end_time: item.equipment_reservation_end_time
            })
        });

        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success!", data.message || `Reservation ${action} successful`);
        } else {
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        fetchReservations();
    } catch (err) {
        console.error("Error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}