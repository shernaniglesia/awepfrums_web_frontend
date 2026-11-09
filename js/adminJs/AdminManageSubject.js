window.addEventListener("resize", () => {
    renderTable();
});

let subjects = [];
let fullSubjects = [];

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const selectAllCheckbox = document.getElementById("selectAll");
const deleteButton = document.getElementById("deleteButton");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const subjectModal = document.getElementById("subjectModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addSubjectForm = document.getElementById("addSubjectForm");
const subjectCodeInput = document.getElementById("subjectCode");
const formErrorSubjectCode = document.getElementById("formErrorSubjectCode");

let editMode = false;
let editSubjectId = null;

async function fetchSubjects() {
    loaderDisplay.style.display = 'flex';
    try {
        const subjectRes = await secureFetch(`${API_URL}/subjects`);
        if(subjectRes.ok){
            subjects = await subjectRes.json();
            fullSubjects = [...subjects];
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

    const totalItems = subjects.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedSubjects = subjects.slice(start, end);

    paginatedSubjects.forEach(subject => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.innerText = subject.subject_code;
        tr.appendChild(tdName);

        const tdAction = document.createElement("td");
        tdAction.classList.add("secondColumn");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(subject);
        });
        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

addButton.addEventListener("click", () => {
    editMode = false;
    editSubjectId = null;
    subjectCodeInput.value = "";
    formErrorSubjectCode.innerText = "";
    modalTitle.innerText = "Add Subject";
    modalBtn.innerText = "Add Subject";
    subjectModal.style.display = "flex";
});

function openEditModal(subject){
    editMode = true;
    editSubjectId = subject.subject_id;
    subjectCodeInput.value = subject.subject_code;
    formErrorSubjectCode.innerText = "";
    modalTitle.innerText = "Edit Subject";
    modalBtn.innerText = "Update Subject";
    subjectModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    subjectModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    subjectModal.style.display = "none";
});

addSubjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subjectCode = subjectCodeInput.value.trim();
    if(subjectCode.length < 3){
        formErrorSubjectCode.innerText = "Subject code must be at least 3 characters";
        return;
    }

    loaderDisplay.style.display = 'flex';
    modalBtn.disabled = true;
    btnText.style.display = "none";

    try {
        let url = `${API_URL}/subjects`;
        let method = "POST";
        if(editMode && editSubjectId){
            url = `${API_URL}/subjects/${editSubjectId}`;
            method = "PUT";
        }

        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subjectCode })
        });
        const data = await res.json();
        if(!res.ok){
            showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode ? "Subject updated successfully!" : "Subject added successfully!");
            subjectModal.style.display = "none";
            fetchSubjects();
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

subjectModal.addEventListener("click", (e) => {
    if(e.target === subjectModal){
        subjectModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    subjects = fullSubjects.filter(subject => 
        subject.subject_code.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
});

fetchSubjects();