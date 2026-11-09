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
        const matchesQuery = query === "" || 
            item.room_reservation_log_action.toLowerCase().includes(query) ||
            convertReservationCreatedAt(item.created_at).toLowerCase().includes(query);

        const matchesStatus = selectedStatus === "all" || 
            item.room_reservation_log_type?.toLowerCase() === selectedStatus.toLowerCase();

        const matchesDate = selectedDate === "" || sameDate(item.created_at, selectedDate);

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
        tr.innerHTML = isMobile ? `
            <td class="firstColumn">
                ${item.room_reservation_log_action}<br>
                <small>Created at: ${convertReservationCreatedAt(item.created_at)}</small>
            </td>
        ` : `
            <td class="firstColumn">${item.room_reservation_log_action}</td>
            <td class="secondColumn">${convertReservationCreatedAt(item.created_at)}</td>
        `;
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

async function fetchReservationLogs() {
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/room-reservations/logs`);
        fullData = await res.json();
        applyFilters();
    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        loaderDisplay.style.display = 'none';
    }
}