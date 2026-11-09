window.addEventListener("resize", () => {
    renderTable();
});

let yearSections = [];
let fullYearSections= [];

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const selectAllCheckbox = document.getElementById("selectAll");
const deleteButton = document.getElementById("deleteButton");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const yearSectionModal = document.getElementById("yearSectionModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addYearSectionForm = document.getElementById("addYearSectionForm");
const yearSectionNameInput = document.getElementById("yearSectionName");
const formErrorYearSectionName = document.getElementById("formErrorYearSectionName");

let editMode = false;
let editYearSectionId = null;

async function fetchYearSections() {
    loaderDisplay.style.display = 'flex';
    try {
        const yearSectionRes = await secureFetch(`${API_URL}/year-sections`);
        if(yearSectionRes.ok){
            yearSections = await yearSectionRes.json();
            fullYearSections = [...yearSections];
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

    const totalItems = yearSections.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedYearSections = yearSections.slice(start, end);

    paginatedYearSections.forEach(yearSection => {
        const tr = document.createElement("tr");
        const tdName = document.createElement("td");
        tdName.innerText = yearSection.year_section_name;
        tr.appendChild(tdName);

        const tdAction = document.createElement("td");
        tdAction.classList.add("lastColumn");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(yearSection);
        });
        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

addButton.addEventListener("click", () => {
    editMode = false;
    editYearSectionId = null;
    yearSectionNameInput.value = "";
    formErrorYearSectionName.innerText = "";
    modalTitle.innerText = "Add Year and Section";
    modalBtn.innerText = "Add Year and Section";
    yearSectionModal.style.display = "flex";
});

function openEditModal(yearSection){
    editMode = true;
    editYearSectionId = yearSection.year_section_id;
    yearSectionNameInput.value = yearSection.year_section_name;
    formErrorYearSectionName.innerText = "";
    modalTitle.innerText = "Edit Year and Section";
    modalBtn.innerText = "Update Year and Section";
    yearSectionModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    yearSectionModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    yearSectionModal.style.display = "none";
});


addYearSectionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const yearSectionName = yearSectionNameInput.value.trim();
    if(yearSectionName.length < 2){
        formErrorYearSectionName.innerText = "Year and section name must be at least 2 characters";
        return;
    }

    loaderDisplay.style.display = 'flex';
    modalBtn.disabled = true;
    btnText.style.display = "none";

    try {
        let url = `${API_URL}/year-sections`;
        let method = "POST";
        if(editMode && editYearSectionId){
            url = `${API_URL}/year-sections/${editYearSectionId}`;
            method = "PUT";
        }

        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ yearSectionName })
        });
        const data = await res.json();
        if(!res.ok){
            showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode ? "Year and section updated successfully!" : "Year and section added successfully!");
            yearSectionModal.style.display = "none"; 
        }
        fetchYearSections();
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        modalBtn.disabled = false;
        btnText.style.display = "inline";
    }
});

yearSectionModal.addEventListener("click", (e) => {
    if(e.target === yearSectionModal){
        yearSectionModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    yearSections = fullYearSections.filter(yearSection => 
        yearSection.year_section_name.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
});