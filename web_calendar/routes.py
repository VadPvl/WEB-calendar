from flask import render_template, redirect, url_for, request, flash
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import check_password_hash, generate_password_hash

from web_calendar import db
from web_calendar import login_manager   # нужен, чтобы достучаться до current_app?
from web_calendar import create_app      # не требуется
from web_calendar.models import User
from flask import current_app as app     # берём экземпляр из контекста

@app.route("/")
def initial_page():
    return redirect(url_for('login_page'))

@app.route("/calendar")
@login_required
def calendar_page():
    return render_template('calendar_template.html')

@app.route("/login", methods=['GET', 'POST'])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('calendar_page'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        if not email or not password:
            flash("Поля почты и пароля должны быть заполнены")
            return render_template('login.html')

        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('calendar_page'))
        else:
            flash("Неверная почта или пароль")

    return render_template('login.html')


@app.route("/register", methods=['POST'])
def register():
    login_name = request.form.get('login')
    email = request.form.get('email')
    password = request.form.get('password')
    password2 = request.form.get('password2')

    # проверяем заполнение полей
    if not login_name or not email or not password or not password2:
        flash("Все поля должны быть заполнены")
        return redirect(url_for('login_page') + '#register')

    # проверяем, нет ли уже такого email
    if User.query.filter_by(email=email).first():
        flash("Пользователь с таким email уже существует")
        return redirect(url_for('login_page') + '#register')

    if password != password2:
        flash("Пароли не совпадают")
        return redirect(url_for('login_page') + '#register')

    # создаём пользователя
    new_user = User(login=login_name, email=email,
                    password_hash=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()

    # сразу логиним
    login_user(new_user)
    return redirect(url_for('calendar_page'))


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('login_page'))


# Преобразуем 401 в редирект на /login
@app.errorhandler(401)
def unauthorized(e):
    return redirect(url_for('login_page') + '?next=' + request.path)
