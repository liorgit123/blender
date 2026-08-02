// פונקציה לעדכון השעון בכל שנייה
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('he-IL');
    document.getElementById('clock').textContent = timeString;
}
setInterval(updateClock, 1000);
updateClock(); // הפעלה ראשונית מיד

// פונקציה לשינוי צבע הרקע של הדף בלחיצה על הכפתור
const button = document.getElementById('colorBtn');
const colors = ['#f0f2f5', '#ffe6e6', '#e6f7ff', '#e6ffe6', '#fff5e6'];
let colorIndex = 0;

button.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % colors.length;
    document.body.style.backgroundColor = colors[colorIndex];
});
