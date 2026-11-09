const loaderDisplay = document.getElementById("loaderDisplay");
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const roomName = urlParams.get("roomName");

const semesterData = {};
urlParams.forEach((value, key) => {
    if (key !== "roomId" && key !== "roomName") {
        semesterData[key] = value;
    }
});

if (!roomId || !roomName) {
    window.location.href = 'AdminManageRoom.html';
}

document.getElementById("mainHeader-title").innerText = "" + roomName + " - "
    + semesterData.sem_semester + ", SY: " +
    semesterData.sem_school_year;


const addDays = (d, days) => { let nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
const startOfWeek = (d) => { let nd = new Date(d); let day = nd.getDay(); let diff = (day === 0 ? -6 : 1) - day; return addDays(nd, diff); };
const endOfWeek = (d) => addDays(startOfWeek(d), 6);
const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
const isSameDay = (a, b) => a.toDateString() === b.toDateString();

const semesterStart = new Date(semesterData.sem_start_date);
const semesterEnd = new Date(semesterData.sem_end_date);

let today = new Date();
let weekStart = startOfWeek(today);
let events = [];
let selectedEvent = null;

function formatDates(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d)) return date;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(d);
    return formattedDate;
}

function formatTime12(hour, minute) {
    let suffix = hour >= 12 ? "PM" : "AM";
    let h = hour % 12 || 12;
    return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function fTime(timeStr) {
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
}

function getSubjectColor(type) {
    return type === "Schedule" ? "#FFF" : "#bab5b5ff";
}

function getInstructorName(instructorName) {
    if (instructorName !== 'TBA') {
        const s = instructorName;
        const firstnameinitial = s[0];

        const words = s.split(' ');
        const lastname = words[words.length - 1];

        const okay = firstnameinitial + '. ' + lastname;
        return okay;
    } else {
        return 'TBA'
    }
}

function positionEvents() {
    const dayToIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const startHour = 7, endHour = 18, slotMinutes = 60, rowHeight = 40;
    const startMin = startHour * 60;

    events = events.map((ev) => {
        const [sh, sm] = ev.start.split(":").map(Number);
        const [eh, em] = ev.end.split(":").map(Number);
        const start = sh * 60 + sm, end = eh * 60 + em;
        const clampedStart = Math.max(start, startMin);
        const clampedEnd = Math.min(end, endHour * 60);
        const minutesFromTop = clampedStart - startMin;
        const duration = Math.max(clampedEnd - clampedStart, 0);
        return { ...ev, _dayIdx: dayToIndex[ev.day] || 0, _top: (minutesFromTop / slotMinutes) * rowHeight, _height: Math.max((duration / slotMinutes) * rowHeight, rowHeight / 4) };
    });
}

async function fetchTimetable() {
    loaderDisplay.style.display = 'flex';
    const weekEnd = endOfWeek(weekStart);
    const start = weekStart.toISOString().slice(0, 10);
    const end = weekEnd.toISOString().slice(0, 10);
    
    try {
        const res = await secureFetch(`${API_URL}/schedules/${roomId}/timetable?weekStart=${start}&weekEnd=${end}`);
        const data = await res.json();
        if (res.ok) {
            const mapped = [];
            Object.keys(data.timetable || {}).forEach(day => {
                data.timetable[day].forEach((s, idx) => {
                    mapped.push({
                        id: day + "-" + idx,
                        schedule_id: s.schedule_id,
                        schedule_date: s.schedule_date,
                        title: s.subject_code,
                        title2: ` (${s.year_section})`,
                        subtitle: s.instructor,
                        instructor_id: s.instructor_id,
                        day,
                        start: (s.start_time || "00:00").slice(0, 5),
                        end: (s.end_time || "00:00").slice(0, 5),
                        oid: s.id,
                        color: getSubjectColor(s.type),
                        type: s.type
                    });
                });
            });
            events = mapped;
            positionEvents();
            renderTimetable();
        } else {
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}



let draggedEventId = null;
let dragOffsetY = 0;

function handleDragStart(e, id) {
    draggedEventId = id;
    
    const eventRect = e.currentTarget.getBoundingClientRect();
    dragOffsetY = e.clientY - eventRect.top;

    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    const column = e.currentTarget;
    column.classList.add("drag-over");

    const columnRect = column.getBoundingClientRect();
    
    // Subtract dragOffsetY to calculate where the TOP edge of the box lands
    const relativeY = (e.clientY - columnRect.top) - dragOffsetY;
    
    const startHour = 7, endHour = 18, slotMinutes = 60, rowHeight = 40;
    const intervalMinutes = 30; // 30-min snapping

    // Bounds checking
    const totalGridMinutes = (endHour - startHour) * 60;
    const maxTopPixel = (totalGridMinutes / slotMinutes) * rowHeight;
    const clampedY = Math.max(0, Math.min(relativeY, maxTopPixel));

    // Calculate snapped top pixel offset
    const minutesFromTop = (clampedY / rowHeight) * slotMinutes;
    const snappedMinutes = Math.round(minutesFromTop / intervalMinutes) * intervalMinutes;
    const visualTop = (snappedMinutes / slotMinutes) * rowHeight;

    let ghost = column.querySelector('.drop-indicator');
    if (!ghost) {
        ghost = document.createElement('div');
        ghost.className = 'drop-indicator';
        column.appendChild(ghost);
    }
    
    ghost.style.top = `${visualTop}px`;
    
    const draggedEv = events.find(ev => ev.id === draggedEventId);
    if (draggedEv) {
        ghost.style.height = `${draggedEv._height}px`;
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
    const ghost = e.currentTarget.querySelector('.drop-indicator');
    if (ghost) ghost.remove();
}

async function handleDrop(e, targetDayIdx, targetDate) {
    e.preventDefault();
    const column = e.currentTarget;
    column.classList.remove("drag-over");
    
    const ghost = column.querySelector('.drop-indicator');
    if (ghost) ghost.remove();

    const draggedEv = events.find(ev => ev.id === draggedEventId);
    if (!draggedEv) return;

    // 1. Subtract dragOffsetY to match handleDragOver calculation
    const columnRect = column.getBoundingClientRect();
    const relativeY = (e.clientY - columnRect.top) - dragOffsetY;
    
    const startHour = 7, endHour = 18, slotMinutes = 60, rowHeight = 40;
    const totalGridMinutes = (endHour - startHour) * 60;
    const maxTopPixel = (totalGridMinutes / slotMinutes) * rowHeight;

    const clampedY = Math.max(0, Math.min(relativeY, maxTopPixel));
    
    // 2. Snap to same interval
    const intervalMinutes = 30;
    const minutesFromTop = (clampedY / rowHeight) * slotMinutes;
    const snappedMinutes = Math.round(minutesFromTop / intervalMinutes) * intervalMinutes;
    const newStartTotalMin = (startHour * 60) + snappedMinutes;

    // 3. Keep original duration
    const [sh, sm] = draggedEv.start.split(":").map(Number);
    const [eh, em] = draggedEv.end.split(":").map(Number);
    const originalDuration = (eh * 60 + em) - (sh * 60 + sm);
    const newEndTotalMin = newStartTotalMin + originalDuration;

    // Format time output (HH:MM:SS)
    const formatMinutesToTime = (totalMins) => {
        const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
        const m = String(totalMins % 60).padStart(2, '0');
        return `${h}:${m}:00`;
    };

    const newStartTime = formatMinutesToTime(newStartTotalMin);
    const newEndTime = formatMinutesToTime(newEndTotalMin);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const formattedTargetDate = `${year}-${month}-${day}`;

    // Past date check
    const newStartDateTime = new Date(`${formattedTargetDate}T${newStartTime}`);
    if (newStartDateTime < new Date()) {
        showFeedback("error", "Invalid Move", "Cannot schedule an event in the past.");
        return;
    }

    // Conflict check
    const hasConflict = events.some(ev => {
        if (ev.id === draggedEventId || ev._dayIdx !== targetDayIdx) return false;
        const [eSh, eSm] = ev.start.split(":").map(Number);
        const [eEh, eEm] = ev.end.split(":").map(Number);
        return newStartTotalMin < (eEh * 60 + eEm) && newEndTotalMin > (eSh * 60 + eSm);
    });

    if (hasConflict) {
        showFeedback("error", "Conflict Warning", "Conflict: Time slot is already occupied.");
        return;
    }

    // Backend payload update
    loaderDisplay.style.display = 'flex';
    try {
        const payload = {
            schedule_id: draggedEv.schedule_id,
            oid: draggedEv.oid,
            date: formattedTargetDate,
            start_time: newStartTime,
            end_time: newEndTime,
            room_id: roomId
        };

        const res = await secureFetch(`${API_URL}/schedules/updateScheduleTime`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            //showFeedback("success", "Schedule Updated", data.message || "Schedule updated successfully!");
            fetchTimetable();
        } else {
            showFeedback("error", "Update Failed", data.message || "Missing required fields.");
        }
    } catch (err) {
        console.error("Drop error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
        draggedEventId = null;
        dragOffsetY = 0;
    }
}

function renderTimetable() {
    const weekEnd = endOfWeek(weekStart);
    document.getElementById("weekRange").innerText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekDates = days.map((_, i) => addDays(weekStart, i));
    const startHour = 7, endHour = 18, slotMinutes = 60;

    const totalMinutes = (endHour - startHour) * 60;
    const rowsCount = Math.ceil(totalMinutes / slotMinutes);

    let html = "<div class='header-row'><div class='time-gutter'></div>";
    weekDates.forEach((d, i) => {
        const isToday = isSameDay(d, today);
        html += `<div class="header-cell ${isToday ? "today" : ""}">${days[i]} ${d.getDate()}</div>`;
    });
    html += "</div>";

    html += "<div class='row'><div class='time-gutter'>";

    for (let i = 0; i <= rowsCount; i++) {
        let minutes = startHour * 60 + i * slotMinutes;
        let hour = Math.floor(minutes / 60);
        let minute = minutes % 60;

        html += `<div class="time-cell">${formatTime12(hour, minute)}</div>`;
    }
    html += "</div>";

    weekDates.forEach((d, dayIdx) => {
        html += `<div class='day-column' 
                     data-day-idx="${dayIdx}" 
                     ondragover="handleDragOver(event)" 
                     ondragleave="handleDragLeave(event)" 
                     ondrop="handleDrop(event, ${dayIdx}, new Date('${d.toISOString()}'))">`;
                     
        events.filter(ev => ev._dayIdx === dayIdx).forEach(ev => {
            html += `<div class="event" 
                          draggable="true" 
                          ondragstart="handleDragStart(event, '${ev.id}')" 
                          style="top:${ev._top}px;height:${ev._height}px;"
                          onclick="openRoomDetailModal('${ev.id}')">
                <span id="evTitle">${ev.title || ""}${ev.title2}</span>
                <span id="evInstructor">${getInstructorName(ev.subtitle)}</span>
            </div>`;
        });
        html += "</div>";
    });

    html += "</div>";
    document.getElementById("timetable").innerHTML = html;
}

// function renderTimetable() {
//     const weekEnd = endOfWeek(weekStart);
//     document.getElementById("weekRange").innerText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

//     const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
//     const weekDates = days.map((_, i) => addDays(weekStart, i));
//     const startHour = 7, endHour = 18, slotMinutes = 60, rowHeight = 40;

//     const totalMinutes = (endHour - startHour) * 60;
//     const rowsCount = Math.ceil(totalMinutes / slotMinutes);

//     let html = "<div class='header-row'><div class='time-gutter'></div>";
//     weekDates.forEach((d, i) => {
//         const isToday = isSameDay(d, today);
//         html += `<div class="header-cell ${isToday ? "today" : ""}">${days[i]} ${d.getDate()}</div>`;
//     });
//     html += "</div>";

//     html += "<div class='row'><div class='time-gutter'>";

//     for (let i = 0; i <= rowsCount; i++) {
//         let minutes = startHour * 60 + i * slotMinutes;
//         let hour = Math.floor(minutes / 60);
//         let minute = minutes % 60;


//         html += `<div class="time-cell">${formatTime12(hour, minute)}</div>`;
//     }
//     html += "</div>";

//     weekDates.forEach((d, dayIdx) => {
//         html += `<div class='day-column'>`;
//         events.filter(ev => ev._dayIdx === dayIdx).forEach(ev => {
//             html += `<div class="event" style="top:${ev._top}px;height:${ev._height}px;"
//             onclick="openRoomDetailModal('${ev.id}')">
//             <span id="evTitle">${ev.title || ""}${ev.title2}</span>
//             <span id="evInstructor">${getInstructorName(ev.subtitle)}</span>
//             </div>`;
//         });
//         html += "</div>";
//     });

//     html += "</div>";
//     document.getElementById("timetable").innerHTML = html;
// }

document.getElementById("prevBtn").onclick = () => {
    const prev = addDays(weekStart, -7);
    if (prev >= semesterStart) { weekStart = prev; fetchTimetable(); }
};
document.getElementById("nextBtn").onclick = () => {
    const next = addDays(weekStart, 7);
    if (next <= semesterEnd) { weekStart = next; fetchTimetable(); }
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

const addSingleDateScheduleModal = document.getElementById("addSingleDateScheduleModal");
const addSingleDateScheduleCloseButton = document.getElementById("addSingleDateScheduleCloseButton");
const addSingleDateScheduleCloseButton2 = document.getElementById("addSingleDateScheduleCloseButton2");
const addSingleDateScheduleForm = document.getElementById("addSingleDateScheduleForm");


function openAddSingleDateScheduleModal(){
    addSingleDateScheduleForm.reset();
    addSingleDateScheduleModal.style.display = "flex";
}

addSingleDateScheduleCloseButton.addEventListener("click", () => {
    addSingleDateScheduleModal.style.display = "none";
});

addSingleDateScheduleCloseButton2.addEventListener("click", () => {
    addSingleDateScheduleModal.style.display = "none";
});

addSingleDateScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = document.getElementById("subject").value;
    const instructor = document.getElementById("instructor").value;
    const yearSection = document.getElementById("yearSection").value;
    const theDate = document.getElementById("theDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    const formErrorSubjectCode = document.getElementById("formErrorSubjectCode");
    const formErrorInstructor = document.getElementById("formErrorInstructor");
    const formErrorYearSection = document.getElementById("formErrorYearSection");
    const formErrortheDate = document.getElementById("formErrortheDate");
    const formErrorStartTime = document.getElementById("formErrorStartTime");
    const formErrorEndTime = document.getElementById("formErrorEndTime");

    formErrorSubjectCode.textContent = "";
    formErrorInstructor.textContent = "";
    formErrorYearSection.textContent = "";
    formErrortheDate.textContent = "";
    formErrorStartTime.textContent = "";
    formErrorEndTime.textContent = "";

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

    if (!theDate) {
        formErrortheDate.textContent = "Date is required.";
        hasError = true;
    }

    const now = new Date();
    const eventStart = new Date(
        `${theDate}T${startTime}`
    );
    
    if(now > eventStart) {
        formErrortheDate.textContent = "Can't create a schedule in past.";
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

    loaderDisplay.style.display = 'flex';

    try {
        const res = await secureFetch(`${API_URL}/schedules/addSingleDateSchedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sem_id: semesterData.sem_id,
                room_id: roomId,
                instructor_id: instructor,
                subject_id: subject,
                year_section_id: yearSection,
                start_time: startTime,
                end_time: endTime,
                date: theDate,
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            showFeedback("success", "Success!", data.message || `Adding schedule successful`);
        } else {
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        addSingleDateScheduleModal.style.display = "none";
        fetchTimetable();
    } catch (err) {
        console.error("Error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
    
});

function goToRoomSchedule() {
    if (!roomId || !roomName || !semesterData) {
        showFeedback("warning", "Wait a minute.", "Room details not loaded yet.");
        return;
    }

    const encodedName = encodeURIComponent(roomName);
    let dataToPass = `roomId=${roomId}&roomName=${encodedName}`;

    if (semesterData) {
        Object.keys(semesterData).forEach(key => {
            dataToPass += `&${encodeURIComponent(key)}=${encodeURIComponent(semesterData[key])}`;
        });
    }
    window.location.href = `AdminManageRoomSchedule.html?${dataToPass}`;
}


async function handleMakeAvailable() {
    if (!selectedEvent) return;
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(
            `${API_URL}/schedules/${selectedEvent.oid}/sched`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentUserRole: CURRENT_USER_ROLE,
                    currentUserName: CURRENT_USER_NAME,
                    instructorId: selectedEvent.instructor_id,
                    instructorName: selectedEvent.subtitle,
                    roomName: roomName,
                    reservationDate: selectedEvent.schedule_date,
                    startTime: selectedEvent.start,
                    endTime: selectedEvent.end
                }),
            }
        );
        const data = await res.json();
        if (res.ok) {
            showFeedback("success", "Success!", "Schedule removed successfully!");
            selectedEvent = null;
            fetchTimetable();
            closeModal();
        } else {
            return showFeedback("error", "Error", data.message || "Something went wrong.");
        }
    } catch (err) {
        console.error("Error removing occurrence:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

async function handleRemove(){
    if (!selectedEvent) return;
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(
            `${API_URL}/room-reservations/${selectedEvent.oid}/${'removed'}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentUserRole: CURRENT_USER_ROLE,
                    currentUserName: CURRENT_USER_NAME,
                    instructorId: selectedEvent.instructor_id,
                    instructorName: selectedEvent.subtitle,
                    roomName: roomName,
                    reservationDate: selectedEvent.schedule_date,
                    startTime: selectedEvent.start,
                    endTime: selectedEvent.end
                })
            }
        );
        const data = await res.json();
        if(res.ok){
            showFeedback("success", "Success!", "Schedule removed successfully!");
            selectedEvent = null;
            closeModal();
        }else{
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        fetchTimetable();
    } catch (err) {
        console.error("Action error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}

function openRoomDetailModal(id) {
    selectedEvent = events.find(e => e.id === id);
    if (!selectedEvent) return;
    document.getElementById("roomDetailModalTitle").innerText = selectedEvent.title + " " + selectedEvent.title2;
    document.getElementById("roomDetailModalContent").innerHTML = `
        <p>Instructor: ${selectedEvent.subtitle || ""}</p>
        <p>Date: ${formatDates(selectedEvent.schedule_date)}</p>
        <p>Time: ${fTime(selectedEvent.start)} - ${fTime(selectedEvent.end)}</p>
    `;
    const now = new Date();
    const eventStart = new Date(
        `${selectedEvent.schedule_date}T${selectedEvent.start}`
    );

    let actions = "";

    if (now < eventStart) {
        if (CURRENT_USER_ROLE === "admin") {
            if (selectedEvent.type === "Schedule") {
                actions += `<div class="room-detail-modal-btn green" onclick="handleMakeAvailable()">Make Available</div>`;
            }
            if (selectedEvent.type === "Reservation") {
                actions += `<div class="room-detail-modal-btn green" onclick="handleRemove()">Remove</div>`;
            }
        }

    } else {
        actions += `<div class="room-detail-modal-btn gray" onclick="closeModal()">Close</div>`;
    }
    document.getElementById("roomDetailModalActions").innerHTML = actions;
    document.getElementById("roomDetailModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("roomDetailModal").style.display = "none";
    selectedEvent = null;
}