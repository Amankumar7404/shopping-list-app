// ===== Calorie Map =====
const CAL_MAP = {
  Egg: 70,
  Bread: 75, // per slice
  Banana: 90,
  Apple: 50,
  Almond: 7, // per almond
  Chapati: 120,
  MilkCup: 120, // 1 cup
  "Chicken Breast": 165,
  Paneer: 265,
  Soyabean: 365,
  Fish: 200,
  Whey: 120,
  Curd: 59,
  Oats: 150,
  "Sweet Potato": 112,
  Dalia: 150,
  "Peanut Butter": 588,
  Walnuts: 654,
  Avocado: 160,
  "Olive Oil": 884,
  Broccoli: 55,
  Spinach: 23,
  Carrot: 41,
  Cucumber: 16,
  Capsicum: 31,
  Orange: 47,
  Papaya: 43,
  Mango: 60,
  Berries: 57,
  Milk: 60,
  Buttermilk: 40,
  Lassi: 70,
  "Black Coffee": 2,
  "Green Tea": 0,
  Honey: 304,
  Jaggery: 383,
  "Chia Seeds": 486,
  "Flax Seeds": 534,
  Dates: 282,
  "Chicken Thigh": 209,
  "Boiled egg": 70,
  Tofu: 76,
  Prawns: 99,
  Mutton: 250,
  Beef: 250,
  Pork: 243,
  "Moong Dal": 105,
  Chana: 164,
  Rajma: 127,
  "Black beans": 130,
  "Green Pea": 81,
  Chickpeas: 364,
  "White rice": 130,
  "Brown rice": 111,
  "Basmati rice": 120,
  Poha: 110,
  Suji: 360,
  "White Bread": 265,
  "Brown rice": 247,
  Pasta: 131,
  Noodles: 138,
  Idli: 58,
  Dosa: 150,
  Upma: 180,
  "Mustard oil": 884,
  "Sunflower oil": 884,
  "Coconut oil": 884,
  Butter: 717,
};

// ===== Firebase (v9 modular) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const app = initializeApp({
  databaseURL:
    "https://shopping-list-a77db-default-rtdb.asia-southeast1.firebasedatabase.app/",
});
const db = getDatabase(app);
const itemsRef = ref(db, "CalorieItems");

// ===== DOM =====
const nameEl = document.getElementById("item-name");
const qtyEl = document.getElementById("item-qty");
const addBtn = document.getElementById("add-button");
const list = document.getElementById("shopping-list");
const totalSumEl = document.getElementById("total-sum");
const totalCalEl = document.getElementById("total-cal");
const totalItemsEl = document.getElementById("total-items");
const themeToggleEl = document.getElementById("theme-toggle");

// Theme
(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  if (saved === "dark") document.body.classList.add("dark");
  if (themeToggleEl) {
    themeToggleEl.textContent = document.body.classList.contains("dark")
      ? "🌞"
      : "🌗";
    themeToggleEl.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const dark = document.body.classList.contains("dark");
      localStorage.setItem("theme", dark ? "dark" : "light");
      themeToggleEl.textContent = dark ? "🌞" : "🌗";
    });
  }
})();

// Helpers
function parseNameAndPrice(text) {
  const t = String(text).trim();
  const m = t.match(/^(.*?)(?:\s*₹?\s*(\d+(?:\.\d+)?))\s*$/);
  if (m) {
    const name = m[1].trim();
    const price = parseFloat(m[2]);
    if (name && Number.isFinite(price)) return { cleanName: name, price };
  }
  return { cleanName: t, price: 0 };
}
function findKey(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    Object.keys(CAL_MAP).find((k) => k.toLowerCase() === lower) ||
    Object.keys(CAL_MAP).find((k) => lower.includes(k.toLowerCase())) ||
    null
  );
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );

// Add item
addBtn.addEventListener("click", async () => {
  const raw = (nameEl.value || "").trim();
  const qty = Number(qtyEl.value || 0);
  if (!raw || qty <= 0) return;

  const { cleanName, price } = parseNameAndPrice(raw);
  const key = findKey(cleanName);
  if (!key) {
    alert(`'${cleanName}' not found in CAL_MAP. Add it in new.js.`);
    return;
  }

  const perItemCal = CAL_MAP[key];
  const totalCal = qty * perItemCal;

  await push(itemsRef, {
    name: key,
    qty,
    perItemCal,
    totalCal,
    price, // entry amount as typed
    createdAt: Date.now(),
  });

  nameEl.value = "";
  qtyEl.value = 1;
  nameEl.focus();
});

// Enter = Add
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    (document.activeElement === nameEl || document.activeElement === qtyEl)
  ) {
    e.preventDefault();
    addBtn.click();
  }
});

// Live render + delete + totals
onValue(
  itemsRef,
  (snap) => {
    list.innerHTML = "";

    if (!snap.exists()) {
      setTotals(0, 0, 0);
      // explicit empty-state content (emoji + text)
      const tip = document.createElement("li");
      tip.className = "empty-tip";
      tip.innerHTML = `<span>🛒</span><span>Start by adding your first item</span>`;
      list.appendChild(tip);
      return;
    }

    let sumCost = 0,
      sumCal = 0,
      sumItems = 0;
    const data = snap.val();

    for (const [id, v] of Object.entries(data)) {
      if (typeof v === "string") continue;

      const name = v.name ?? "Item";
      const qty = Number(v.qty ?? 1);
      const cal = Number(v.totalCal ?? 0);
      const price = Number(v.price ?? 0);

      sumItems += Number.isFinite(qty) ? qty : 0;
      sumCal += Number.isFinite(cal) ? cal : 0;
      sumCost += Number.isFinite(price) ? price : 0;

      const li = document.createElement("li");
      li.innerHTML = `
      <div class="item-line">
        <span class="badge"><span class="label">Item:</span> ${esc(name)}</span>
        <span class="badge"><span class="label">Qty:</span> ${qty}</span>
        <span class="badge"><span class="label">Calories:</span> ${Math.round(
          cal
        )} kcal</span>
        <span class="badge"><span class="label">Amount:</span> ₹${
          price || 0
        }</span>
      </div>`;
      li.title = "Click to delete";
      li.addEventListener("click", () => remove(ref(db, `CalorieItems/${id}`)));
      list.appendChild(li);
    }

    setTotals(sumCost, sumCal, sumItems);
  },
  (err) => console.error("onValue error:", err)
);

function setTotals(cost, cal, items) {
  if (totalSumEl) totalSumEl.textContent = `Amount: ₹${Math.round(cost)}`;
  if (totalCalEl) totalCalEl.textContent = `Calories: ${Math.round(cal)} kcal`;
  if (totalItemsEl) totalItemsEl.textContent = `Items: ${items}`;
}
