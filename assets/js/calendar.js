document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const ICAL_URL = 'https://www.airbnb.com/calendar/ical/688826624995880642.ics?t=8fa9d8fc43634c38b289f6ffbdde2350';

  const PROXIES = [
    url => 'https://proxy.cors.sh/' + url,
    url => 'https://corsproxy.io/?' + encodeURIComponent(url),
    url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ];

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let bookedDates = new Set();

  function parseIcal(icsText) {
    const dates = new Set();
    const events = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      const dtstart = event.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
      const dtend = event.match(/DTEND[^:]*:(\d{4})(\d{2})(\d{2})/);

      if (dtstart) {
        const startDate = new Date(+dtstart[1], +dtstart[2] - 1, +dtstart[3]);
        let endDate;

        if (dtend) {
          endDate = new Date(+dtend[1], +dtend[2] - 1, +dtend[3]);
        } else {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }

        let d = new Date(startDate);
        while (d < endDate) {
          dates.add(d.toISOString().slice(0, 10));
          d.setDate(d.getDate() + 1);
        }
      }
    }
    return dates;
  }

  function isBooked(year, month, day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookedDates.has(dateStr);
  }

  function isPast(year, month, day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
  }

  function renderMonth(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = '<div class="calendar-month">';
    html += '<div class="calendar-month__header">';
    html += '<h3 style="font-size: var(--text-xl);">' + MONTHS[month] + ' ' + year + '</h3>';
    html += '</div>';
    html += '<div class="calendar-grid-view">';

    DAYS.forEach(function(d) {
      html += '<div class="calendar-day calendar-day--header">' + d + '</div>';
    });

    for (var i = 0; i < startDay; i++) {
      html += '<div class="calendar-day"></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var past = isPast(year, month, day);
      var booked = isBooked(year, month, day);
      var cls = 'calendar-day--available';
      if (past || booked) cls = 'calendar-day--booked';
      html += '<div class="calendar-day ' + cls + '">' + day + '</div>';
    }

    html += '</div></div>';
    return html;
  }

  function render() {
    var html = '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-xl);">';
    html += '<button id="cal-prev" class="btn btn--secondary" style="padding: 0.5rem 1rem;">&larr; Previous</button>';
    html += '<button id="cal-next" class="btn btn--secondary" style="padding: 0.5rem 1rem;">Next &rarr;</button>';
    html += '</div>';

    html += renderMonth(currentYear, currentMonth);

    var nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    var nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    html += renderMonth(nextYear, nextMonth);

    container.innerHTML = html;

    document.getElementById('cal-prev').addEventListener('click', function() {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render();
    });
    document.getElementById('cal-next').addEventListener('click', function() {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render();
    });
  }

  function tryFetch(proxyIndex) {
    if (proxyIndex >= PROXIES.length) {
      container.innerHTML = '<p style="text-align: center; color: var(--color-text-light); padding: var(--space-3xl);">' +
        'Calendar temporarily unavailable. Please <a href="/en/contact.html">contact us</a> to check availability.</p>';
      return;
    }

    var proxyUrl = PROXIES[proxyIndex](ICAL_URL);

    fetch(proxyUrl)
      .then(function(res) {
        if (!res.ok) throw new Error('Failed');
        return res.text();
      })
      .then(function(icsText) {
        if (!icsText.includes('VCALENDAR')) throw new Error('Invalid');
        bookedDates = parseIcal(icsText);
        render();
      })
      .catch(function() {
        tryFetch(proxyIndex + 1);
      });
  }

  tryFetch(0);
});
