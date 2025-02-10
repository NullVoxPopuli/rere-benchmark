import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';
import { TrackedMap } from 'tracked-built-ins';

const test = helpers.tenKitems1UpdateEach();

const initialData = test.getData();

class Test extends Component {
  db = new TrackedMap(test.db);
  // chats = new TrackedWindow();

  start = () => {
    test.run(
      (dbRow, data) => {
        this.db.set(dbRow, data);
      },
      (chat) => {
        chats.push(chat);
      }
    );
  };

  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>
    <table>
      <thead><tr>
        <th>dbname</th>
        <th>queries</th>
        <th colspan="5">elapsed times</th>

      </tr></thead>
      <tbody>
        {{#each this.db as |row|}}
          <tr>
            <td class="dbname">
              {{row.id}}
            </td>
            <td class="query-count">
              <span class="{{row.lastSample.countClassName}}">
                {{row.lastSample.queries.length}}
              </span>
            </td>
            {{#each row.lastSample.topFiveQueries key="@index" as |query|}}
              <td>{{query.elapsed}}</td>
              <div class="popover bottom">
                <div class="popover-content">{{query.query}}</div>
                <div class="arrow"></div>
              </div>
            {{/each}}
          </tr>
        {{/each}}
      </tbody>
    </table>
  </template>
}

export default Route(Test);
