window.addEventListener("resize", () => {
    renderTable();
});

let rooms = [];
let fullRooms = [];
let activeSemester = null;

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");

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

        const encodedName = encodeURIComponent(room.room_name);
        let dataToPass = `roomId=${room.room_id}&roomName=${encodedName}`;

        if (activeSemester) {
            Object.keys(activeSemester).forEach(key => {
                dataToPass += `&${encodeURIComponent(key)}=${encodeURIComponent(activeSemester[key])}`;
            });
        }
        
        tr.addEventListener("click", () => {
                window.location.href=`InstructorViewRoomDetail.html?${dataToPass}`;
        });

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    rooms = fullRooms.filter(room => 
        room.room_name.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
});