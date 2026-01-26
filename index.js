import { Client } from 'discord.js-selfbot-v13';
import fetch from 'node-fetch';
import fetchRetry from 'fetch-retry'; //= require('fetch-retry')(fetch);
import config from './config.json' with { type: 'json' };

const fetches = fetchRetry(fetch, {
  retries: process.env.FETCH_RETRIES || 5,
  retryDelay: process.env.FETCH_RETRY_DELAY || 800,
});

const WATCHER_USER_TOKEN = process.env.WATCHER_USER_TOKEN || config.watcherUserToken;
const DEFAULT_WEBHOOK = process.env.DEFAULT_WEBHOOK || config.defaultWebhook;

const ROLE_REGEX = new RegExp('<@&\\d+>', 'i'); // Used to check for the presence of a Role

// Build a config map with channelId as key and prepare regex
const CONFIG_MAP = config.channels.reduce((memo, conf) => {
  const { _comment, watchChannelIds, useRolesAsKeywords, ...remainingConf } = conf;
  remainingConf.roles ||= {};
  remainingConf.keywords ||= [];
  remainingConf.authors ||= [];
  remainingConf.pingAuthorId ||= false;
  remainingConf.msgFormat ||= 'full';
  if (useRolesAsKeywords) {
    remainingConf.keywords = remainingConf.keywords.concat(Object.values(remainingConf.roles));
  }
  const matchRegex = Object.keys(remainingConf.roles).concat(remainingConf.keywords).join( '|' ) ||
                     '$-'; // Impossible regex that won't ever match; for when no role and keyword
  remainingConf.matchRegex = new RegExp(matchRegex, 'i');
  // Wrapping watchChannelIds in case a single id was given; assigning conf to each id
  [].concat(watchChannelIds).forEach((watchChannelId) => memo[watchChannelId] = remainingConf);
  return memo;
}, {});

const WATCHED_CHANNEL_IDS = Object.keys(CONFIG_MAP);

const client = new Client();

client.on('ready', async () => {
  log(`${client.user.username} is watching channels [${WATCHED_CHANNEL_IDS}]`)
});

client.on('messageCreate', async (message) => {
  if (messageMatches(message)) {
    return sendWebhook(message);
  }
});

client.login(WATCHER_USER_TOKEN);

function log(msg) {
  const date = new Date().toLocaleString('sv', { timeZoneName: 'short' }); // cheat for ISO string in timezone
  console.log(`${date}: ${msg}`) 
}

function messageMatches({ channelId, author, content, embeds }) {
  return WATCHED_CHANNEL_IDS.includes(channelId) && (
    CONFIG_MAP[channelId].authors.includes(author.id) ||
    CONFIG_MAP[channelId].matchRegex.test(content) ||
    embeds.some((embed) => {
      return [embed.title, embed.description, embed.author?.name, embed.footer?.text]
        .concat(embed.fields.flatMap(field => [field.value, field.name]))
        .filter(n => n) // compact - remove nils
        .some((text) => CONFIG_MAP[channelId].matchRegex.test(text));
    })
  );
}

async function sendWebhook(message) {
  const params = buildMessageParams(message);
  fetches(CONFIG_MAP[message.channelId]?.webhookUrl || DEFAULT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(params)
  }).then(response => {
    if (response.ok) { // response.status >= 200 && response.status < 300
      log(`Sent: ${JSON.stringify(params)}`);
    } else {
      log(`Failure: ${response.status}`);
      console.dir(response, { depth: 4 });
      console.dir(message, { depth: 4 });
      console.dir(params, { depth: 4 });
    }
    return response;
  });
}

function buildMessageParams(message) {
  const conf = CONFIG_MAP[message.channelId];
  const author = conf.pingAuthorId ?
    `<@${message.author?.id}>` :
    `**@${message.author?.globalName || message.author?.username}**`;
  const msgLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
  const lineHeader = conf.msgFormat == 'full' ? `${author} in ${msgLink}\n` : '';
  const lineEnd = {
    'full': '',
    'short': ` - [${author}](${msgLink})`,
    'link': ` ${msgLink}`,
    'link-tiny': ` [:link:](${msgLink})`,
    'none': '',
  }[conf.msgFormat] ?? ''; // default
  const images = []; // prepare images as embeds
  message.attachments.values().forEach((attachment) => {
    images.push({ image: { url: attachment.url } });
  });
  return {
    content: `${lineHeader}${replaceRoles(message.content, message.channelId)}${lineEnd}`,
    embeds: message.embeds.map((embed) => {
      if (typeof embed.title === 'string')
        embed.title = replaceRoles(embed.title, message.channelId);
      if (typeof embed.description === 'string')
        embed.description = replaceRoles(embed.description, message.channelId);
      if (typeof embed.author?.name === 'string')
        embed.author.name = replaceRoles(embed.author.name, message.channelId, false);
      if (typeof embed.footer?.text === 'string')
        embed.footer.text = replaceRoles(embed.footer.text, message.channelId, false);
      embed.fields.forEach(field => {
        if (typeof field.name === 'string')
          field.name = replaceRoles(field.name, message.channelId);
        if (typeof field.value === 'string')
          field.value = replaceRoles(field.value, message.channelId);
      });
      return embed;
    }).concat(images),
  };
}

function replaceRoles(string, channelId, bold = true) {
  if (!ROLE_REGEX.test(string)) {
    return string; // exit early if string doesn't contain a role reference
  }
  const bolding = bold ? '**' : '';
  let res = string;
  for (const [key, value] of Object.entries(CONFIG_MAP[channelId]?.roles || [])) {
    res = res.replaceAll(`<@&${key}>`, `${bolding}@${value}${bolding}`);
  }
  return res;
};
