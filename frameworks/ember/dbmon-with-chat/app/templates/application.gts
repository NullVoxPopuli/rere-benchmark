import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';
import { TrackedMap } from 'tracked-built-ins';

const test = helpers.dbMonWithChat();

const initialData = test.getData();

console.log(initialData);
const initialMap = new TrackedMap();

initialData.db.forEach((d) => initialMap.set(d.dbname, d));

class Test extends Component {
  db = initialMap;
  // chats = new TrackedWindow();

  start = () => {
    test.run(
      (dbRow, data) => {
        console.log(dbRow);
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
        {{#each-in this.db as |id row|}}
          <tr>
            <td class="dbname">
              {{id}}
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
        {{/each-in}}
      </tbody>
    </table>
    {{(this.start)}}
    <style>

.table > thead > tr > th,.table > tbody > tr > th,.table > tfoot > tr > th,.table > thead > tr > td,.table > tbody > tr > td,.table > tfoot > tr > td {border-top:1px solid #ddd;line-height:1.42857143;padding:8px;vertical-align:top;}
.table {width:100%;}
.table-striped > tbody > tr:nth-child(odd) > td,.table-striped > tbody > tr:nth-child(odd) > th {background:#f9f9f9;}

.label {border-radius:.25em;color:#fff;display:inline;font-size:75%;font-weight:700;line-height:1;padding:.2em .6em .3em;text-align:center;vertical-align:baseline;white-space:nowrap;}
.label-success {background-color:#5cb85c;}
.label-warning {background-color:#f0ad4e;}

.popover {background-color:#fff;background-clip:padding-box;border:1px solid #ccc;border:1px solid rgba(0,0,0,.2);border-radius:6px;box-shadow:0 5px 10px rgba(0,0,0,.2);display:none;left:0;max-width:276px;padding:1px;position:absolute;text-align:left;top:0;white-space:normal;z-index:1010;}
.popover>.arrow:after {border-width:10px;content:"";}
.popover.left {margin-left:-10px;}
.popover.left > .arrow {border-right-width:0;border-left-color:rgba(0,0,0,.25);margin-top:-11px;right:-11px;top:50%;}
.popover.left > .arrow:after {border-left-color:#fff;border-right-width:0;bottom:-10px;content:" ";right:1px;}
.popover > .arrow {border-width:11px;}
.popover > .arrow,.popover>.arrow:after {border-color:transparent;border-style:solid;display:block;height:0;position:absolute;width:0;}

.popover-content {padding:9px 14px;}

.Query {position:relative;}
.Query:hover .popover {display:block;left:-100%;width:100%;}
    </style>
  </template>
}

export default Route(Test);
