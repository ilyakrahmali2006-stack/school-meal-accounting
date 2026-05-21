const pages = {
  dashboard: { title: "Главная", subtitle: "Краткая информация по организации питания" },

  students: {
    title: "Обучающиеся",
    subtitle: "Учет обучающихся и категорий питания",
    entity: "students",
    filter: { key: "class_name", label: "Все классы" },
    columns: [["id","ID"],["full_name","ФИО"],["class_name","Класс"],["parent_name","Родитель"],["parent_phone","Телефон"],["category_name","Категория"],["benefit_name","Льгота"]],
    fields: [
      { name:"full_name", label:"ФИО обучающегося", type:"text", required:true },
      { name:"class_id", label:"Класс", type:"select", source:"classes", required:true },
      { name:"parent_name", label:"ФИО родителя", type:"text" },
      { name:"parent_phone", label:"Телефон родителя", type:"text" },
      { name:"category_id", label:"Категория питания", type:"select", source:"categories" },
      { name:"benefit_id", label:"Льгота", type:"select", source:"benefits" }
    ]
  },

  classes: {
    title:"Классы",
    subtitle:"Справочник классов и классных руководителей",
    entity:"classes",
    columns:[["id","ID"],["name","Класс"],["teacher","Классный руководитель"]],
    fields:[
      { name:"name", label:"Название класса", type:"text", required:true },
      { name:"teacher", label:"Классный руководитель", type:"text", required:true }
    ]
  },

  categories: {
    title:"Категории питания",
    subtitle:"Справочник категорий школьного питания",
    entity:"categories",
    columns:[["id","ID"],["name","Категория"],["description","Описание"]],
    fields:[
      { name:"name", label:"Название категории", type:"text", required:true },
      { name:"description", label:"Описание", type:"textarea" }
    ]
  },

  benefits: {
    title:"Льготы",
    subtitle:"Учет льготных оснований для питания",
    entity:"benefits",
    columns:[["id","ID"],["name","Льгота"],["document_required","Документ"]],
    fields:[
      { name:"name", label:"Название льготы", type:"text", required:true },
      { name:"document_required", label:"Нужен документ", type:"select-static", options:["Да","Нет"], required:true }
    ]
  },

  menu: {
    title:"Меню",
    subtitle:"Учет меню и стоимости питания",
    entity:"menu",
    columns:[["id","ID"],["date","Дата"],["meal_type","Прием пищи"],["dish","Блюдо"],["price","Стоимость"]],
    fields:[
      { name:"date", label:"Дата", type:"date", required:true },
      { name:"meal_type", label:"Прием пищи", type:"select-static", options:["Завтрак","Обед","Полдник"], required:true },
      { name:"dish", label:"Блюдо", type:"textarea", required:true },
      { name:"price", label:"Стоимость", type:"number", required:true }
    ]
  },

  requests: {
    title:"Заявки",
    subtitle:"Регистрация и контроль заявок на питание",
    entity:"requests",
    filter: { key: "status", label: "Все статусы" },
    columns:[["id","ID"],["student_name","Обучающийся"],["class_name","Класс"],["request_date","Дата"],["category_name","Категория"],["status","Статус"],["comment","Комментарий"]],
    fields:[
      { name:"student_id", label:"Обучающийся", type:"select", source:"students", required:true },
      { name:"request_date", label:"Дата заявки", type:"date", required:true },
      { name:"category_id", label:"Категория питания", type:"select", source:"categories" },
      { name:"status", label:"Статус", type:"select-static", options:["Новая","В обработке","Подтверждена","Отклонена","Отменена"], required:true },
      { name:"comment", label:"Комментарий", type:"textarea" }
    ]
  },

  reports: { title:"Отчеты", subtitle:"Сводная информация по питанию" },
  about: { title:"О системе", subtitle:"Назначение и сведения о разработанном приложении" }
};

let currentConfig = pages.dashboard;
let currentRows = [];
let selectedId = null;
let optionsCache = {};

const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginInput = document.getElementById("loginInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const dashboardPage = document.getElementById("dashboardPage");
const tablePage = document.getElementById("tablePage");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const sectionInfo = document.getElementById("sectionInfo");
const editForm = document.getElementById("editForm");
const formFields = document.getElementById("formFields");
const formTitle = document.getElementById("formTitle");
const formHint = document.getElementById("formHint");
const deleteButton = document.getElementById("deleteButton");
const clearButton = document.getElementById("clearButton");
const newButton = document.getElementById("newButton");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const studentCardBox = document.getElementById("studentCardBox");

window.addEventListener("load", () => {
  loginInput.value = "";
  passwordInput.value = "";
  loginError.textContent = "";
});

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Ошибка выполнения запроса");
  return data;
}

function showToast(text) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function hideStudentCard() {
  if (!studentCardBox) return;
  studentCardBox.classList.add("hidden");
  studentCardBox.innerHTML = "";
}

loginButton.addEventListener("click", async () => {
  loginError.textContent = "";

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        login: loginInput.value.trim(),
        password: passwordInput.value.trim()
      })
    });

    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");
    await loadPage("dashboard");
  } catch (err) {
    loginError.textContent = err.message;
  }
});

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginButton.click();
});

logoutButton.addEventListener("click", () => {
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  passwordInput.value = "";
});

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", async () => {
    document.querySelectorAll(".nav-btn").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    await loadPage(button.dataset.page);
  });
});

async function loadOptions() {
  optionsCache = await api("/api/meta/options");
}

async function loadPage(pageKey) {
  currentConfig = pages[pageKey];
  selectedId = null;
  hideStudentCard();
  if (sectionInfo) sectionInfo.innerHTML = "";

  pageTitle.textContent = currentConfig.title;
  pageSubtitle.textContent = currentConfig.subtitle;

  if (pageKey === "dashboard") {
    dashboardPage.classList.remove("hidden");
    tablePage.classList.add("hidden");
    await renderDashboard();
    return;
  }

  if (pageKey === "reports") {
    dashboardPage.classList.remove("hidden");
    tablePage.classList.add("hidden");
    await renderReportsPage();
    return;
  }

  if (pageKey === "about") {
    dashboardPage.classList.remove("hidden");
    tablePage.classList.add("hidden");
    renderAboutPage();
    return;
  }

  await loadOptions();
  dashboardPage.classList.add("hidden");
  tablePage.classList.remove("hidden");
  searchInput.value = "";
  setupFilter([]);
  renderForm();
  await loadTable();
}

async function renderDashboard() {
  const summary = await api("/api/reports/summary");
  const latest = await api("/api/reports/latest");
  const statuses = await api("/api/reports/statuses");
  const maxStatus = Math.max(...statuses.map(item => item.count), 1);

  const chartHtml = statuses.map(item => `
    <div class="chart-row">
      <span>${item.status}</span>
      <div class="chart-track"><div class="chart-fill" style="width:${Math.round(item.count / maxStatus * 100)}%"></div></div>
      <strong>${item.count}</strong>
    </div>
  `).join("");

  dashboardPage.innerHTML = `
    <div class="hero-card">
      <h3>Учет организации питания обучающихся</h3>
      <p>
        Система предназначена для ведения данных об обучающихся, категориях питания,
        льготах, меню и заявках на питание в МБОУ НОШ «Детство без границ».
      </p>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><span>Обучающиеся</span><strong>${summary.students}</strong></div>
      <div class="stat-card"><span>Классы</span><strong>${summary.classes}</strong></div>
      <div class="stat-card"><span>Заявки</span><strong>${summary.requests}</strong></div>
      <div class="stat-card"><span>Льготники</span><strong>${summary.benefits}</strong></div>
      <div class="stat-card"><span>Активные заявки</span><strong>${summary.active}</strong></div>
      <div class="stat-card"><span>Стоимость меню</span><strong>${summary.menuCost}</strong></div>
    </div>

    <div class="info-card">
      <h3>Назначение системы</h3>
      <p>
        Данные хранятся в базе SQLite. Пользователь может добавлять, изменять,
        удалять и искать записи, а также просматривать основные показатели по организации питания.
      </p>
      <p>
        Для формирования документа, скачивания или печати отчёта используется отдельный раздел «Отчёты».
      </p>
    </div>

    <div class="info-card">
      <h3>Диаграмма по статусам заявок</h3>
      <div class="chart-box">${chartHtml || "<p>Данных для построения диаграммы пока нет.</p>"}</div>
    </div>

    <div class="info-card">
      <h3>Последние заявки</h3>
      <table class="latest-table">
        <thead>
          <tr><th>ID</th><th>Обучающийся</th><th>Класс</th><th>Дата</th><th>Категория</th><th>Статус</th></tr>
        </thead>
        <tbody>
          ${latest.map(row => `
            <tr>
              <td>${row.id}</td>
              <td>${row.student_name ?? ""}</td>
              <td>${row.class_name ?? ""}</td>
              <td>${row.request_date ?? ""}</td>
              <td>${row.category_name ?? ""}</td>
              <td>${formatCell("status", row.status)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


async function renderReportsPage() {
  const summary = await api("/api/reports/summary");
  const latest = await api("/api/reports/latest");
  const statuses = await api("/api/reports/statuses");
  const maxStatus = Math.max(...statuses.map(item => item.count), 1);

  const chartHtml = statuses.map(item => `
    <div class="chart-row">
      <span>${item.status}</span>
      <div class="chart-track"><div class="chart-fill" style="width:${Math.round(item.count / maxStatus * 100)}%"></div></div>
      <strong>${item.count}</strong>
    </div>
  `).join("");

  dashboardPage.innerHTML = `
    <div class="hero-card">
      <h3>Формирование отчётной информации</h3>
      <p>
        Раздел предназначен для просмотра сводных данных по организации питания,
        формирования отчёта, его скачивания и вывода на печать.
      </p>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><span>Обучающиеся</span><strong>${summary.students}</strong></div>
      <div class="stat-card"><span>Классы</span><strong>${summary.classes}</strong></div>
      <div class="stat-card"><span>Заявки</span><strong>${summary.requests}</strong></div>
      <div class="stat-card"><span>Льготники</span><strong>${summary.benefits}</strong></div>
      <div class="stat-card"><span>Активные заявки</span><strong>${summary.active}</strong></div>
      <div class="stat-card"><span>Стоимость меню</span><strong>${summary.menuCost}</strong></div>
    </div>

    <div class="info-card">
      <h3>Действия с отчётом</h3>
      <p>
        Нажмите «Сформировать отчёт», чтобы просмотреть отчёт прямо в приложении.
        При необходимости отчёт можно скачать в текстовом формате или открыть печатную версию.
      </p>
      <div class="report-actions">
        <button class="secondary-btn" onclick="showReportPreview()">Сформировать отчёт</button>
        <button class="secondary-btn" onclick="downloadReport()">Скачать отчёт</button>
        <button class="secondary-btn" onclick="printReport()">Печать отчёта</button>
      </div>
      <div id="reportPreview" class="report-preview hidden"></div>
    </div>

    <div class="info-card">
      <h3>Диаграмма по статусам заявок</h3>
      <div class="chart-box">${chartHtml || "<p>Данных для построения диаграммы пока нет.</p>"}</div>
    </div>

    <div class="info-card">
      <h3>Последние заявки для отчётности</h3>
      <table class="latest-table">
        <thead>
          <tr><th>ID</th><th>Обучающийся</th><th>Класс</th><th>Дата</th><th>Категория</th><th>Статус</th></tr>
        </thead>
        <tbody>
          ${latest.map(row => `
            <tr>
              <td>${row.id}</td>
              <td>${row.student_name ?? ""}</td>
              <td>${row.class_name ?? ""}</td>
              <td>${row.request_date ?? ""}</td>
              <td>${row.category_name ?? ""}</td>
              <td>${formatCell("status", row.status)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function renderAboutPage() {
  dashboardPage.innerHTML = `
    <div class="hero-card">
      <h3>Информационная система учета питания</h3>
      <p>
        Приложение разработано как дополнительный модуль школьной информационной системы
        и предназначено для автоматизации учета питания обучающихся.
      </p>
    </div>

    <div class="info-card">
      <h3>О системе</h3>
      <div class="about-grid">
        <div class="about-item">
          <h4>Назначение</h4>
          <p>Учет обучающихся, классов, категорий питания, льгот, меню и заявок.</p>
        </div>
        <div class="about-item">
          <h4>Технологии</h4>
          <p>HTML, CSS, JavaScript, Python и SQLite.</p>
        </div>
        <div class="about-item">
          <h4>Интеграция</h4>
          <p>Модуль может открываться из основной школьной системы через кнопку-ссылку.</p>
        </div>
        <div class="about-item">
          <h4>Данные</h4>
          <p>Информация хранится в локальной базе данных SQLite.</p>
        </div>
      </div>

      <div class="steps-line">
        <div class="step-item">
          <div class="step-number">1</div>
          <strong>Добавить обучающегося</strong>
          <p>Внести ФИО, класс, данные родителя и сведения о питании.</p>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <strong>Указать категорию</strong>
          <p>Выбрать обычное, льготное или индивидуальное питание.</p>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <strong>Оформить заявку</strong>
          <p>Создать заявку на питание и указать её текущий статус.</p>
        </div>
        <div class="step-item">
          <div class="step-number">4</div>
          <strong>Сформировать отчёт</strong>
          <p>Получить сводную информацию по заявкам и категориям питания.</p>
        </div>
      </div>

      <div class="backup-box">
        <p>Перед переносом приложения или важными изменениями можно создать резервную копию базы данных.</p>
        <button class="secondary-btn" onclick="createBackup()">Создать резервную копию</button>
      </div>
    </div>
  `;
}

async function createBackup() {
  const response = await fetch("/api/backup");
  if (!response.ok) {
    alert("Не удалось создать резервную копию");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "school_meals_backup.db";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Резервная копия создана");
}

function buildReportHtml(summary, latest) {
  const rows = latest.map(row => `
    <tr>
      <td>${row.id}</td>
      <td>${row.student_name ?? ""}</td>
      <td>${row.class_name ?? ""}</td>
      <td>${row.request_date ?? ""}</td>
      <td>${row.category_name ?? ""}</td>
      <td>${row.status ?? ""}</td>
    </tr>
  `).join("");

  return `
    <div class="report-document">
      <h2>Отчёт по организации питания</h2>
      <p><strong>Организация:</strong> МБОУ НОШ «Детство без границ»</p>
      <p><strong>Назначение отчёта:</strong> сводная информация по обучающимся, заявкам и льготным категориям питания.</p>

      <div class="report-summary">
        <div><span>Обучающиеся</span><strong>${summary.students}</strong></div>
        <div><span>Классы</span><strong>${summary.classes}</strong></div>
        <div><span>Заявки</span><strong>${summary.requests}</strong></div>
        <div><span>Льготники</span><strong>${summary.benefits}</strong></div>
        <div><span>Активные заявки</span><strong>${summary.active}</strong></div>
        <div><span>Стоимость меню</span><strong>${summary.menuCost}</strong></div>
      </div>

      <h3>Последние заявки на питание</h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Обучающийся</th>
            <th>Класс</th>
            <th>Дата</th>
            <th>Категория</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function getReportData() {
  const summary = await api("/api/reports/summary");
  const latest = await api("/api/reports/latest");
  return { summary, latest };
}

async function showReportPreview() {
  const { summary, latest } = await getReportData();
  const preview = document.getElementById("reportPreview");
  preview.innerHTML = buildReportHtml(summary, latest);
  preview.classList.remove("hidden");
  showToast("Отчёт сформирован");
}

async function downloadReport() {
  const response = await fetch("/api/reports/export");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "meal_report.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Отчёт скачан");
}

async function printReport() {
  const { summary, latest } = await getReportData();
  const reportHtml = buildReportHtml(summary, latest);

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Отчёт по питанию</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
        h2 { text-align: center; margin-bottom: 20px; }
        p { font-size: 14px; line-height: 1.5; }
        .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
        .report-summary div { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
        .report-summary span { display: block; font-size: 12px; color: #64748b; }
        .report-summary strong { display: block; font-size: 24px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f1f5f9; }
      </style>
    </head>
    <body>${reportHtml}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}


function makeSectionCards(items) {
  return `
    <div class="section-cards">
      ${items.map(item => `
        <div class="section-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSectionInfo(rows) {
  if (!sectionInfo) return;

  if (currentConfig.entity === "students") {
    const benefitCount = rows.filter(row => row.benefit_name && row.benefit_name !== "Без льготы").length;
    const regularCount = rows.filter(row => row.category_name === "Обычное питание").length;
    const benefitMealCount = rows.filter(row => row.category_name === "Льготное питание").length;
    const individualCount = rows.filter(row => row.category_name === "Индивидуальное питание").length;

    sectionInfo.innerHTML = makeSectionCards([
      { label: "Всего обучающихся", value: rows.length },
      { label: "Льготники", value: benefitCount },
      { label: "Обычное питание", value: regularCount },
      { label: "Индивидуальное питание", value: individualCount || benefitMealCount }
    ]);
    return;
  }

  if (currentConfig.entity === "requests") {
    sectionInfo.innerHTML = makeSectionCards([
      { label: "Всего заявок", value: rows.length },
      { label: "Новые", value: rows.filter(row => row.status === "Новая").length },
      { label: "В обработке", value: rows.filter(row => row.status === "В обработке").length },
      { label: "Подтверждено", value: rows.filter(row => row.status === "Подтверждена").length }
    ]);
    return;
  }

  if (currentConfig.entity === "menu") {
    const totalCost = rows.reduce((sum, row) => sum + Number(row.price || 0), 0);
    const cards = makeSectionCards([
      { label: "Позиций меню", value: rows.length },
      { label: "Завтраки", value: rows.filter(row => row.meal_type === "Завтрак").length },
      { label: "Обеды", value: rows.filter(row => row.meal_type === "Обед").length },
      { label: "Общая стоимость", value: totalCost }
    ]);

    const previewRows = rows.slice(0, 6);
    const menuPreview = `
      <div class="menu-preview">
        <h3>Ближайшие позиции меню</h3>
        <div class="menu-card-grid">
          ${previewRows.map(row => `
            <div class="menu-day-card">
              <span class="meal-type">${row.meal_type ?? ""}</span>
              <p><strong>Дата:</strong> ${row.date ?? ""}</p>
              <p>${row.dish ?? ""}</p>
              <p><strong>Стоимость:</strong> ${row.price ?? 0}</p>
            </div>
          `).join("") || "<p>Меню пока не заполнено.</p>"}
        </div>
      </div>
    `;

    sectionInfo.innerHTML = cards + menuPreview;
    return;
  }

  if (currentConfig.entity === "classes") {
    sectionInfo.innerHTML = makeSectionCards([
      { label: "Всего классов", value: rows.length },
      { label: "Ответственные", value: rows.filter(row => row.teacher).length },
      { label: "Справочник", value: "Классы" },
      { label: "Статус", value: "Активен" }
    ]);
    return;
  }

  if (currentConfig.entity === "categories") {
    sectionInfo.innerHTML = makeSectionCards([
      { label: "Категорий", value: rows.length },
      { label: "Обычное питание", value: rows.filter(row => row.name === "Обычное питание").length },
      { label: "Льготное питание", value: rows.filter(row => row.name === "Льготное питание").length },
      { label: "Индивидуальное", value: rows.filter(row => row.name === "Индивидуальное питание").length }
    ]);
    return;
  }

  if (currentConfig.entity === "benefits") {
    sectionInfo.innerHTML = makeSectionCards([
      { label: "Всего льгот", value: rows.length },
      { label: "Нужен документ", value: rows.filter(row => row.document_required === "Да").length },
      { label: "Без документа", value: rows.filter(row => row.document_required === "Нет").length },
      { label: "Справочник", value: "Льготы" }
    ]);
    return;
  }

  sectionInfo.innerHTML = "";
}

function categoryClass(category) {
  if (category === "Обычное питание") return "category-regular";
  if (category === "Льготное питание") return "category-benefit";
  if (category === "Индивидуальное питание") return "category-individual";
  return "category-default";
}

async function loadTable() {
  currentRows = await api(`/api/${currentConfig.entity}`);
  renderSectionInfo(currentRows);
  renderTable(currentRows);
}

function setupFilter(rows) {
  if (!currentConfig.filter) {
    filterSelect.classList.add("hidden");
    filterSelect.innerHTML = "";
    return;
  }

  const key = currentConfig.filter.key;
  const values = [...new Set(rows.map(row => row[key]).filter(Boolean))];

  filterSelect.classList.remove("hidden");
  filterSelect.innerHTML = `<option value="">${currentConfig.filter.label}</option>` +
    values.map(value => `<option value="${value}">${value}</option>`).join("");
}

function statusClass(status) {
  if (status === "Новая") return "status-new";
  if (status === "В обработке") return "status-process";
  if (status === "Подтверждена") return "status-ok";
  if (status === "Отклонена") return "status-no";
  if (status === "Отменена") return "status-cancel";
  return "status-cancel";
}

function formatCell(key, value) {
  if (key === "status") {
    return `<span class="status-badge ${statusClass(value)}">${value ?? ""}</span>`;
  }

  if (key === "category_name" && value) {
    return `<span class="category-badge ${categoryClass(value)}">${value}</span>`;
  }

  return value ?? "";
}

function renderTable(rows) {
  setupFilter(rows);

  const query = searchInput.value.trim().toLowerCase();
  const filterValue = filterSelect.value;
  const filterKey = currentConfig.filter?.key;

  const filteredRows = rows.filter(row => {
    const matchesSearch = !query || Object.values(row).some(value =>
      String(value ?? "").toLowerCase().includes(query)
    );
    const matchesFilter = !filterValue || String(row[filterKey] ?? "") === filterValue;
    return matchesSearch && matchesFilter;
  });

  tableHead.innerHTML = `<tr>${currentConfig.columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>`;
  if (filteredRows.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="${currentConfig.columns.length}">
          <div class="empty-state">Записи не найдены. Измените запрос поиска или добавьте новую запись.</div>
        </td>
      </tr>
    `;
  } else {
    tableBody.innerHTML = filteredRows.map(row => `
      <tr data-id="${row.id}" class="${row.id === selectedId ? "selected" : ""}">
        ${currentConfig.columns.map(([key]) => `<td>${formatCell(key, row[key])}</td>`).join("")}
      </tr>
    `).join("");
  }

  tableBody.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", () => {
      selectedId = Number(tr.dataset.id);
      const row = currentRows.find(item => item.id === selectedId);
      fillForm(row);
      renderTable(currentRows);
    });
  });
}

function renderForm() {
  formTitle.textContent = "Добавление записи";
  formHint.textContent = "Выберите строку в таблице для изменения или удаления.";
  selectedId = null;
  hideStudentCard();

  formFields.innerHTML = currentConfig.fields.map(field => {
    if (field.type === "select") {
      const options = optionsCache[field.source] || [];
      return `
        <label>${field.label}</label>
        <select name="${field.name}" ${field.required ? "required" : ""}>
          <option value="">Выберите значение</option>
          ${options.map(option => `<option value="${option.id}">${option.name}</option>`).join("")}
        </select>
      `;
    }

    if (field.type === "select-static") {
      return `
        <label>${field.label}</label>
        <select name="${field.name}" ${field.required ? "required" : ""}>
          ${field.options.map(option => `<option value="${option}">${option}</option>`).join("")}
        </select>
      `;
    }

    if (field.type === "textarea") {
      return `<label>${field.label}</label><textarea name="${field.name}" ${field.required ? "required" : ""}></textarea>`;
    }

    return `<label>${field.label}</label><input name="${field.name}" type="${field.type}" ${field.required ? "required" : ""} />`;
  }).join("");
}

function fillForm(row) {
  renderStudentCard(row);
  formTitle.textContent = "Изменение записи";
  formHint.textContent = `Выбрана запись №${row.id}`;

  currentConfig.fields.forEach(field => {
    const element = editForm.elements[field.name];
    if (element) element.value = row[field.name] ?? "";
  });
}

function renderStudentCard(row) {
  if (!studentCardBox) return;
  if (currentConfig.entity !== "students" || !row) {
    hideStudentCard();
    return;
  }

  studentCardBox.innerHTML = `
    <h4>Карточка питания</h4>
    <p><strong>ФИО:</strong> ${row.full_name ?? ""}</p>
    <p><strong>Класс:</strong> ${row.class_name ?? ""}</p>
    <p><strong>Родитель:</strong> ${row.parent_name ?? ""}</p>
    <p><strong>Телефон:</strong> ${row.parent_phone ?? ""}</p>
    <p><strong>Категория питания:</strong> ${row.category_name ?? ""}</p>
    <p><strong>Льгота:</strong> ${row.benefit_name ?? ""}</p>
  `;
  studentCardBox.classList.remove("hidden");
}

function getFormData() {
  const data = {};
  currentConfig.fields.forEach(field => {
    const element = editForm.elements[field.name];
    if (!element) return;

    if (field.type === "number") {
      data[field.name] = Number(element.value || 0);
    } else if (field.type === "select" && element.value) {
      data[field.name] = Number(element.value);
    } else {
      data[field.name] = element.value.trim();
    }
  });
  return data;
}

function validateFormData(data) {
  const phoneFields = ["parent_phone"];
  for (const field of phoneFields) {
    if (data[field]) {
      const phoneRegex = new RegExp("^[+0-9\\\\s() -]{7,20}$");
      if (!phoneRegex.test(data[field])) {
        alert("Проверьте корректность номера телефона");
        return false;
      }
    }
  }

  if ("price" in data && Number(data.price) < 0) {
    alert("Стоимость не может быть отрицательной");
    return false;
  }

  return true;
}

editForm.addEventListener("submit", async event => {
  event.preventDefault();

  const data = getFormData();

  if (!validateFormData(data)) {
    return;
  }

  try {
    if (selectedId) {
      await api(`/api/${currentConfig.entity}/${selectedId}`, { method: "PUT", body: JSON.stringify(data) });
      showToast("Запись изменена");
    } else {
      await api(`/api/${currentConfig.entity}`, { method: "POST", body: JSON.stringify(data) });
      showToast("Запись добавлена");
    }

    renderForm();
    await loadOptions();
    await loadTable();
  } catch (err) {
    alert(err.message);
  }
});

deleteButton.addEventListener("click", async () => {
  if (!selectedId) {
    alert("Выберите запись для удаления");
    return;
  }

  if (!confirm("Удалить выбранную запись?")) return;

  try {
    await api(`/api/${currentConfig.entity}/${selectedId}`, { method: "DELETE" });
    showToast("Запись удалена");
    renderForm();
    await loadOptions();
    await loadTable();
  } catch (err) {
    alert(err.message);
  }
});

clearButton.addEventListener("click", () => {
  renderForm();
  renderTable(currentRows);
  showToast("Форма очищена");
});

newButton.addEventListener("click", () => {
  renderForm();
  renderTable(currentRows);
});

searchInput.addEventListener("input", () => renderTable(currentRows));
filterSelect.addEventListener("change", () => renderTable(currentRows));
