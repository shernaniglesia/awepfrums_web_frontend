searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    const rows = dataTableBody.querySelectorAll("tr");

    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
    
});

let currentPage = 1;
const rowsPerPage = 10;

function updatePaginationUI(totalItems, totalPages) {
    document.getElementById("totalItems").innerText = totalItems;
    document.getElementById("startIndex").innerText = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    document.getElementById("endIndex").innerText = Math.min(currentPage * rowsPerPage, totalItems);

    const controls = document.getElementById("paginationControls");
    controls.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.innerHTML = "&laquo;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderTable(); };
    controls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const btn = document.createElement("button");
            btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            btn.innerText = i;
            btn.onclick = () => { currentPage = i; renderTable(); };
            controls.appendChild(btn);
        }
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.innerHTML = "&raquo;";
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.onclick = () => { currentPage++; renderTable(); };
    controls.appendChild(nextBtn);
}