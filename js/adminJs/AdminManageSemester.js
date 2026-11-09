window.addEventListener("resize", () => {
    renderTable();
});

let semesters = [];
let fullSemesters = [];

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const selectAllCheckbox = document.getElementById("selectAll");
const deleteButton = document.getElementById("deleteButton");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const btnText = document.querySelector(".btn-text");
const semesterModal = document.getElementById("semesterModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addSemesterForm = document.getElementById("addSemesterForm");
const semesterInput = document.getElementById("semester");
const schoolYearInput = document.getElementById("schoolYear");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const formErrorSemester = document.getElementById("formErrorSemester");
const formErrorSchoolYear = document.getElementById("formErrorSchoolYear");
const formErrorStartDate = document.getElementById("formErrorStartDate");
const formErrorEndDate = document.getElementById("formErrorEndDate");

let editMode = false;
let editSemesterId = null;

function formatDate(date){
    if(!date) return '';
    const d = new Date(date);
    if(isNaN(d)) return date;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(d);
    return formattedDate;
}

async function fetchSemesters() {
    loaderDisplay.style.display = 'flex';
    try {
        const semRes = await secureFetch(`${API_URL}/sem`);
        if(semRes.ok){
            semesters = await semRes.json();
            fullSemesters = [...semesters];
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

    const totalItems = semesters.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedSemesters = semesters.slice(start, end);

    paginatedSemesters.forEach(semester => {
        const tr = document.createElement("tr");

        if (isMobile) {
            const tdCombined = document.createElement("td");

            tdCombined.innerHTML = `
                <div class="data-cell">${semester.sem_semester}<br>
                    ${semester.sem_school_year}<br>
                    <small>
                        ${formatDate(semester.sem_start_date)}<br>
                        ${formatDate(semester.sem_end_date)}
                    <small>
                </div>    
            `;

            tr.appendChild(tdCombined);

        } else {
            const tdSemester = document.createElement("td");
            tdSemester.innerText = semester.sem_semester;
            tr.appendChild(tdSemester);

            const tdSchoolYear = document.createElement("td");
            tdSchoolYear.innerText = semester.sem_school_year;
            tr.appendChild(tdSchoolYear);

            const tdStartDate = document.createElement("td");
            tdStartDate.innerText = formatDate(semester.sem_start_date);
            tr.appendChild(tdStartDate);

            const tdEndDate = document.createElement("td");
            tdEndDate.innerText = formatDate(semester.sem_end_date);
            tr.appendChild(tdEndDate);

            
        }
        const tdStatus = document.createElement("td");
        let setBtn = document.createElement("button");
        if(semester.sem_active) {
            setBtn.innerText = "Active";
            setBtn.disabled = true;
            setBtn.classList.add("semBtn", "semActive");
            setBtn.style.cursor='default';
        }else{
            setBtn.innerText = "Set Active";
            setBtn.classList.add("semBtn","semSetActive");
            setBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                setActiveFunction(semester.sem_id);
            });
        }
        tdStatus.appendChild(setBtn);
        tr.appendChild(tdStatus);

        const tdAction = document.createElement("td");
        tdAction.classList.add("lastColumn", "data-cell");
        tdAction.style.whiteSpace='nowrap';

        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.title = "Edit"
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(semester);
        });

        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);

        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

function setActiveFunction(id){
    openConfirmModal('semSetActive', 'Set active semester', 'Are you sure to set this semester as active?', 'Set Active', id);
}

async function setActive(id){
    loaderDisplay.style.display = 'flex';
    try{
        const res = await secureFetch(`${API_URL}/sem/${id}/setActive`, { method: 'PUT' });
        const data = await res.json().catch(()=>({}));
        if(!res.ok) {
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        }else{
            showFeedback("success", "Success!", "Set semester active successfully!");
        }
        await fetchSemesters();
    }catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

addButton.addEventListener("click", () => {
    editMode = false;
    editSemesterId = null;
    semesterInput.value = "";
    schoolYearInput.value = "";
    startDateInput.value = "";
    endDateInput.value = "";
    formErrorSemester.innerText = "";
    formErrorSchoolYear.innerText = "";
    formErrorStartDate.innerText = "";
    formErrorEndDate.innerText = "";
    modalTitle.innerText = "Add Semester";
    modalBtn.innerText = "Add Semester";
    semesterModal.style.display = "flex";
});

function openEditModal(semester){
    editMode = true;
    editSemesterId = semester.sem_id;
    semesterInput.value = semester.sem_semester;
    schoolYearInput.value = semester.sem_school_year;
    startDateInput.value = semester.sem_start_date ? (new Date(semester.sem_start_date).toISOString().slice(0,10)) : '';
    endDateInput.value = semester.sem_end_date ? (new Date(semester.sem_end_date).toISOString().slice(0,10)) : '';
    formErrorSemester.innerText = "";
    formErrorSchoolYear.innerText = "";
    formErrorStartDate.innerText = "";
    formErrorEndDate.innerText = "";
    modalTitle.innerText = "Edit Semester";
    modalBtn.innerText = "Update Semester";
    semesterModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    semesterModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    semesterModal.style.display = "none";
});

addSemesterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const semester = semesterInput.value.trim();
    const schoolYear = schoolYearInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    formErrorSemester.innerText = "";
    formErrorSchoolYear.innerText = "";
    formErrorStartDate.innerText = "";
    formErrorEndDate.innerText = "";

    if (!semester) {
        formErrorSemester.innerText = "Please select a semester";
        return;
    }

    if (!schoolYear) {
        formErrorSchoolYear.innerText = "Please set school year";
        return;
    }

    if (!startDate) {
        formErrorStartDate.innerText = "Please select start date";
        return;
    }

    if (!endDate) {
        formErrorEndDate.innerText = "Please select end date";
        return;
    }

    if(startDate && endDate && new Date(endDate) <= new Date(startDate)) {
        formErrorEndDate.innerText = "End must be after start";
        return;
    }

    loaderDisplay.style.display = 'flex';
    modalBtn.disabled = true;
    btnText.style.display = "none";

    try {
        let url = `${API_URL}/sem`;
        let method = "POST";
        if(editMode && editSemesterId){
            url = `${API_URL}/sem/${editSemesterId}`;
            method = "PUT";
        }

        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semester, schoolYear, startDate, endDate })
        });
        const data = await res.json();
        if(!res.ok){
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        } else {
            showFeedback("success", "Success!", editMode? "Semester updated successfully!" : "Semester added successfully!");
        }
        semesterModal.style.display = "none";
        fetchSemesters();
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        modalBtn.disabled = false;
        btnText.style.display = "inline";
    }
});

semesterModal.addEventListener("click", (e) => {
    if(e.target === semesterModal){
        semesterModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    
    semesters = fullSemesters.filter(semester => {
        const semMatch = semester.sem_semester.toLowerCase().includes(term);
        const schoolYearMatch = (semester.sem_school_year || "").toLowerCase().includes(term);
        const startYearMatch = (semester.sem_start_date || "").toLowerCase().includes(term);
        const endYearMatch = (semester.sem_end_date || "").toLowerCase().includes(term);
        return semMatch || schoolYearMatch || startYearMatch || endYearMatch;
    });

    currentPage = 1;
    renderTable();
});