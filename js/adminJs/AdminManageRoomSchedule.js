const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const roomName = urlParams.get("roomName");
const semesterData = {};
urlParams.forEach((value, key) => {
    if (key !== "roomId" && key !== "roomName") {
        semesterData[key] = value;
    }
});

const encodedName = encodeURIComponent(roomName);
let dataToPass = `roomId=${roomId}&roomName=${encodedName}`;

if (semesterData) {
    Object.keys(semesterData).forEach(key => {
        dataToPass += `&${encodeURIComponent(key)}=${encodeURIComponent(semesterData[key])}`;
    });
}

const backButton = document.getElementById("backButton");
backButton.addEventListener("click", () => {
    window.location.href=`AdminManageRoomDetail.html?${dataToPass}`;
});

let schedules = [];
let fullSchedules = [];
let selectedSchedules = [];

const loaderDisplay = document.getElementById("loaderDisplay");
const dataTableBody = document.getElementById("dataTableBody");
const searchInput = document.getElementById("searchInput");
const selectAllCheckbox = document.getElementById("selectAll");
const deleteButton = document.getElementById("deleteButton");
const addButton = document.getElementById("addButton");

const modalTitle = document.getElementById("modalTitle");
const modalBtn = document.getElementById("modalBtn");
const scheduleModal = document.getElementById("scheduleModal");
const closeModal = document.getElementById("closeModal");
const closeModal2 = document.getElementById("closeModal2");
const addScheduleForm = document.getElementById("addScheduleForm");
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
let selectedDays = [];
let editMode = false;
let editScheduleId = null;

const daysContainer = document.getElementById("daysContainer");
days.forEach(d => {
    const btn = document.createElement("div");
    btn.className = "day-btn";
    btn.innerText = d;
    btn.onclick = () => {
        if (selectedDays.includes(d)) {
            selectedDays = selectedDays.filter(x => x !== d);
            btn.classList.remove("selected");
        } else {
            selectedDays.push(d);
            btn.classList.add("selected");
        }
    };
    daysContainer.appendChild(btn);
});

const fTime = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
};

async function loadData() {
    loaderDisplay.style.display = 'flex';
    try {
        const [subRes, instRes, ysRes] = await Promise.all([
        secureFetch(`${API_URL}/subjects`),
        secureFetch(`${API_URL}/users/instructors`),
        secureFetch(`${API_URL}/year-sections`),
        ]);
        const subjects = await subRes.json();
        const instructors = await instRes.json();
        const yearSections = await ysRes.json();

        const subjectSelect = document.getElementById("subject");
        subjects.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s.subject_id}">${s.subject_code}</option>`;
        });

        const instructorSelect = document.getElementById("instructor");
        instructors.forEach(i => {
        instructorSelect.innerHTML += `<option value="${i.instructor_id}">${i.instructor_name}</option>`;
        });

        const ysSelect = document.getElementById("yearSection");
        yearSections.forEach(ys => {
        ysSelect.innerHTML += `<option value="${ys.year_section_id}">${ys.year_section_name}</option>`;
        });
    } catch (err) {
        console.error("Error loading data:", err);
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

loadData();

async function fetchSchedules() {
    loaderDisplay.style.display = 'flex';
    try {
        const schedRes = await secureFetch(`${API_URL}/schedules/roomsched/${roomId}`);
        if(schedRes.ok){
            schedules = await schedRes.json();
            fullSchedules = [...schedules];
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

    const totalItems = schedules.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedSchedules = schedules.slice(start, end);

    paginatedSchedules.forEach(schedule => {
        const tr = document.createElement("tr");

        if (isMobile) {
            const tdCombined = document.createElement("td");

            tdCombined.innerHTML = `
                <div class="data-cell">
                    ${schedule.subject+" ("+schedule.year_section+")"}<br>
                    ${schedule.instructor}<br>
                    ${schedule.days}<br>
                    ${fTime(schedule.schedule_start_time)} -    
                    ${fTime(schedule.schedule_end_time)}
                </div>
            `;

            tr.appendChild(tdCombined);
        } else {
            document.getElementById("firstColumn").innerText = "Subject Code";

            const subjectCode = document.createElement("td");
            subjectCode.innerText = schedule.subject;
            tr.appendChild(subjectCode);

            const instructorName = document.createElement("td");
            instructorName.innerText = schedule.instructor;
            tr.appendChild(instructorName);

            const yearSection = document.createElement("td");
            yearSection.innerText = schedule.year_section;
            tr.appendChild(yearSection);

            const days = document.createElement("td");
            days.innerText = schedule.days.join(", ");
            tr.appendChild(days);

            const time = document.createElement("td");
            time.innerText = fTime(schedule.schedule_start_time)+" - "+ fTime(schedule.schedule_end_time);
            tr.appendChild(time);
        }

        const tdAction = document.createElement("td");
        tdAction.classList.add("sixthColumn");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
        editBtn.classList.add("editButton");
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditModal(schedule);
        });
        tdAction.appendChild(editBtn);
        tr.appendChild(tdAction);
        dataTableBody.appendChild(tr);
    });

    updatePaginationUI(totalItems, totalPages);
}

addButton.addEventListener("click", () => {
    modalTitle.innerText = "Add Schedule";
    modalBtn.innerText = "Add Schedule";
    addScheduleForm.reset();
    selectedDays = [];
    document.querySelectorAll(".day-btn").forEach(d => d.classList.remove("selected"));
    scheduleModal.style.display = "flex";
});

function openEditModal(schedule){
    editMode = true;
    editScheduleId = schedule.schedule_id;
    document.getElementById("subject").value = schedule.subject_id;
    document.getElementById("instructor").value = schedule.instructor_id;
    document.getElementById("yearSection").value = schedule.year_section_id;
    document.getElementById("startTime").value = schedule.schedule_start_time;
    document.getElementById("endTime").value = schedule.schedule_end_time;
    
    selectedDays = schedule.days || [];

    document.querySelectorAll(".day-btn").forEach(btn => {
        btn.classList.toggle("selected", selectedDays.includes(btn.innerText));
    });

    formErrorSubjectCode.innerText = "";
    formErrorInstructor.innerText = "";
    formErrorYearSection.innerText = "";
    formErrorDays.innerText = "";
    formErrorStartTime.innerText = "";
    formErrorEndTime.innerText = "";
    modalTitle.innerText = "Edit Schedule";
    modalBtn.innerText = "Update Schedule";
    scheduleModal.style.display = "flex";
}

closeModal.addEventListener("click", () => {
    scheduleModal.style.display = "none";
});

closeModal2.addEventListener("click", () => {
    scheduleModal.style.display = "none";
});

addScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = document.getElementById("subject").value;
    const instructor = document.getElementById("instructor").value;
    const yearSection = document.getElementById("yearSection").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));

    let hasError = false;

    if (!subject) {
        formErrorSubjectCode.textContent = "Please select a subject.";
        hasError = true;
    }

    if (!instructor) {
        formErrorInstructor.textContent = "Please select an instructor.";
        hasError = true;
    }

    if (!yearSection) {
        formErrorYearSection.textContent = "Please select year & section.";
        hasError = true;
    }

    if (selectedDays.length === 0) {
        formErrorDays.textContent = "Select at least one day.";
        hasError = true;
    }

    if (!startTime) {
        formErrorStartTime.textContent = "Start time required.";
        hasError = true;
    }

    if (!endTime) {
        formErrorEndTime.textContent = "End time required.";
        hasError = true;
    }

    if (startTime >= endTime) {
        formErrorEndTime.textContent = "End time must be later.";
        hasError = true;
    }

    if (hasError) return;

    const payload = {
        room_id: roomId,
        sem_id: semesterData.sem_id,
        subject_id: subject,
        instructor_id: instructor,
        year_section_id: yearSection,
        schedule_start_time: startTime,
        schedule_end_time: endTime,
        days: selectedDays,
    };

    loaderDisplay.style.display = 'flex';

    try {
        const url = editMode 
            ? `${API_URL}/schedules/${editScheduleId}` 
            : `${API_URL}/schedules`;

        const method = editMode ? "PUT" : "POST";
        const res = await secureFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if(!res.ok){
            showFeedback("error", "Failed", data.message || "Failed to save schedule");
        } else {;
            showFeedback(
                "success",
                "Success",
                editMode ? "Schedule updated successfully!" : "Schedule added successfully!"
            );
        }
        scheduleModal.style.display = "none";
        fetchSchedules();
    } catch(err){
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
});

scheduleModal.addEventListener("click", (e) => {
    if(e.target === scheduleModal){
        scheduleModal.style.display = "none";
    }
});

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    schedules = fullSchedules.filter(schedule => 
        schedule.subject_code.toLowerCase().includes(term)
    );
    currentPage = 1;
    renderTable();
});

window.addEventListener("resize", () => {
    renderTable();
});