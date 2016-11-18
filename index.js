'use strict';
const alfy = require('alfy');
const rp = require('request-promise');
const Promise = require('bluebird');
const fuzzy = require('fuzzy');
const fs = require('fs');

const home = process.env.HOME || process.env.USERPROFILE;
const configFile = process.argv[3] || `${home}/.slackfred.json`
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

const fuzzy_options = {
  extract: function(e) {
    return e.arg + ' ' + e.subtitle;
  }
};

function fetch(resource) {
  return rp({
    uri: `https://slack.com/api/${resource}.list\?token\=${config.token}`,
    json: true
  }).then(function(data) {
    return data;
  });
}

if(alfy.cache.get('items')) {
  const items = alfy.cache.get('items');
  const filtered_items = fuzzy.filter(alfy.input, items, fuzzy_options);
  alfy.output(filtered_items.map(x => x.original));
} else {
  Promise.props({
    users: fetch('users'),
    groups: fetch('groups'),
    channels: fetch('channels')
  }).then(function(result) {
    const group_items = result.groups.groups
      .filter(function(item) {
        return !item.is_mpim
      })
      .map(x => ({
        title: x.name,
        subtitle: 'Gruppe',
        arg: x.name
      }));

    const user_items = result.users.members.map(x => ({
      title: x.name,
      subtitle: x.real_name,
      arg: x.name
    }));

    const channel_items = result.channels.channels
      .filter(function(item) {
        return item.is_member
      })
      .map(x => ({
        title: x.name,
        subtitle: 'Channel',
        arg: x.name
      }));

    const items = user_items.concat(group_items).concat(channel_items);
    items.push({
      title: 'Unread',
      subtitle: 'Unread messages',
      arg: 'unread'
    });

    alfy.cache.set('items', items);

    const filtered_items = fuzzy.filter(alfy.input, items, fuzzy_options);
    alfy.output(filtered_items.map(x => x.original));
  });
}
