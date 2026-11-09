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

function convertReservationCreatedAt(dateToConvert) {
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
            item.room_name.toLowerCase().includes(query) ||
            item.instructor_name.toLowerCase().includes(query) ||
            item.subject_code.toLowerCase().includes(query);

        const matchesStatus =
            selectedStatus === "all" ||
            item.room_reservation_status.toLowerCase() === selectedStatus.toLowerCase();

        const matchesDate = selectedDate === "" || 
            sameDate(item.room_reservation_created_at, selectedDate);

        return matchesQuery && matchesStatus && matchesDate;
    });
    renderTable();
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
        const statusClass = item.room_reservation_status.toLowerCase();
        tr.innerHTML = isMobile ? `
            <td class="firstColumn">
                <div class="tableData">
                    <span>${item.room_name}</span>
                    <span>${item.instructor_name}</span>
                    <span>${item.subject_code}</span>
                    <span>${item.year_section_name}</span>
                    <span>${formatDate(item.room_reservation_date)}</span>
                    <span>${fTime(item.room_reservation_start_time)} - ${fTime(item.room_reservation_end_time)}</span>
                    <span>${convertReservationCreatedAt(item.room_reservation_created_at)}</span>
                    <span class="status-badge ${statusClass}">${item.room_reservation_status}</span>
                </div>
            </td>
            <td class="reservationActions"></td>
        ` : `
            <td class="firstColumn">${item.room_name}</td>
            <td class="secondColumn">${item.instructor_name}</td>
            <td class="thirdColumn">${item.subject_code}</td>
            <td class="fourthColumn">${item.year_section_name}</td>
            <td class="fifthColumn">${formatDate(item.room_reservation_date)}</td>
            <td class="sixthColumn">${fTime(item.room_reservation_start_time)} - ${fTime(item.room_reservation_end_time)}</td>
            <td class="seventhColumn">${convertReservationCreatedAt(item.room_reservation_created_at)}</td>
            <td class="eighthColumn"><span class="status-badge ${statusClass}">${item.room_reservation_status}</span></td>
            <td class="reservationActions"></td>
        `;
        
        const actionsCell = tr.querySelector(".reservationActions");
        if(item.room_reservation_status === "pending"){
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
        const res = await secureFetch(`${API_URL}/room-reservations/${CURRENT_USER_ID}`);
        fullData = await res.json();
        applyFilters(); 
    } catch (err) {
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

async function handleAction(item, action){
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(
            `${API_URL}/room-reservations/${item.room_reservation_id}/${action}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructorId: item.instructor_id,
                    instructorName: item.instructor_name,
                    roomName: item.room_name,
                    reservationDate: item.room_reservation_date,
                    startTime: item.room_reservation_start_time,
                    endTime: item.room_reservation_end_time
                })
            }
        );
        const data = await res.json();
        if(res.ok){
            showFeedback("success", "Success!", data.message);
        }else{
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        fetchReservations();

    } catch (err) {
        console.error("Action error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}