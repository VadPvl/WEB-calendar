// Путь: web_calendar/static/js/calendar.js

document.addEventListener('DOMContentLoaded', () => {
  // вспомогательные функции
  const pad = n => String(n).padStart(2, '0');
  function formatLocalDate(y, m, d) {
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // элементы страницы
  const monthYearEl = document.getElementById('month-year');
  const gridEl      = document.getElementById('calendar-grid');
  const prevBtn     = document.getElementById('prev-month');
  const nextBtn     = document.getElementById('next-month');
  const viewPanel   = document.getElementById('view-panel');
  const editPanel   = document.getElementById('edit-panel');
  const selectedDateEl = document.getElementById('selected-date');
  const eventsList  = document.getElementById('events-list');
  const addBtn      = document.getElementById('add-event');
  const form        = document.getElementById('event-form');
  const deleteBtn   = document.getElementById('delete-btn');
  const closeEdit   = document.getElementById('close-edit');

  let currentDate = new Date();
  let currentView = 'day';
  let activeDate;      // строка 'YYYY-MM-DD'
  let allEvents = [];  // сырые данные API
  let occEvents = [];  // сгенерированные вхождения в текущем месяце

  // ===========================
  // 1. Рендер календаря
  // ===========================
  function renderCalendar(date) {
    gridEl.innerHTML = '';
    const y = date.getFullYear(), m = date.getMonth();
    monthYearEl.textContent = date.toLocaleString('ru', { month:'long', year:'numeric' });

    // заголовки дней
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(lbl => {
      const div = document.createElement('div');
      div.className = 'day-header';
      div.textContent = lbl;
      gridEl.appendChild(div);
    });

    // первый день недели и количество дней
    const firstDow = (new Date(y, m, 1).getDay() || 7);
    const daysInPrev = new Date(y, m, 0).getDate();
    const daysInMonth = new Date(y, m+1, 0).getDate();

    // дни предыдущего месяца (неактивные)
    for (let i = firstDow - 1; i > 0; i--) {
      const d = daysInPrev - i + 1;
      const btn = document.createElement('button');
      btn.className = 'calendar-day inactive';
      btn.textContent = d;
      gridEl.appendChild(btn);
    }

    // дни текущего месяца
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.className = 'calendar-day';
      btn.textContent = d;
      const iso = formatLocalDate(y, m+1, d);
      btn.dataset.date = iso;
      btn.addEventListener('click', () => onDayClick(iso));
      gridEl.appendChild(btn);
    }

    // дни следующего месяца (заполнитель)
    const total = firstDow - 1 + daysInMonth;
    const rem = (7 - total % 7) % 7;
    for (let i = 1; i <= rem; i++) {
      const btn = document.createElement('button');
      btn.className = 'calendar-day inactive';
      btn.textContent = i;
      gridEl.appendChild(btn);
    }

    fetchAndProcessEvents();
  }

  // ===========================
  // 2. Загрузка и генерация повторов
  // ===========================
  async function fetchAndProcessEvents() {
    const y = currentDate.getFullYear(), m = currentDate.getMonth() + 1;
    allEvents = await fetch(`/api/events?year=${y}&month=${m}`)
                   .then(r => r.json());

    occEvents = [];
    const daysInMonth = new Date(y, currentDate.getMonth()+1, 0).getDate();

    allEvents.forEach(e => {
      // разбираем исходную дату события
      const [ey, em, ed] = e.date.split('-').map(Number);
      const origDow = new Date(ey, em-1, ed).getDay();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatLocalDate(y, m, d);
        // пропускаем до начала события
        if (dateStr < e.date) continue;

        let include = false;
        if (e.frequency === 'none' && dateStr === e.date) include = true;
        if (e.frequency === 'daily') include = true;
        if (e.frequency === 'weekly') {
          if (new Date(y, m-1, d).getDay() === origDow) include = true;
        }
        if (e.frequency === 'monthly') {
          if (d === ed) include = true;
        }

        if (include) {
          // вхождение с локальной датой
          occEvents.push({ ...e, date: dateStr });
        }
      }
    });

    // очищаем предыдущие точки
    document.querySelectorAll('.calendar-day .dot').forEach(el => el.remove());
    // рисуем новые
    occEvents.forEach(e => {
      const btn = gridEl.querySelector(`.calendar-day[data-date="${e.date}"]`);
      if (btn) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        btn.appendChild(dot);
      }
    });
  }

  // ===========================
  // 3. Обработка клика по дню
  // ===========================
  function onDayClick(dateStr) {
    // подсветка
    document.querySelectorAll('.calendar-day').forEach(b=>b.classList.remove('active'));
    const btn = gridEl.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (!btn) return;
    btn.classList.add('active');

    activeDate = dateStr;
    // показываем панель просмотра
    editPanel.style.display = 'none';
    viewPanel.style.display = 'flex';
    selectedDateEl.textContent =
      `Выбранная дата: ${btn.textContent} ${currentDate.toLocaleString('ru',{month:'long'})} ${currentDate.getFullYear()}`;
    renderViewList();
  }

  // ===========================
  // 4. Рендер списка событий
  // ===========================
  function renderViewList() {
    eventsList.innerHTML = '';
    let list = [];

    if (currentView === 'day') {
      list = occEvents.filter(e => e.date === activeDate);
    } else if (currentView === 'week') {
      const sel = parseLocalDate(activeDate);
      const dow = sel.getDay() || 7;
      const start = new Date(sel); start.setDate(sel.getDate() - dow + 1);
      const end   = new Date(start); end.setDate(start.getDate() + 6);
      list = occEvents.filter(e => {
        const d = parseLocalDate(e.date);
        return d >= start && d <= end;
      });
    } else { // month
      list = occEvents.filter(e => e.date.startsWith(activeDate.slice(0,7)));
    }

    if (!list.length) {
      eventsList.innerHTML = '<div class="event-item">Нет событий</div>';
      return;
    }
    list.forEach(e => {
      const div = document.createElement('div');
      div.className = 'event-item';
      if (currentView === 'day') {
        div.textContent = `${e.time} — ${e.title}`;
      } else if (currentView === 'week') {
        div.textContent = `${e.date} ${e.time} — ${e.title}`;
      } else {
        div.textContent = `${e.date} — ${e.title}`;
      }
      // кнопка редактирования
      const edit = document.createElement('button');
      edit.textContent = '✎';
      edit.style.marginLeft = '10px';
      edit.addEventListener('click', () => openEdit(e));
      div.appendChild(edit);
      eventsList.appendChild(div);
    });
  }

  // ===========================
  // 5. Редактирование и создание
  // ===========================
  function openEdit(evt) {
    viewPanel.style.display = 'none';
    editPanel.style.display = 'flex';
    form.dataset.id = evt.id;
    form.title.value       = evt.title;
    form.description.value = evt.description;
    const [s, e] = (evt.time || '').split('-');
    form.start_time.value  = s || '';
    form.end_time.value    = e || '';
    form.frequency.value   = evt.frequency;
    deleteBtn.style.display = 'inline-block';
  }

  addBtn.addEventListener('click', () => {
    viewPanel.style.display = 'none';
    editPanel.style.display = 'flex';
    form.reset();
    form.dataset.id = '';
    deleteBtn.style.display = 'none';
  });
  closeEdit.addEventListener('click', () => {
    editPanel.style.display = 'none';
    viewPanel.style.display = activeDate ? 'flex' : 'none';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: form.title.value,
      description: form.description.value,
      start: `${activeDate}T${form.start_time.value}`,
      end:   form.end_time.value ? `${activeDate}T${form.end_time.value}` : null,
      frequency: form.frequency.value
    };
    const id = form.dataset.id;
    const url = id ? `/api/events/${id}` : '/api/events';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editPanel.style.display = 'none';
      renderCalendar(currentDate);
      onDayClick(activeDate);
    } else {
      alert('Ошибка при сохранении');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const id = form.dataset.id;
    if (!id || !confirm('Удалить событие?')) return;
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      editPanel.style.display = 'none';
      renderCalendar(currentDate);
      onDayClick(activeDate);
    }
  });

  // навигация месяцев
  prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });
  nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  // переключение view
  document.querySelectorAll('.view-button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-button').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderViewList();
    });
  });

  // стартовый рендер
  renderCalendar(currentDate);
});
