from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'events.login_page'  # указываем полное имя

def create_app():
    app = Flask(
        __name__,
        static_folder='static',
        template_folder='templates'
    )
    app.config['SECRET_KEY'] = 'your-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        'postgresql://postgres:1234@localhost:5432/users'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)

    with app.app_context():
        from web_calendar.routes import bp as events_bp
        app.register_blueprint(events_bp)
        db.create_all()

    return app
