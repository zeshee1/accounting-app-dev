const fs = require("fs");
const path = require("path");

const employeesPath = path.join(__dirname, "../data/employees.json");
const attendancePath = path.join(__dirname, "../data/attendance.json");
const salaryPath = path.join(__dirname, "../data/salary_transactions.json");

function loadJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}
function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

exports.getAttendancePage = (req, res) => {
  const employees = loadJSON(employeesPath);
  res.render("salary/add-attendance", { employees });
};

exports.saveAttendance = (req, res) => {
  const attendance = loadJSON(attendancePath);
  attendance.push(req.body);
  saveJSON(attendancePath, attendance);
  res.redirect("/salary/attendance");
};

exports.generateSalaryPage = (req, res) => {
  const employees = loadJSON(employeesPath);
  res.render("salary/generate-salary", { employees });
};

exports.generateSalary = (req, res) => {
  const { month } = req.body;
  const employees = loadJSON(employeesPath);
  const attendance = loadJSON(attendancePath);
  const salaries = loadJSON(salaryPath);

  const daysInMonth = new Date(2025, month, 0).getDate(); // e.g., 2025-05 = 31

  employees.forEach(emp => {
    const empAttendance = attendance.filter(a =>
      a.employee_id === emp.id &&
      a.date.startsWith(`2025-${month}`)
    );

    const presentDays = empAttendance.filter(a => a.status === "Present").length;

    const net_salary = Math.round((emp.salary / daysInMonth) * presentDays);

    salaries.push({
      employee_id: emp.id,
      name: emp.name,
      month: `2025-${month}`,
      salary: emp.salary,
      present_days: presentDays,
      total_days: daysInMonth,
      net_salary,
      status: "Unpaid"
    });
  });

  saveJSON(salaryPath, salaries);
  res.redirect("/salary/salary-report");
};

exports.paySalary = (req, res) => {
  const { employeeId, month } = req.params;
  const salaries = loadJSON(salaryPath);

  const salary = salaries.find(
    s => s.employee_id === employeeId && s.month === month
  );

  if (salary) {
    salary.status = "Paid";
    salary.paid_on = new Date().toISOString().slice(0, 10);
  }

  saveJSON(salaryPath, salaries);
  res.redirect("/salary/salary-report");
};

exports.salaryReport = (req, res) => {
  const salaries = loadJSON(salaryPath);
  res.render("salary/salary-report", { salaries });
};
