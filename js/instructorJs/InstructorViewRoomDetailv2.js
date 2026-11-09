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
    window.location.href = 'InstructorViewRoom.html';
}

//display the room and semester data
document.getElementById("mainHeader-title").innerText = 
    "" + roomName + " - " + semesterData.sem_semester + ", SY: " + semesterData.sem_school_year;

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

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
}

function getSubjectColor(instructor) {
    return instructor === CURRENT_USER_NAME ? "#1e3c72" : "#fff";
}

function getFontColor(instructor) {
    return instructor === CURRENT_USER_NAME ? "#fff" : "#333";
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

// fetching the schedules of the room to create a timetable
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
                        subjId: s.subject_id,
                        ysId: s.year_section_id,
                        title: s.subject_code,
                        title2: ` (${s.year_section})`,
                        subtitle: s.instructor,
                        instructor_id: s.instructor_id,
                        day,
                        start: (s.start_time || "00:00").slice(0, 5),
                        end: (s.end_time || "00:00").slice(0, 5),
                        oid: s.id,
                        color: getSubjectColor(s.instructor),
                        fontColor: getFontColor(s.instructor),
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

// render the data of schedule to create a timetable
function renderTimetable() {
    const weekEnd = endOfWeek(weekStart);
    document.getElementById("weekRange").innerText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekDates = days.map((_, i) => addDays(weekStart, i));
    const startHour = 7, endHour = 18, slotMinutes = 60, rowHeight = 40;

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
        html += `<div class='day-column'>`;
        events.filter(ev => ev._dayIdx === dayIdx).forEach(ev => {
            html += `<div class="event" style="top:${ev._top}px;height:${ev._height}px;background-color:${ev.color};"
            onclick="openRoomDetailModal('${ev.id}')">
            <span id="evTitle" style="color:${ev.fontColor};">${ev.title || ""}${ev.title2}</span>
            <span id="evInstructor" style="color:${ev.fontColor};">${getInstructorName(ev.subtitle)}</span>
            </div>`;
        });
        html += "</div>";
    });

    html += "</div>";
    document.getElementById("timetable").innerHTML = html;
}

// navigation button for viewing previous and next week
document.getElementById("prevBtn").onclick = () => {
    const prev = addDays(weekStart, -7);
    if (prev >= semesterStart) { weekStart = prev; fetchTimetable(); }
};
document.getElementById("nextBtn").onclick = () => {
    const next = addDays(weekStart, 7);
    if (next <= semesterEnd) { weekStart = next; fetchTimetable(); }
};

//conatiner of all schedules
let allSchedules = [];

// fetching all the schedules
async function fetchAllSchedules() {
    loaderDisplay.style.display = 'flex';
    
    try {
        const res = await secureFetch(`${API_URL}/schedules/allSchedules`);
        const data = await res.json();
        if (res.ok) {
            allSchedules = data;

            const filterOptions = getUniqueFilterOptions(data);

            populateFilterDropdowns(filterOptions);
            filterAndDisplaySchedules();
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

// removing the duplicate data in schedules
function getUniqueFilterOptions(schedules) {
    const uniqueRooms = new Map();
    const uniqueInstructors = new Map();
    const uniqueSubjects = new Map();
    const uniqueYearSections = new Map();
    const uniqueDates = new Set();
    const uniqueTimes = new Set();

    schedules.forEach(sched => {
        if (sched.room_id && sched.room_name) {
            uniqueRooms.set(sched.room_id, sched.room_name);
        }

        if (sched.instructor_id && sched.instructor_name) {
            uniqueInstructors.set(sched.instructor_id, sched.instructor_name);
        }

        if (sched.subject_id && sched.subject_code && sched.instructor_id === CURRENT_USER_ID) {
            uniqueSubjects.set(sched.subject_id, sched.subject_code);
        }

        if (sched.year_section_id && sched.year_section_name && sched.instructor_id === CURRENT_USER_ID) {
            uniqueYearSections.set(sched.year_section_id, sched.year_section_name);
        }

        if (sched.schedule_per_day_date) {
            uniqueDates.add(sched.schedule_per_day_date);
        }

        if (sched.schedule_start_time) {
            uniqueTimes.add(sched.schedule_start_time);
        }
    });

    return {
        rooms: Array.from(uniqueRooms, ([id, name]) => ({ id, name })),
        instructors: Array.from(uniqueInstructors, ([id, name]) => ({ id, name })),
        subjects: Array.from(uniqueSubjects, ([id, name]) => ({ id, name })),
        yearSections: Array.from(uniqueYearSections, ([id, name]) => ({ id, name })),
        dates: Array.from(uniqueDates).sort(),
        times: Array.from(uniqueTimes).sort()
    };
}

// inserting data in dropdowns
function populateFilterDropdowns(filters) {
    const roomSelect = document.getElementById('swapRoomFilter');
    const instructorSelect = document.getElementById('swapInstructorFilter');
    const giveInstructor = document.getElementById("giveInstructor");
    const dateSelect = document.getElementById('swapDateFilter');
    const timeSelect = document.getElementById('swapTimeFilter');

    roomSelect.innerHTML = '<option value="">Select Room</option>';
    instructorSelect.innerHTML = '<option value="">Select Instructor</option>';
    dateSelect.innerHTML = '<option value="">Select Date</option>';
    timeSelect.innerHTML = '<option value="">Select Time</option>';

    filters.rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });

    filters.instructors.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst.id;
        option.textContent = inst.name;
        instructorSelect.appendChild(option);
    });

    filters.instructors.forEach(inst => {
        giveInstructor.innerHTML += `<option value='{"id":${i.instructor_id}, "name":${i.instructor_name}}'>${i.instructor_name}</option>`;
    });
    
    const subjectOptions = '<option value="">Select subject code</option>' + 
        filters.subjects.map(s => `<option value="${s.subject_id}">${s.subject_code}</option>`).join('');
    document.getElementById("reserveSubject").innerHTML = subjectOptions;
    document.getElementById("getSubject").innerHTML = subjectOptions;
    document.getElementById("approveSubject").innerHTML = subjectOptions;

    const ysOptions = '<option value="">Select year and section</option>' + 
        filters.yearSections.map(ys => `<option value="${ys.year_section_id}">${ys.year_section_name}</option>`).join('');
    document.getElementById("reserveYearSection").innerHTML = ysOptions;
    document.getElementById("getYearSection").innerHTML = ysOptions;
    document.getElementById("approveYearSection").innerHTML = ysOptions;

    filters.dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateSelect.appendChild(option);
    });

    filters.times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = formatTime(time);
        timeSelect.appendChild(option);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const roomSelect = document.getElementById('swapRoomFilter');
    const instructorSelect = document.getElementById('swapInstructorFilter');
    const dateSelect = document.getElementById('swapDateFilter');
    const timeSelect = document.getElementById('swapTimeFilter');

    roomSelect.addEventListener('change', filterAndDisplaySchedules);
    instructorSelect.addEventListener('change', filterAndDisplaySchedules);
    dateSelect.addEventListener('change', filterAndDisplaySchedules);
    timeSelect.addEventListener('change', filterAndDisplaySchedules);
});

//function to filter the data to display the schedule that is selected
function filterAndDisplaySchedules() {
    const selectedRoom = document.getElementById('swapRoomFilter').value;
    const selectedInstructor = document.getElementById('swapInstructorFilter').value;
    const selectedDate = document.getElementById('swapDateFilter').value;
    const selectedTime = document.getElementById('swapTimeFilter').value;
    const resultsContainer = document.getElementById('scheduleResultsContainer');

    const filtered = allSchedules.filter(sched => {
        const matchesRoom = !selectedRoom || sched.room_id.toString() === selectedRoom;
        
        const matchesInstructor = !selectedInstructor || sched.instructor_id.toString() === selectedInstructor;
        
        const matchesDate = !selectedDate || sched.schedule_per_day_date === selectedDate;

        const matchesTime = !selectedTime || sched.schedule_start_time === selectedTime;

        return matchesRoom && matchesInstructor && matchesDate && matchesTime;
    });

    renderSchedules(filtered, resultsContainer);
}

// conatiner of schedule change requests
let inbox = [];

//components for viewing request
const viewRequestBtn = document.getElementById("viewRequestBtn");
const viewRequestDropdown = document.getElementById("viewRequestDropdown");
const viewRequestDataTableBody = document.getElementById("viewRequestDataTableBody");
const receivedBtn = document.getElementById("receivedBtn");
const sentBtn = document.getElementById("sentBtn");
const closeViewRequestDropdown = document.getElementById("closeViewRequestDropdown");
let activeTab = "received";

//click to view the request sent and received
viewRequestBtn.addEventListener("click",async (e)=>{
    e.stopPropagation();
    fetchViewRequest();
});

//click to close the inbox for request sent and received
closeViewRequestDropdown.addEventListener("click",()=>{
    viewRequestDropdown.classList.add("hidden");
})

document.addEventListener("click", () => {
    viewRequestDropdown.classList.add("hidden");
});

viewRequestDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
});

// fetching the data of all request sent and received of current user
async function fetchViewRequest() {
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/schedule-changes/inbox/${CURRENT_USER_ID}`);
        const data = await res.json();
        if (res.ok) {
           inbox = data;
           renderViewRequest();
        } else {
            showFeedback("error", "Failed", data.message);
        }
    } catch(err) {
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
    viewRequestDropdown.classList.toggle("hidden");
}

//click to view the received request
receivedBtn.addEventListener("click",()=>{
    activeTab = "received"
    receivedBtn.classList.add("active");
    sentBtn.classList.toggle("active");
    renderViewRequest();
});

//click to view the sent request
sentBtn.addEventListener("click",()=>{
    activeTab = "sent"
    sentBtn.classList.add("active");
    receivedBtn.classList.toggle("active");
    renderViewRequest();
});

// display the request inbox
function renderViewRequest() {
    viewRequestDataTableBody.innerHTML = "";
    
    const renderEmptyState = () => {
        viewRequestDataTableBody.innerHTML = `
            <tr>
                <td>
                    <div class="no-request">
                        <i class="fas fa-bell-slash"></i>
                        <p>You're all caught up! No requests right now.</p>
                    </div>
                </td>
            </tr>`;
    };

    if (activeTab === "received") {
        const receivedItems = inbox.received ? inbox.received.filter(r => r.status === 'pending') : [];
        if (receivedItems.length === 0) {
            renderEmptyState();
            return;
        }

        receivedItems.forEach(r => {
            const tr = document.createElement("tr");
            tr.className = 'viewRequestDropdownTr';
            
            const td = document.createElement("td");
            td.className = 'viewRequestDropdownTd';

            const theInstructorName = r.request_type === 'request' ? r.target_instructor_name : r.source_instructor_name;

            td.innerHTML = `
                <div class="viewRequestDropdownData">
                    <h4>Type: ${r.request_type.toUpperCase()}</h4>
                    <p>From: ${theInstructorName}</p>
                    <p>Details: Room ${r.source_room} on ${r.source_date}</p>
                    <p>Status: <strong>${r.status}</strong></p>
                </div>`;
            
            const tdAction = document.createElement("td");
            tdAction.className = 'viewRequestDropdownTdAction';

            const approveBtn = document.createElement("button");
            approveBtn.innerHTML = 'Approve';
            approveBtn.className = 'viewRequestDropdownBtn green';
            if(r.request_type === "give") {
                approveBtn.addEventListener("click", () => handleApproveGiveSchedule(r.request_id));
            } else {
                approveBtn.addEventListener("click", () => respondToScheduleChangeRequest(
                    r.request_id, "approved", null, null,
                    r.source_instructor_name, r.source_room, r.source_date, r.source_start_time, r.source_end_time, 
                    r.target_instructor_name, r.target_room, r.target_date, r.target_start_time, r.target_end_time
                ));
            }
            
            const declineBtn = document.createElement("button");
            declineBtn.innerHTML = 'Decline';
            declineBtn.className = 'viewRequestDropdownBtn red';
            declineBtn.addEventListener("click", () => respondToScheduleChangeRequest(
                r.request_id, "declined", null, null,
                r.source_instructor_name, r.source_room, r.source_date, r.source_start_time, r.source_end_time, 
                r.target_instructor_name, r.target_room, r.target_date, r.target_start_time, r.target_end_time
            ));

            tdAction.appendChild(approveBtn);
            tdAction.appendChild(declineBtn);
            tr.appendChild(td);
            tr.appendChild(tdAction);
            viewRequestDataTableBody.appendChild(tr);
        });

    } else if (activeTab === "sent") {
        const sentItems = inbox.sent ? inbox.sent.filter(s => s.status === 'pending') : [];
        if (sentItems.length === 0) {
            renderEmptyState();
            return;
        }

        sentItems.forEach(s => {
            const tr = document.createElement("tr");
            tr.className = 'viewRequestDropdownTr';
            
            const td = document.createElement("td");
            td.className = 'viewRequestDropdownTd';

            const theInstructorName = s.request_type === 'request' ? s.source_instructor_name : s.target_instructor_name;
            td.innerHTML = `
                <div class="viewRequestDropdownData">
                    <h4>Type: ${s.request_type.toUpperCase()}</h4>
                    <p>Sent To: ${theInstructorName}</p>
                    <p>Details: Room ${s.source_room} on ${s.source_date}</p>
                    <p>Status: <strong>${s.status}</strong></p>
                </div>`;
            
            const tdAction = document.createElement("td");
            tdAction.className = 'viewRequestDropdownTdAction gray';

            const cancelBtn = document.createElement("button");
            cancelBtn.innerHTML = 'Cancel';
            cancelBtn.className = 'viewRequestDropdownBtn';
            cancelBtn.addEventListener("click", () => respondToScheduleChangeRequest(
                s.request_id, "cancelled", null, null,
                s.source_instructor_name, s.source_room, s.source_date, s.source_start_time, s.source_end_time, 
                s.target_instructor_name, s.target_room, s.target_date, s.target_start_time, s.target_end_time
            ));
            
            tdAction.appendChild(cancelBtn);
            tr.appendChild(td);
            tr.appendChild(tdAction);
            viewRequestDataTableBody.appendChild(tr);
        });
    }
}

//components for creating a reservation
const createReservationBtn = document.getElementById("createReservationBtn");
const closeReserveModal = document.getElementById("closeReserveModal");
const closeReserveModal2 = document.getElementById("closeReserveModal2");
const reserveRoomModal = document.getElementById("reserveRoomModal");
const reserveRoomForm = document.getElementById("reserveRoomForm");
const formErrorReserveSubjectCode = document.getElementById("formErrorReserveSubjectCode");
const formErrorReserveYearSection = document.getElementById("formErrorReserveYearSection");
const formErrorReserveDate = document.getElementById("formErrorReserveDate");
const formErrorReserveStartTime = document.getElementById("formErrorReserveStartTime");
const formErrorReserveEndTime = document.getElementById("formErrorReserveEndTime");

createReservationBtn.addEventListener("click", () => {
    reserveRoomForm.reset();
    document.getElementById("reserveRoom").value = roomName;
    reserveRoomModal.style.display = "flex";
});

closeReserveModal.addEventListener("click", () => {
    reserveRoomModal.style.display = "none";
});

closeReserveModal2.addEventListener("click", () => {
    reserveRoomModal.style.display = "none";
});

reserveRoomModal.addEventListener("click", (e) => {
    if(e.target === reserveRoomModal){
        reserveRoomModal.style.display = "none";
    }
});

// form for creating a room reservation
reserveRoomForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = document.getElementById("reserveDate").value;
    const start = document.getElementById("reserveStartTime").value;
    const end = document.getElementById("reserveEndTime").value;
    const subject = document.getElementById("reserveSubject").value;
    const yearSection = document.getElementById("reserveYearSection").value;
    
    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));

    let hasError = false;

    if (!subject) {
        formErrorReserveSubjectCode.textContent = "Please select a subject.";
        hasError = true;
    }
    if (!yearSection) {
        formErrorReserveYearSection.textContent = "Please select year & section.";
        hasError = true;
    }
    if (!date) {
        formErrorReserveDate.textContent = "Please select a date";
        hasError = true;
    }
    if (!start) {
        formErrorReserveStartTime.textContent = "Start time required.";
        hasError = true;
    }
    if (!end) {
        formErrorReserveEndTime.textContent = "End time required.";
        hasError = true;
    }
    if (start >= end) {
        formErrorReserveEndTime.textContent = "End time must be later.";
        hasError = true;
    }
    if (hasError) return;
    loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/room-reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                room_id: roomId,
                room_name: roomName,
                user_id: CURRENT_USER_ID,
                user_name: CURRENT_USER_NAME,
                date,
                start_time: start,
                end_time: end,
                subject_id: subject,
                year_section_id: yearSection,
                sem_id: semesterData.sem_id
            })
        });

        const data = await res.json();
        if (res.ok) {
            showFeedback("success", "Success", data.message || "Room reserved")
            reserveRoomForm.reset();
            reserveRoomModal.style.display = "none";
        } else {
            showFeedback("error", "Failed", data.message || "Failed to add reservation.");
        }
    } catch(err) {
        console.error(err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
});

//function to remove or make the schedule available
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
        selectedEvent = null;
        fetchTimetable();
        closeModal();
        loaderDisplay.style.display = 'none';
    }
}

// function to submit the request of instructor to another instructor
async function submitScheduleChangeRequest(payload) {
    if (!selectedEvent) return;
    if (loaderDisplay) loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/schedule-changes/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const data = await res.json();

        if (res.ok) {
            const successMsg = payload.type === 'give' 
                ? "Schedule offer sent successfully!" 
                : "Schedule request sent successfully!";
            
            showFeedback("success", "Success!", successMsg);
            selectedEvent = null;
            if (typeof closeModal === "function") closeModal();
            if (typeof fetchTimetable === "function") fetchTimetable();
        } else {
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        return { status: res.status, data };
    } catch (err) {
        console.error("Action error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        selectedEvent = null;
        if (loaderDisplay) loaderDisplay.style.display = 'none';
        giveScheduleModal.style.display = "none";
        getScheduleModal.style.display = "none";
        swapModal.style.display = "none";
        fetchTimetable();
    }
}

// Components for giving a schedule to another instructor
const giveScheduleModal = document.getElementById("giveScheduleModal");
const closeGiveScheduleModal = document.getElementById("closeGiveScheduleModal");
const closeGiveScheduleModal2 = document.getElementById("closeGiveScheduleModal2");
const giveScheduleForm = document.getElementById("giveScheduleForm");

function handleGiveSchedule() {
    if (!selectedEvent) return;
    document.getElementById("roomDetailModal").style.display = "none";
    giveScheduleModal.style.display = "flex";
}

closeGiveScheduleModal.addEventListener("click", () => {
    giveScheduleModal.style.display = "none";
});

closeGiveScheduleModal2.addEventListener("click", () => {
    giveScheduleModal.style.display = "none";
});

//form for giving the schedule
giveScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    const instructorString = document.getElementById("giveInstructor").value;
    const validJsonString = instructorString.replace(/:\s*([^"\d{][^,}]+)/g, ':"$1"');
    const { id, name } = JSON.parse(validJsonString);

    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));

    let hasError = false;

    if (!instructorString) {
        document.getElementById("formErrorGiveInstructor").textContent = "Please select an instructor.";
        hasError = true;
    }
    if (hasError) return;

    const payload = {
        type: 'give',
        sourceSchedPerDayId: selectedEvent.oid,
        sourceInstId: selectedEvent.instructor_id,
        sourceName: selectedEvent.subtitle,
        targetSchedPerDayId: null,
        targetInstId: id,
        targetName: name,
        targetSubjectId: null,
        targetYearSectionId: null,
        sourceSubjectId: null,
        sourceYearSectionId: null,
        sourceRoomName: null,
        sourceDate: null,
        sourceStartTime: null,
        sourceEndTime: null,
        targetRoomName: roomName,
        targetDate: selectedEvent.schedule_date,
        targetStartTime: selectedEvent.start,
        targetEndTime: selectedEvent.end,
    };
    submitScheduleChangeRequest(payload);
});

// Components for requesting a schedule from another instructor
const getScheduleModal = document.getElementById("getScheduleModal");
const closeGetScheduleModal = document.getElementById("closeGetScheduleModal");
const closeGetScheduleModal2 = document.getElementById("closeGetScheduleModal2");
const getScheduleForm = document.getElementById("getScheduleForm");

function handleGetSchedule() {
    if (!selectedEvent) return;
    document.getElementById("roomDetailModal").style.display = "none";
    getScheduleModal.style.display = "flex";
}

closeGetScheduleModal.addEventListener("click", () => {
    getScheduleModal.style.display = "none";
});

closeGetScheduleModal2.addEventListener("click", () => {
    getScheduleModal.style.display = "none";
});

// form to request to get another instructor schedule
getScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const subject = document.getElementById("getSubject").value;
    const yearSection = document.getElementById("getYearSection").value;
    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));

    let hasError = false;

    if (!subject) {
        document.getElementById("formErrorGetSubjectCode").textContent = "Please select a subject.";
        hasError = true;
    }
    if (!yearSection) {
        document.getElementById("formErrorGetYearSection").textContent = "Please select year & section.";
        hasError = true;
    }
    if (hasError) return;

    const payload = {
        type: 'request',
        sourceSchedPerDayId: selectedEvent.oid,
        sourceInstId: selectedEvent.instructor_id,
        sourceName: selectedEvent.subtitle,
        targetSchedPerDayId: null,
        targetInstId: CURRENT_USER_ID,
        targetName: CURRENT_USER_NAME,
        targetSubjectId: null,
        targetYearSectionId: null,
        sourceSubjectId: subject,
        sourceYearSectionId: yearSection,
        sourceRoomName: roomName,
        sourceDate: selectedEvent.schedule_date,
        sourceStartTime: selectedEvent.start,
        sourceEndTime: selectedEvent.end,
        targetRoomName: null,
        targetDate: null,
        targetStartTime: null,
        targetEndTime: null,
    };
    submitScheduleChangeRequest(payload);
});

// Components for requesting a schedule swap with another instructor
const swapModal = document.getElementById("swapModal");
const closeSwapModal = document.getElementById("closeSwapModal");
const swapForm = document.getElementById("swapForm");

//display the schedules
function renderSchedules(schedules, container) {
    container.innerHTML = '';
    if (schedules.length === 0) {
        container.innerHTML = `<p style="color: #666; font-style: italic;">No schedules found matching the selected filters.</p>`;
        return;
    }
  
    schedules.forEach(sched => {
        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.style.cssText = `
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        `;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: #333;">${sched.subject_code} (${sched.year_section_name})</span>
                <span style="font-size: 0.85rem; color: #666; background: #eee; padding: 2px 8px; border-radius: 12px;">
                    ${sched.schedule_per_day_day}
                </span>
            </div>
            <hr style="margin: 8px 0; border: 0; border-top: 1px solid #eee;">
            <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Instructor:</strong> ${sched.instructor_name}</p>
            <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Room:</strong> ${sched.room_name}</p>
            <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Date:</strong> ${formatDates(sched.schedule_per_day_date)}</p>
            <p style="margin: 4px 0; font-size: 0.9rem; color: #007bff;">
                <strong>Time:</strong> ${formatTime(sched.schedule_start_time)} - ${formatTime(sched.schedule_end_time)}
            </p>
            <button onclick="handleSelectSwap(${sched.schedule_per_day_id},${sched.instructor_id},'${sched.instructor_name}',${sched.subject_id},${sched.year_section_id},'${sched.room_name}','${sched.schedule_per_day_date}','${sched.schedule_start_time}','${sched.schedule_end_time}')" style="margin-top: 8px; width: 100%; padding: 6px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Swap with this Schedule
            </button>
        `;

        container.appendChild(card);
    });
}

// function to submit the request
function handleSelectSwap(idTargetDay, idTargetInst, nameTargetInst, idTargetSub, idTargetYs, 
    nameTargetRoom, dateTarget, startTimeTarget, endTimeTarget) {
    if (!selectedEvent) return;
    const payload = {
        type: 'swap',
        sourceSchedPerDayId: selectedEvent.oid,
        sourceInstId: selectedEvent.instructor_id,
        sourceName: selectedEvent.subtitle,
        targetSchedPerDayId: idTargetDay,
        targetInstId: idTargetInst,
        targetName: nameTargetInst,
        targetSubjectId: idTargetSub,
        targetYearSectionId: idTargetYs,
        sourceSubjectId: selectedEvent.subjId,
        sourceYearSectionId: selectedEvent.ysId,
        sourceRoomName: roomName,
        sourceDate: selectedEvent.schedule_date,
        sourceStartTime: selectedEvent.start,
        sourceEndTime: selectedEvent.end,
        targetRoomName: nameTargetRoom,
        targetDate: dateTarget,
        targetStartTime: startTimeTarget,
        targetEndTime: endTimeTarget,
    };
    
    submitScheduleChangeRequest(payload);
}

// display  the swap modal
function handleSwapSchedule() {
    if (!selectedEvent) return;
    document.getElementById("roomDetailModal").style.display = "none";
    document.getElementById("swapModalContent1").innerHTML = `
        <div class="swapModalContent1Row">
            <span><strong>Room: </strong></span><span>${roomName}</span>
        </div>

        <div class="swapModalContent1Row">
            <span><strong>Subject: </strong></span><span>${selectedEvent.title} ${selectedEvent.title2}</span>
        </div>

        <div class="swapModalContent1Row">
            <span><strong>Instructor: </strong></span><span>${selectedEvent.subtitle || ""}</span>
        </div>

        <div class="swapModalContent1Row">
            <span><strong>Date: </strong></span><span>${formatDates(selectedEvent.schedule_date)}</span>
        </div>

        <div class="swapModalContent1Row">
            <span><strong>Time: </strong></span><span>${fTime(selectedEvent.start)} - ${fTime(selectedEvent.end)}</span>
        </div>
    `;
    fetchAllSchedules();

    swapModal.style.display = "flex";
}

closeSwapModal.addEventListener("click", () => {
    swapModal.style.display = "none";
});

async function respondToScheduleChangeRequest(requestId, action, subject, yearSection, 
    sourceName, sourceRoomName, sourceDate, sourceStartTime, sourceEndTime, 
    targetName, targetRoomName, targetDate, targetStartTime, targetEndTime,) {

    if (loaderDisplay) loaderDisplay.style.display = 'flex';
    try {
        const res = await secureFetch(`${API_URL}/schedule-changes/${requestId}/respond`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instructor_id: CURRENT_USER_ID,
                action: action,
                subjectId: subject,
                yearSectionId: yearSection,
                sourceName, 
                sourceRoomName, 
                sourceDate, 
                sourceStartTime, 
                sourceEndTime, 
                targetName, 
                targetRoomName, 
                targetDate, 
                targetStartTime, 
                targetEndTime,
            }),
        });
        
        const data = await res.json();

        if (res.ok) {
            showFeedback("success", "Success!", data.message || "Action updated successfully!");
            selectedEvent = null;
            theRequestId = null;
            if (typeof fetchTimetable === "function") fetchTimetable();
        } else {
            showFeedback("error", "Error", data.message || "Something went wrong.");
        }
        document.getElementById("roomDetailModal").style.display = "none";
        viewRequestDropdown.classList.toggle("hidden");
        return { status: res.status, data };
    } catch (err) {
        console.error("Action error:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        selectedEvent = null;
        theRequestId = null;
        if (typeof fetchViewRequest === "function") fetchViewRequest();
        approveGiveScheduleModal.style.display = "none";
        if (loaderDisplay) loaderDisplay.style.display = 'none';
    }
}

// Components for approving request
const approveGiveScheduleModal = document.getElementById("approveGiveScheduleModal");
const closeApproveGiveScheduleModal = document.getElementById("closeApproveGiveScheduleModal");
const closeApproveGiveScheduleModal2 = document.getElementById("closeApproveGiveScheduleModal2");
const approveGiveScheduleForm = document.getElementById("approveGiveScheduleForm");

let theRequestId = null;

function handleApproveGiveSchedule(requestId) {
    theRequestId = requestId;
    document.getElementById("roomDetailModal").style.display = "none";
    approveGiveScheduleModal.style.display = "flex";
}

closeApproveGiveScheduleModal.addEventListener("click", () => {
    approveGiveScheduleModal.style.display = "none";
});

closeApproveGiveScheduleModal2.addEventListener("click", () => {
    approveGiveScheduleModal.style.display = "none";
});

approveGiveScheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = document.getElementById("approveSubject").value;
    const yearSection = document.getElementById("approveYearSection").value;
    document.querySelectorAll(".error-msg").forEach(x => (x.textContent = ""));
    let hasError = false;
    if (!subject) {
        document.getElementById("formErrorApproveSubjectCode").textContent = "Please select a subject.";
        hasError = true;
    }
    if (!yearSection) {
        document.getElementById("formErrorApproveYearSection").textContent = "Please select year & section.";
        hasError = true;
    }
    if (hasError) return;
    
    const receivedItems = inbox.received ? inbox.received.filter(r => r.request_id === theRequestId) : [];
    
    receivedItems.forEach(r => {
        respondToScheduleChangeRequest(
            r.request_id, "approved", subject, yearSection,
            r.source_instructor_name, r.source_room, r.source_date, r.source_start_time, r.source_end_time, 
            r.target_instructor_name, r.target_room, r.target_date, r.target_start_time, r.target_end_time
        );
    });
});

//function to open room modal with its infomation
function openRoomDetailModal(id) {
    selectedEvent = events.find(e => e.id === id);
    if (!selectedEvent) return;
    
    const pendingGiveRequest = inbox.sent ? inbox.sent.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'give' && 
        req.status === 'pending'
    ) : null;

    const pendingReceiveRequest = inbox.received ? inbox.received.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'give' && 
        req.status === 'pending'
    ) : null;

    const pendingGetRequest = inbox.sent ? inbox.sent.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'request' && 
        req.status === 'pending'
    ) : null;

    const pendingReceiveGetRequest = inbox.received ? inbox.received.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'request' && 
        req.status === 'pending'
    ) : null;

    const pendingGetSwapRequest = inbox.sent ? inbox.sent.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'swap' && 
        req.status === 'pending'
    ) : null;

    const pendingReceiveSwapRequest = inbox.received ? inbox.received.find(req => 
        Number(req.source_schedule_per_day_id) === Number(selectedEvent.oid) &&
        req.request_type === 'swap' && 
        req.status === 'pending'
    ) : null;

    const isPendingGive = !!pendingGiveRequest;
    const isPendingReceive = !!pendingReceiveRequest;
    const isPendingGet = !!pendingGetRequest;
    const isPendingReceiveGet = !!pendingReceiveGetRequest;
    const isPendingSwap = !!pendingGetSwapRequest;
    const isPendingReceiveSwap = !!pendingReceiveSwapRequest;

    document.getElementById("roomDetailModalTitle").innerText = selectedEvent.title + " " + selectedEvent.title2;

    document.getElementById("roomDetailModalContent").innerHTML = `
        <div class="roomDetailModalContentRow">
            <span><strong>Instructor: </strong></span><span>${selectedEvent.subtitle || ""}</span>
        </div>

        <div class="roomDetailModalContentRow">
            <span><strong>Date: </strong></span><span>${formatDates(selectedEvent.schedule_date)}</span>
        </div>

        <div class="roomDetailModalContentRow">
            <span><strong>Time: </strong></span><span>${fTime(selectedEvent.start)} - ${fTime(selectedEvent.end)}</span>
        </div>
        ${isPendingGive ? `<p style="color: #e67e22;"><strong>Status: Pending Give Approval</strong></p>` : ''}
        ${isPendingReceive ? `<p style="color: #e67e22;"><strong>Status: Pending Receive Approval</strong></p>` : ''}
        ${isPendingSwap ? `<p style="color: #e67e22;"><strong>Status: Pending Swap Approval</strong></p>` : ''}
    `;

    const now = new Date();
    const eventStart = new Date(
        `${selectedEvent.schedule_date}T${selectedEvent.start}`
    );

    let actions = "";
    
    if (now < eventStart) {
        if (CURRENT_USER_ROLE === "instructor" && CURRENT_USER_ID === selectedEvent.instructor_id) {
            
            if (isPendingGive) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingGiveRequest.request_id}', 'cancelled', null, null,
                    '${pendingGiveRequest.source_instructor_name}', '${pendingGiveRequest.source_room}', '${pendingGiveRequest.source_date}',
                    '${pendingGiveRequest.source_start_time}', '${pendingGiveRequest.source_end_time}',
                    '${pendingGiveRequest.target_instructor_name}', '${pendingGiveRequest.target_room}', '${pendingGiveRequest.target_date}',
                    '${pendingGiveRequest.target_start_time}', '${pendingGiveRequest.target_end_time}',
                )">
                Cancel Give Request</div>`;
            } else if (isPendingSwap) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingGetSwapRequest.request_id}', 'cancelled', null, null,
                    '${pendingGetSwapRequest.source_instructor_name}', '${pendingGetSwapRequest.source_room}', '${pendingGetSwapRequest.source_date}',
                    '${pendingGetSwapRequest.source_start_time}', '${pendingGetSwapRequest.source_end_time}',
                    '${pendingGetSwapRequest.target_instructor_name}', '${pendingGetSwapRequest.target_room}', '${pendingGetSwapRequest.target_date}',
                    '${pendingGetSwapRequest.target_start_time}', '${pendingGetSwapRequest.target_end_time}',
                    )">
                Cancel Swap Request</div>`;
            }else if(isPendingReceiveGet) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingReceiveGetRequest.request_id}', 'declined', null, null,
                    '${pendingReceiveGetRequest.source_instructor_name}', '${pendingReceiveGetRequest.source_room}', '${pendingReceiveGetRequest.source_date}',
                    '${pendingReceiveGetRequest.source_start_time}', '${pendingReceiveGetRequest.source_end_time}',
                    '${pendingReceiveGetRequest.target_instructor_name}', '${pendingReceiveGetRequest.target_room}', '${pendingReceiveGetRequest.target_date}',
                    '${pendingReceiveGetRequest.target_start_time}', '${pendingReceiveGetRequest.target_end_time}',
                    )">
                Decline Get Request</div>`;

                actions += `<div class="room-detail-modal-btn green" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingReceiveGetRequest.request_id}', 'approved', null, null,
                    '${pendingReceiveGetRequest.source_instructor_name}', '${pendingReceiveGetRequest.source_room}', '${pendingReceiveGetRequest.source_date}',
                    '${pendingReceiveGetRequest.source_start_time}', '${pendingReceiveGetRequest.source_end_time}',
                    '${pendingReceiveGetRequest.target_instructor_name}', '${pendingReceiveGetRequest.target_room}', '${pendingReceiveGetRequest.target_date}',
                    '${pendingReceiveGetRequest.target_start_time}', '${pendingReceiveGetRequest.target_end_time}',
                    )">
                Approve Get Request</div>`;
            }else {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="openConfirmModal('removeSchedule','Make Schedule Available','Are you sure?','Make Available')">
                Make Available</div>`;

                actions += `<div class="room-detail-modal-btn green" onclick="handleGiveSchedule()">
                Give Schedule</div>`;

                actions += `<div class="room-detail-modal-btn purple" onclick="handleSwapSchedule()">Swap Schedule</div>`;
            }
        } else {

            if (isPendingReceive) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingReceiveRequest.request_id}', 'declined', null, null,
                    '${pendingReceiveRequest.source_instructor_name}', '${pendingReceiveRequest.source_room}', '${pendingReceiveRequest.source_date}',
                    '${pendingReceiveRequest.source_start_time}', '${pendingReceiveRequest.source_end_time}',
                    '${pendingReceiveRequest.target_instructor_name}', '${pendingReceiveRequest.target_room}', '${pendingReceiveRequest.target_date}',
                    '${pendingReceiveRequest.target_start_time}', '${pendingReceiveRequest.target_end_time}',
                    )">
                Declined Give Request</div>`;

                actions += `<div class="room-detail-modal-btn green" 
                onclick="handleApproveGiveSchedule(${pendingReceiveRequest.request_id})">
                Receive Give Request</div>`;
            } else if(isPendingGet) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingGetRequest.request_id}', 'cancelled', null, null,
                    '${pendingGetRequest.source_instructor_name}', '${pendingGetRequest.source_room}', '${pendingGetRequest.source_date}',
                    '${pendingGetRequest.source_start_time}', '${pendingGetRequest.source_end_time}',
                    '${pendingGetRequest.target_instructor_name}', '${pendingGetRequest.target_room}', '${pendingGetRequest.target_date}',
                    '${pendingGetRequest.target_start_time}', '${pendingGetRequest.target_end_time}',
                )">
                Cancel Get Request</div>`;
            } else if (isPendingReceiveSwap) {
                actions += `<div class="room-detail-modal-btn red" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingReceiveSwapRequest.request_id}', 'declined', null, null,
                    '${pendingReceiveSwapRequest.source_instructor_name}', '${pendingReceiveSwapRequest.source_room}', '${pendingReceiveSwapRequest.source_date}',
                    '${pendingReceiveSwapRequest.source_start_time}', '${pendingReceiveSwapRequest.source_end_time}',
                    '${pendingReceiveSwapRequest.target_instructor_name}', '${pendingReceiveSwapRequest.target_room}', '${pendingReceiveSwapRequest.target_date}',
                    '${pendingReceiveSwapRequest.target_start_time}', '${pendingReceiveSwapRequest.target_end_time}',
                    )">
                Declined Swap Request</div>`;

                actions += `<div class="room-detail-modal-btn green" 
                onclick="respondToScheduleChangeRequest(
                    '${pendingReceiveSwapRequest.request_id}', 'approved', null, null,
                    '${pendingReceiveSwapRequest.source_instructor_name}', '${pendingReceiveSwapRequest.source_room}', '${pendingReceiveSwapRequest.source_date}',
                    '${pendingReceiveSwapRequest.source_start_time}', '${pendingReceiveSwapRequest.source_end_time}',
                    '${pendingReceiveSwapRequest.target_instructor_name}', '${pendingReceiveSwapRequest.target_room}', '${pendingReceiveSwapRequest.target_date}',
                    '${pendingReceiveSwapRequest.target_start_time}', '${pendingReceiveSwapRequest.target_end_time}',
                )">
                Accept Swap Request</div>`;
            }else {
                actions += `<div class="room-detail-modal-btn blue" onclick="handleGetSchedule()">Request to GET this Schedule</div>`;
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