from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'login_page'    # куда перенаправлять неавторизованных

def create_app():
    app = Flask(__name__)

    # конфигурация
    app.config['SECRET_KEY'] = 'your-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:1234@localhost:5432/users'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # инициализация расширений
    db.init_app(app)
    login_manager.init_app(app)

    # регистрируем маршруты (импорт здесь, чтобы app уже существовал)
    with app.app_context():
        from web_calendar import routes   # подключит все @app.route
        db.create_all()         # создаст таблицы

    return app
