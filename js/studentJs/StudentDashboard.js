const loaderDisplay = document.getElementById("loaderDisplay");

const now = new Date();
const currentHour = now.getHours();
let timeOfDay;

if (currentHour < 12) {
    timeOfDay = "Morning";
} else if (currentHour < 17) {
    timeOfDay = "Afternoon";
} else {
    timeOfDay = "Evening";
}

async function fetchStats() {
    loaderDisplay.style.display = 'flex';
    try {
        const semRes = await secureFetch(`${API_URL}/sem/active`);
        if(semRes.ok){
            const activeSemester = await semRes.json();
            document.getElementById("semesterInfo").textContent = `${activeSemester.sem_semester}, ${activeSemester.sem_school_year}`;
            document.getElementById("dashboardGreetUser").textContent = `Good ${timeOfDay}, ${CURRENT_USER_NAME}`;
        }

        const res = await secureFetch(`${API_URL}/dashboards/student/${CURRENT_USER_ID}`);
        const result = await res.json();
        if(res.ok){
            const data = result.data;
            document.getElementById("total_equipment_reservations").innerText =
                data.total_equipment_reservations;

            document.getElementById("total_pending_equipment_reservations").innerText =
                data.total_pending_equipment_reservations;

            document.getElementById("total_unreturn_equipment").innerText =
                data.total_unreturn_equipment;
        }

    } catch(err){
        console.error("Error fetching data:", err);
        showFeedback("error", "Network Error", "Unable to connect to the server.");
    } finally {
        loaderDisplay.style.display = 'none';
    }
}