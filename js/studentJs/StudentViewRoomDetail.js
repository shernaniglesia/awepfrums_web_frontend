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

function getBackgroundColor(yearSection) {
    return yearSection === "a" ? 
        "#1e3c72" 
        : 
        "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))";
}

function getFontColor(yearSection) {
    return yearSection === "a" ? 
        "#fff" 
        : 
        "#333";
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
                        color: getBackgroundColor(s.year_section),
                        fontColor: getFontColor(s.year_section),
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

document.getElementById("prevBtn").onclick = () => {
    const prev = addDays(weekStart, -7);
    if (prev >= semesterStart) { weekStart = prev; fetchTimetable(); }
};
document.getElementById("nextBtn").onclick = () => {
    const next = addDays(weekStart, 7);
    if (next <= semesterEnd) { weekStart = next; fetchTimetable(); }
};

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
    actions += `<div class="room-detail-modal-btn gray" onclick="closeModal()">Close</div>`;
    
    document.getElementById("roomDetailModalActions").innerHTML = actions;
    document.getElementById("roomDetailModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("roomDetailModal").style.display = "none";
    selectedEvent = null;
}