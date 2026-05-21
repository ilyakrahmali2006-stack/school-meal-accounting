import json
import os
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DB_PATH = BASE_DIR / "school_meals.db"
PORT = int(os.environ.get("PORT", "3000"))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS Classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            teacher TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS MealCategories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS Benefits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            document_required TEXT NOT NULL DEFAULT 'Да'
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS Students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            class_id INTEGER NOT NULL,
            parent_name TEXT,
            parent_phone TEXT,
            category_id INTEGER,
            benefit_id INTEGER,
            FOREIGN KEY (class_id) REFERENCES Classes(id) ON DELETE RESTRICT,
            FOREIGN KEY (category_id) REFERENCES MealCategories(id) ON DELETE SET NULL,
            FOREIGN KEY (benefit_id) REFERENCES Benefits(id) ON DELETE SET NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS MenuItems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            dish TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS MealRequests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            request_date TEXT NOT NULL,
            category_id INTEGER,
            status TEXT NOT NULL DEFAULT 'Новая',
            comment TEXT,
            FOREIGN KEY (student_id) REFERENCES Students(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES MealCategories(id) ON DELETE SET NULL
        )
    """)

    count = cur.execute("SELECT COUNT(*) FROM Classes").fetchone()[0]
    if count == 0:
        cur.executemany("INSERT INTO Classes (name, teacher) VALUES (?, ?)", [
            ("1А", "Иванова Марина Петровна"),
            ("2Б", "Смирнова Елена Викторовна"),
            ("3А", "Кузнецова Ольга Сергеевна"),
            ("4Б", "Орлова Наталья Игоревна"),
        ])

        cur.executemany("INSERT INTO MealCategories (name, description) VALUES (?, ?)", [
            ("Обычное питание", "Стандартное школьное питание"),
            ("Льготное питание", "Питание для обучающихся льготных категорий"),
            ("Индивидуальное питание", "Питание с учетом особенностей обучающегося"),
        ])

        cur.executemany("INSERT INTO Benefits (name, document_required) VALUES (?, ?)", [
            ("Многодетная семья", "Да"),
            ("Малообеспеченная семья", "Да"),
            ("ОВЗ", "Да"),
            ("Без льготы", "Нет"),
        ])

        cur.executemany("""
            INSERT INTO Students
            (full_name, class_id, parent_name, parent_phone, category_id, benefit_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            ("Петров Артём Ильич", 1, "Петрова Анна Сергеевна", "+7 900 111-22-33", 1, 4),
            ("Соколова Дарья Павловна", 2, "Соколова Ирина Андреевна", "+7 900 222-33-44", 2, 1),
            ("Морозов Кирилл Олегович", 3, "Морозова Светлана Игоревна", "+7 900 333-44-55", 2, 2),
            ("Егорова Алиса Максимовна", 4, "Егорова Мария Дмитриевна", "+7 900 777-88-99", 3, 3),
        ])

        cur.executemany("INSERT INTO MenuItems (date, meal_type, dish, price) VALUES (?, ?, ?, ?)", [
            ("2026-02-02", "Завтрак", "Каша овсяная, чай, хлеб", 85),
            ("2026-02-02", "Обед", "Суп, котлета с гарниром, компот", 150),
            ("2026-02-03", "Полдник", "Запеканка творожная, чай", 70),
        ])

        cur.executemany("""
            INSERT INTO MealRequests (student_id, request_date, category_id, status, comment)
            VALUES (?, ?, ?, ?, ?)
        """, [
            (1, "2026-02-02", 1, "Подтверждена", "Стандартное питание"),
            (2, "2026-02-02", 2, "В обработке", "Проверить документы"),
            (3, "2026-02-03", 2, "Новая", "Ожидает рассмотрения"),
            (4, "2026-02-03", 3, "Подтверждена", "Индивидуальное питание"),
        ])

    conn.commit()
    conn.close()

TABLES = {
    "classes": {
        "table": "Classes",
        "select": "SELECT * FROM Classes ORDER BY id DESC",
        "fields": ["name", "teacher"]
    },
    "categories": {
        "table": "MealCategories",
        "select": "SELECT * FROM MealCategories ORDER BY id DESC",
        "fields": ["name", "description"]
    },
    "benefits": {
        "table": "Benefits",
        "select": "SELECT * FROM Benefits ORDER BY id DESC",
        "fields": ["name", "document_required"]
    },
    "students": {
        "table": "Students",
        "select": """
            SELECT Students.*, Classes.name AS class_name,
                   MealCategories.name AS category_name,
                   Benefits.name AS benefit_name
            FROM Students
            LEFT JOIN Classes ON Classes.id = Students.class_id
            LEFT JOIN MealCategories ON MealCategories.id = Students.category_id
            LEFT JOIN Benefits ON Benefits.id = Students.benefit_id
            ORDER BY Students.id DESC
        """,
        "fields": ["full_name", "class_id", "parent_name", "parent_phone", "category_id", "benefit_id"]
    },
    "menu": {
        "table": "MenuItems",
        "select": "SELECT * FROM MenuItems ORDER BY date DESC, id DESC",
        "fields": ["date", "meal_type", "dish", "price"]
    },
    "requests": {
        "table": "MealRequests",
        "select": """
            SELECT MealRequests.*, Students.full_name AS student_name,
                   Classes.name AS class_name,
                   MealCategories.name AS category_name
            FROM MealRequests
            LEFT JOIN Students ON Students.id = MealRequests.student_id
            LEFT JOIN Classes ON Classes.id = Students.class_id
            LEFT JOIN MealCategories ON MealCategories.id = MealRequests.category_id
            ORDER BY MealRequests.id DESC
        """,
        "fields": ["student_id", "request_date", "category_id", "status", "comment"]
    }
}

def rows_to_list(rows):
    return [dict(row) for row in rows]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def send_json(self, data, status=200):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        path = urlparse(self.path).path

        try:
            if path == "/api/meta/options":
                conn = get_db()
                data = {
                    "classes": rows_to_list(conn.execute("SELECT id, name FROM Classes ORDER BY name").fetchall()),
                    "categories": rows_to_list(conn.execute("SELECT id, name FROM MealCategories ORDER BY name").fetchall()),
                    "benefits": rows_to_list(conn.execute("SELECT id, name FROM Benefits ORDER BY name").fetchall()),
                    "students": rows_to_list(conn.execute("SELECT id, full_name AS name FROM Students ORDER BY full_name").fetchall()),
                }
                conn.close()
                return self.send_json(data)

            if path == "/api/reports/summary":
                conn = get_db()
                data = {
                    "students": conn.execute("SELECT COUNT(*) AS value FROM Students").fetchone()["value"],
                    "classes": conn.execute("SELECT COUNT(*) AS value FROM Classes").fetchone()["value"],
                    "requests": conn.execute("SELECT COUNT(*) AS value FROM MealRequests").fetchone()["value"],
                    "benefits": conn.execute("""
                        SELECT COUNT(*) AS value
                        FROM Students
                        LEFT JOIN Benefits ON Benefits.id = Students.benefit_id
                        WHERE Benefits.name IS NOT NULL AND Benefits.name != 'Без льготы'
                    """).fetchone()["value"],
                    "active": conn.execute("""
                        SELECT COUNT(*) AS value FROM MealRequests
                        WHERE status IN ('Новая', 'В обработке')
                    """).fetchone()["value"],
                    "menuCost": conn.execute("SELECT IFNULL(SUM(price), 0) AS value FROM MenuItems").fetchone()["value"],
                }
                conn.close()
                return self.send_json(data)

            if path == "/api/reports/statuses":
                conn = get_db()
                rows = rows_to_list(conn.execute("""
                    SELECT status, COUNT(*) AS count
                    FROM MealRequests
                    GROUP BY status
                    ORDER BY count DESC
                """).fetchall())
                conn.close()
                return self.send_json(rows)

            if path == "/api/reports/latest":
                conn = get_db()
                rows = rows_to_list(conn.execute("""
                    SELECT MealRequests.id, MealRequests.request_date, MealRequests.status,
                           Students.full_name AS student_name,
                           Classes.name AS class_name,
                           MealCategories.name AS category_name
                    FROM MealRequests
                    LEFT JOIN Students ON Students.id = MealRequests.student_id
                    LEFT JOIN Classes ON Classes.id = Students.class_id
                    LEFT JOIN MealCategories ON MealCategories.id = MealRequests.category_id
                    ORDER BY MealRequests.id DESC
                    LIMIT 8
                """).fetchall())
                conn.close()
                return self.send_json(rows)

            if path == "/api/reports/export":
                conn = get_db()
                summary = {
                    "students": conn.execute("SELECT COUNT(*) AS value FROM Students").fetchone()["value"],
                    "requests": conn.execute("SELECT COUNT(*) AS value FROM MealRequests").fetchone()["value"],
                    "benefits": conn.execute("""
                        SELECT COUNT(*) AS value
                        FROM Students
                        LEFT JOIN Benefits ON Benefits.id = Students.benefit_id
                        WHERE Benefits.name IS NOT NULL AND Benefits.name != 'Без льготы'
                    """).fetchone()["value"],
                    "active": conn.execute("""
                        SELECT COUNT(*) AS value FROM MealRequests
                        WHERE status IN ('Новая', 'В обработке')
                    """).fetchone()["value"],
                }
                conn.close()
                text = (
                    "ОТЧЕТ ПО ОРГАНИЗАЦИИ ПИТАНИЯ\n"
                    "МБОУ НОШ «Детство без границ»\n\n"
                    f"Количество обучающихся: {summary['students']}\n"
                    f"Количество заявок на питание: {summary['requests']}\n"
                    f"Количество льготников: {summary['benefits']}\n"
                    f"Активные заявки: {summary['active']}\n"
                )
                raw = text.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Disposition", "attachment; filename=meal_report.txt")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return

            if path == "/api/backup":
                backup_dir = BASE_DIR / "backups"
                backup_dir.mkdir(exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = backup_dir / f"school_meals_backup_{timestamp}.db"
                if DB_PATH.exists():
                    shutil.copy2(DB_PATH, backup_path)
                raw = backup_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f"attachment; filename={backup_path.name}")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return

            if path.startswith("/api/"):
                entity = path.split("/")[-1]
                config = TABLES.get(entity)
                if not config:
                    return self.send_json({"message": "Раздел не найден"}, 404)
                conn = get_db()
                rows = rows_to_list(conn.execute(config["select"]).fetchall())
                conn.close()
                return self.send_json(rows)

            return super().do_GET()
        except Exception as err:
            return self.send_json({"message": str(err)}, 500)

    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_json()

        try:
            if path == "/api/login":
                if data.get("login") == "admin" and data.get("password") == "admin":
                    return self.send_json({"ok": True})
                return self.send_json({"ok": False, "message": "Неверный логин или пароль"}, 401)

            if path.startswith("/api/"):
                entity = path.split("/")[-1]
                config = TABLES.get(entity)
                if not config:
                    return self.send_json({"message": "Раздел не найден"}, 404)

                fields = config["fields"]
                values = [data.get(field) if data.get(field) != "" else None for field in fields]
                placeholders = ", ".join(["?"] * len(fields))
                sql = f"INSERT INTO {config['table']} ({', '.join(fields)}) VALUES ({placeholders})"

                conn = get_db()
                cur = conn.cursor()
                cur.execute(sql, values)
                conn.commit()
                new_id = cur.lastrowid
                conn.close()
                return self.send_json({"id": new_id})

            return self.send_json({"message": "Маршрут не найден"}, 404)
        except Exception as err:
            return self.send_json({"message": str(err)}, 400)

    def do_PUT(self):
        parts = urlparse(self.path).path.strip("/").split("/")
        data = self.read_json()

        try:
            if len(parts) == 3 and parts[0] == "api":
                entity, record_id = parts[1], parts[2]
                config = TABLES.get(entity)
                if not config:
                    return self.send_json({"message": "Раздел не найден"}, 404)

                fields = config["fields"]
                values = [data.get(field) if data.get(field) != "" else None for field in fields]
                values.append(record_id)
                set_sql = ", ".join([f"{field} = ?" for field in fields])
                sql = f"UPDATE {config['table']} SET {set_sql} WHERE id = ?"

                conn = get_db()
                conn.execute(sql, values)
                conn.commit()
                conn.close()
                return self.send_json({"ok": True})
            return self.send_json({"message": "Маршрут не найден"}, 404)
        except Exception as err:
            return self.send_json({"message": str(err)}, 400)

    def do_DELETE(self):
        parts = urlparse(self.path).path.strip("/").split("/")

        try:
            if len(parts) == 3 and parts[0] == "api":
                entity, record_id = parts[1], parts[2]
                config = TABLES.get(entity)
                if not config:
                    return self.send_json({"message": "Раздел не найден"}, 404)

                conn = get_db()
                conn.execute(f"DELETE FROM {config['table']} WHERE id = ?", [record_id])
                conn.commit()
                conn.close()
                return self.send_json({"ok": True})
            return self.send_json({"message": "Маршрут не найден"}, 404)
        except Exception:
            return self.send_json({"message": "Запись связана с другими данными или не может быть удалена"}, 400)

if __name__ == "__main__":
    init_db()
    print("")
    print("==============================================")
    print(" School meal accounting system is running")
    print(f" URL: http://0.0.0.0:{PORT}")
    print(" Login: admin")
    print(" Password: admin")
    print("==============================================")
    print("")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
