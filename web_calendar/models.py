from flask_login import UserMixin

from web_calendar import db, login_manager   # ← здесь manager → login_manager

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(128), unique=True, nullable=False)
    login = db.Column(db.String(128), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

# меняем декоратор на login_manager
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
