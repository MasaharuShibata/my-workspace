const expressionEl = document.getElementById("expression");
const valueEl = document.getElementById("value");
const keysEl = document.querySelector(".keys");

const OPERATORS = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => (b === 0 ? NaN : a / b),
};

let currentValue = "0";
let previousValue = null;
let operator = null;
let overwrite = true;

function formatNumber(value) {
  if (!Number.isFinite(value)) return "エラー";
  const rounded = Math.round(value * 1e10) / 1e10;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function updateDisplay() {
  valueEl.textContent = currentValue;
  expressionEl.textContent =
    previousValue !== null && operator
      ? `${formatNumber(previousValue)} ${operator}`
      : "";
}

function inputDigit(digit) {
  if (overwrite) {
    currentValue = digit;
    overwrite = false;
  } else {
    if (currentValue.length >= 15) return;
    currentValue = currentValue === "0" ? digit : currentValue + digit;
  }
}

function inputDecimal() {
  if (overwrite) {
    currentValue = "0.";
    overwrite = false;
    return;
  }
  if (!currentValue.includes(".")) {
    currentValue += ".";
  }
}

function chooseOperator(nextOperator) {
  if (operator && !overwrite) {
    calculate();
  } else {
    previousValue = parseFloat(currentValue);
  }
  operator = nextOperator;
  overwrite = true;
}

function calculate() {
  if (operator === null || previousValue === null) return;
  const result = OPERATORS[operator](previousValue, parseFloat(currentValue));
  currentValue = Number.isFinite(result) ? String(formatRaw(result)) : "エラー";
  previousValue = null;
  operator = null;
  overwrite = true;
}

function formatRaw(value) {
  return Math.round(value * 1e10) / 1e10;
}

function percent() {
  currentValue = String(formatRaw(parseFloat(currentValue) / 100));
}

function clearAll() {
  currentValue = "0";
  previousValue = null;
  operator = null;
  overwrite = true;
}

function backspace() {
  if (overwrite) return;
  currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : "0";
  if (currentValue === "0") overwrite = true;
}

keysEl.addEventListener("click", (event) => {
  const button = event.target.closest(".key");
  if (!button) return;

  const { action, digit, operator: op } = button.dataset;

  switch (action) {
    case "digit":
      inputDigit(digit);
      break;
    case "decimal":
      inputDecimal();
      break;
    case "operator":
      chooseOperator(op);
      break;
    case "equals":
      calculate();
      break;
    case "percent":
      percent();
      break;
    case "clear":
      clearAll();
      break;
    case "backspace":
      backspace();
      break;
  }

  updateDisplay();
});

const KEY_MAP = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

document.addEventListener("keydown", (event) => {
  if (event.key >= "0" && event.key <= "9") {
    inputDigit(event.key);
  } else if (event.key === ".") {
    inputDecimal();
  } else if (event.key in KEY_MAP) {
    chooseOperator(KEY_MAP[event.key]);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Backspace") {
    backspace();
  } else if (event.key === "Escape") {
    clearAll();
  } else if (event.key === "%") {
    percent();
  } else {
    return;
  }
  updateDisplay();
});

updateDisplay();
