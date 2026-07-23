import 'common/dbmon.css';
import './layout.css';
import { helpers } from 'common';

const test = helpers.dbMonWithChat();

const layout = document.createElement('div');

layout.className = 'layout';
layout.innerHTML = `
  <table>
    <thead>
      <tr>
        <th>dbname</th>
        <th>queries</th>
        <th colspan="5">elapsed times</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>

  <div class="chats">
    <div class="messages">
      <div class="messages-inner"></div>
    </div>
    <div class="entry">
      <textarea placeholder="send a message"></textarea>
    </div>
  </div>
`;
document.querySelector('#app').replaceChildren(layout);

const tbody = layout.querySelector('tbody');
const messagesInner = layout.querySelector('.messages-inner');

/** @type {Map<string, ReturnType<typeof createRow>>} dbname -> live nodes */
const rows = new Map();

function createRow(dbname) {
  const tr = document.createElement('tr');
  const name = document.createElement('td');

  name.className = 'dbname';
  name.textContent = dbname;

  const countCell = document.createElement('td');
  const count = document.createElement('span');

  countCell.className = 'query-count';
  countCell.append(count);
  tr.append(name, countCell);

  const queries = [];

  for (let i = 0; i < 5; i++) {
    const td = document.createElement('td');
    const elapsed = document.createTextNode('');
    const popover = document.createElement('div');
    const content = document.createElement('div');
    const arrow = document.createElement('div');

    popover.className = 'popover bottom';
    content.className = 'popover-content';
    arrow.className = 'arrow';

    popover.append(content, arrow);
    td.append(elapsed, popover);
    tr.append(td);
    queries.push({ elapsed, content });
  }

  tbody.append(tr);

  return { count, queries };
}

function setText(node, text) {
  if (node.textContent !== text) {
    node.textContent = text;
  }
}

test.doit({
  handleDbUpdate: (eventData) => {
    for (const db of eventData.data) {
      let row = rows.get(db.dbname);

      if (!row) {
        row = createRow(db.dbname);
        rows.set(db.dbname, row);
      }

      setText(row.count, String(db.lastSample.queries.length));

      if (row.count.className !== db.lastSample.countClassName) {
        row.count.className = db.lastSample.countClassName;
      }

      db.lastSample.topFiveQueries.forEach((query, i) => {
        setText(row.queries[i].elapsed, String(query.elapsed));
        setText(row.queries[i].content, query.query);
      });
    }
  },
  handleChat: (eventData) => {
    for (const chat of eventData.data) {
      const message = document.createElement('div');
      const author = document.createElement('div');
      const text = document.createElement('p');

      message.className = 'chat';
      author.className = 'author';
      author.textContent = chat.author;
      text.textContent = chat.message;

      message.append(author, text);
      messagesInner.append(message);
    }

    while (messagesInner.children.length > 12) {
      messagesInner.firstElementChild.remove();
    }
  },
});
