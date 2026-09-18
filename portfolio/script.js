document.getElementById("year").textContent = new Date().getFullYear();

const printBtn = document.getElementById("printBtn");
if (printBtn) {
  printBtn.addEventListener("click", () => window.print());
}
